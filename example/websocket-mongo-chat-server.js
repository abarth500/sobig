const http = require('http'),
    ws = require('ws'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    mongoClient = require('mongodb').MongoClient;

const values = {
    'html': path.join(__dirname, 'websocket-mongo-chat-client.html'),
    'http': 8080,
    'websocket': 8081,
    'mongodb': {
        url: 'mongodb://localhost:27017',
        db: 'sobig',
        collection: 'chat',
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

        $['websocket'].on('connection', function(client) {
            $['mongodb'].find({}).sort({ time: -1 }).limit(5).toArray((err, docs) => {
                async.eachSeries(docs, (doc, fin) => {
                    client.send(JSON.stringify(doc), fin);
                });
            });
            client.on('message', function(message) {
                message = JSON.parse(message);
                message.time = Date.now();
                async.parallel([
                    (callback) => {
                        $['mongodb'].insertOne(message, callback);
                    },
                    (callback) => {
                        async.each($['websocket'].clients,
                            (_client, fin) => {
                                if (_client.readyState === ws.OPEN) {
                                    _client.send(JSON.stringify(message));
                                }
                                fin(null);
                            },
                            callback);
                    },
                ], (err, result) => {
                    console.log('received: %s', JSON.stringify(message));
                });
            });
        });
    }
);