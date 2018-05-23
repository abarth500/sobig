const http = require('http'),
    ws = require('ws'),
    fs = require('fs'),
    path = require('path');

const filename = path.join(__dirname, 'websocket-chat-client-kai.html');
const wss = new ws.Server({ port: 8081 });
wss.on('connection', function(client) {
    client.on('message', function(message) {
        console.log('received: %s', message);
        wss.clients.forEach(function each(_client) {
            if (_client.readyState === ws.OPEN) {
                _client.send(message);
            }
        });
    });
    client.send(JSON.stringify({
        "name": "チャットサーバ",
        "message": "Hello From WebSocket Chat Server!"
    }));
});

fs.readFile(filename, 'binary', function(err, filecontent) {
    http.createServer(function(request, response) {
        if (err) {
            response.writeHead(404, { 'Content-Type': 'text/plain' });
            response.write("404 Not Found\n");
            response.end();
        } else {
            let header = {
                'Content-Type': 'text/html',
                'Access-Control-Allow-Origin': '*',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache'
            }
            response.writeHead(200, header);
            response.write(filecontent, 'binary');
            response.end();
        }
    }).listen(8080);
});