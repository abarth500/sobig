var http = require("http");

http.createServer(function(request, response) {
    response.writeHead(200, {
        "Content-Type": "text/html"
    });
    var r = `<!doctype html>
<html lang="ja">
  <head></head>
  <body>Hello Node.js World!</body>
</html>`;
    response.write(r);
    response.end();
}).listen(8080);