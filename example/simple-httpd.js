const http = require('http'),
    fs = require('fs'),
    path = require('path'),
    filename = path.join(__dirname, 'simple.html');

fs.readFile(filename, 'binary', (err, filecontent) => {
    http.createServer((request, response) => {
        if (err) {
            response.writeHead(404, { 'Content-Type': 'text/plain' });
            response.write("404 Not Found\n");
            response.end();
        } else {
            const header = {
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