const http = require('http'),
    ws = require('ws'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    mongoClient = require('mongodb').MongoClient,
    PythonShell = require('python-shell');

const pythonCmd = 'python3.6';

const values = {
    'html': path.join(__dirname, 'sobig-client.html'),
    'js': {
        '/palette.js': 'util/palette.js/palette.js',
        '/leaflet-heat.js': 'util/heatmap/dist/leaflet-heat.js'
    },
    'http': 8080,
    'websocket': 8081,
    'mongodb': {
        url: 'mongodb://localhost:27017',
        db: 'sobig',
        collection: { 'Flickr': 'flickr', 'Twitter': 'twitter' },
    },
    'algoJS': path.join(__dirname, 'algorithms'),
    'algoPY': path.join(__dirname, 'algorithms')
};
let algorithms = {};

async.mapValues(values,
    (val, key, callback) => {
        switch (key) {
            case 'html':
                fs.readFile(val, 'binary', callback);
                break;
            case 'js':
                callback(null, val);
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
                let collections = {};
                mongoClient.connect(val.url, (err, connection) => {
                    if (!err) {
                        const db = connection.db(val.db);
                        collection: Object.keys(val.collection).forEach((key) => {
                            collections[key] = db.collection(val.collection[key]);
                        });
                    }
                    callback(err, collections);
                });
                break;
            case 'algoJS':
                let algoJS = {};
                fs.readdir(val, (err, files) => {
                    if (!err) {
                        files.filter((file) => {
                            file = path.join(val, file);
                            return fs.statSync(file).isFile() && /.*\.js$/.test(file);
                        }).forEach((file) => {
                            file = path.join(val, file);
                            console.log('read JS module:' + file);
                            algoJS[path.parse(file).base] = require(file);
                        });
                    }
                    callback(err, algoJS);
                });
                break;
            case 'algoPY':
                let algoPY = {};
                fs.readdir(val, (err, files) => {
                    if (!err) {
                        files.filter((file) => {
                            file = path.join(val, file);
                            return fs.statSync(file).isFile() && /.*\.py$/.test(file);
                        }).forEach((file) => {
                            file = path.join(val, file);
                            console.log('read PY module:' + file);
                            algoPY[path.parse(file).base] = (q, opt, docs, callback) => {
                                console.log("FILE:", file);
                                let output = "";
                                let pyshell = new PythonShell(file, { pythonPath: pythonCmd, scriptPath: '/' });
                                pyshell.send(JSON.stringify({ 'q': q, 'opt': opt, 'docs': docs }));
                                pyshell.on('message', (message) => {
                                    // received a message sent from the Python script (a simple "print" statement)
                                    output += message;
                                });
                                pyshell.on('error', (err) => {
                                    throw err
                                });
                                pyshell.end((err, code, signal) => {
                                    // received a message sent from the Python script (a simple "print" statement)
                                    let rtn = JSON.parse(output);
                                    callback(err, rtn);
                                });
                            }
                        });
                    }
                    callback(err, algoPY);
                });
                break;
            default:
                callback('selector error');
        }
    },
    (err, $) => {
        if (err) {
            throw new Error('初期化エラー' + JSON.stringify(err));
        }
        algorithms = Object.assign({}, $['algoJS'], $['algoPY']);
        $['http'].on('request', (request, response) => {
            console.log(request.url);
            if (request.url.endsWith('.js') && $['js'][request.url]) {
                let header = {
                    'Content-Type': 'text/javascript',
                    'Access-Control-Allow-Origin': '*',
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
                fs.readFile($['js'][request.url], 'binary', (err, body) => {
                    if (err) {
                        console.log(err);
                        response.writeHead(400, { 'Content-Type': 'text/plain' });
                        response.end();
                    } else {
                        console.log("[LOAD]", $['js'][request.url]);
                        response.writeHead(200, header);
                        response.write(body, 'binary');
                        response.end();
                    }
                });
            } else if (request.url == "/") {
                let header = {
                    'Content-Type': 'text/html',
                    'Access-Control-Allow-Origin': '*',
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
                response.writeHead(200, header);
                response.write($['html'], 'binary');
                response.end();
            } else {
                response.writeHead(404, { 'Content-Type': 'text/plain' });
                response.end();
            }
        });

        $['websocket'].on('connection', (client) => {
            client.send(JSON.stringify({
                'type': 'capabilities',
                'algorithm': Object.keys($['algoJS']).concat(Object.keys($['algoPY'])),
                'dataset': Object.keys($['mongodb'])
            }));
            client.on('message', (envelope) => {
                envelope = JSON.parse(envelope);

                envelope.time = Date.now();
                console.log('query: ', envelope);
                async.waterfall([
                    (callback) => {
                        //Check Input Val
                        if (!$['mongodb'].hasOwnProperty(envelope.dataset)) {
                            callback('Dataset Not Found', envelope.dataset);
                            return;
                        }
                        if (!$['algoJS'].hasOwnProperty(envelope.algorithm) && !$['algoPY'].hasOwnProperty(envelope.algorithm)) {
                            callback('Algorithm Not Found:', envelope.algorithm);
                            return;
                        }
                        let bbox = null;
                        if (envelope.bbox != '') {
                            bbox = envelope.bbox.split(',').map((v) => { return parseFloat(v) });
                        }
                        /*if (bbox.length != 4) {
                            callback('Invalid BBOX:', envelope.bbox);
                            return;
                        }*/
                        let query = { 'bbox': bbox };
                        if (envelope.q == '') {
                            //nothing to do
                        } else {
                            query['q'] = envelope.q;
                        }
                        let opt = {};
                        if (envelope.opt == '') {
                            //nothing to do
                        } else {
                            opt = JSON.parse(envelope.opt);
                        }
                        callback(null, $['mongodb'][envelope.dataset], algorithms[envelope.algorithm], query, opt);
                    },
                    (collection, algorithm, query, opt, callback) => {
                        let cond = [];
                        if (query.bbox != null) {
                            cond.push({
                                "geotag": {
                                    $geoWithin: {
                                        $geometry: {
                                            "type": "Polygon",
                                            "coordinates": [
                                                [
                                                    [query.bbox[0], query.bbox[1]],
                                                    [query.bbox[0], query.bbox[3]],
                                                    [query.bbox[2], query.bbox[3]],
                                                    [query.bbox[2], query.bbox[1]],
                                                    [query.bbox[0], query.bbox[1]]
                                                ]
                                            ]
                                        }
                                    }
                                }
                            });
                        }
                        if (query.q) {
                            cond.push({ "tags": query.q });
                        }
                        //Search from MongoDB
                        console.log(JSON.stringify(cond));

                        collection.find(cond.length == 0 ? {} : { $and: cond }).toArray((err, docs) => {
                            callback(err, algorithm, query, opt, docs);
                        });
                    },
                    (algorithm, query, opt, docs, callback) => {
                        //Do Something
                        console.log(docs.length + " documents are founded.");
                        algorithm(query, opt, docs, callback);
                    }
                ], (err, result) => {
                    //Send Results
                    console.log('done: %s', err);
                    client.send(JSON.stringify(result));
                });
            });
        });
    }
);