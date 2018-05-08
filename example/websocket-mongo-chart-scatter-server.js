const http = require('http'),
    ws = require('ws'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    mongoClient = require('mongodb').MongoClient;

const values = {
    'html': path.join(__dirname, 'websocket-mongo-chart-scatter-client.html'),
    'http': 8080,
    'websocket': 8081,
    'mongodb': {
        url: 'mongodb://localhost:27017',
        db: 'sobig',
        collection: 'flickr',
    }
};

async.mapValues(values,
    (val, key, callback) => {
        switch (key) {
            case 'html':
                fs.readFile(val, 'binary', callback);
                break;
            case 'http':
                let httpd = http.createServer();
                httpd.listen(val);
                callback(null, httpd)
                break;
            case 'websocket':
                const wss = new ws.Server({ port: val });
                callback(null, wss);
                break;
            case 'mongodb':
                mongoClient.connect(val.url, (err, connection) => {
                    const db = connection.db(val.db),
                        collection = db.collection(val.collection);
                    callback(err, collection);
                });
                break;
        }
    },
    (err, $) => {
        if (err) {
            throw new Error('接続初期化エラー' + JSON.stringify(err));
        }
        $['http'].on('request', (request, response) => {
            let header = {
                'Content-Type': 'text/html',
                'Access-Control-Allow-Origin': '*',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache'
            }
            response.writeHead(200, header);
            response.write($['html'], 'binary');
            response.end();
        });

        $['websocket'].on('connection', (client) => {

            client.on('message', (maker) => {
                $['mongodb'].find({"exif.Make":"Canon"}, {
                    projection: {
                        'id': 1,
                        'url': 1,
                        'exif.FNumber': 1,
                        'exif.ExposureTime': 1,
                        'exif.ISO': 1,
                        'exif.Flash': 1
                    }
                }).toArray((err, docs) => {
                    client.send(JSON.stringify(docs));
                    /*
                    async.eachSeries(docs, (doc, fin) => {
                        console.log(doc.exif.ExposureTime + "\t" + doc.exif.FNumber);
                        //async.setImmediate(fin, null);
                        client.send(doc.exif.ExposureTime + "\t" + doc.exif.FNumber, fin);
                    });
                    */
                });
            });
        });
    }
);