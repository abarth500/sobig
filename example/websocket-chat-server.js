const http = require('http'),
    ws = require('ws'),
    fs = require('fs'),
    path = require('path');

const filename = path.join(__dirname, 'websocket-chat-client.html');
const wss = new ws.Server({ port: 8081 });
wss.on('connection', (client) => {
    client.on('message', (message) => {
        console.log('received: %s', message);
        wss.clients.forEach((_client) => {
            if (_client.readyState === ws.OPEN) {
                _client.send(message);
            }
        });
    });
    client.send('Hello From WebSocket Chat Server!');
});

fs.readFile(filename, 'binary', (err, filecontent) => {
    http.createServer((request, response) => {
        if (err) {
            response.writeHead(404, { 'Content-Type': 'text/plain' });
            response.write("404 Not Found\n");
            response.end();
        } else {
            const header = {
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