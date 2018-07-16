const fs = require('fs');
fs.readFile('package.json', 'utf8', (err, data) => {
    console.log(data);
});
console.log('プログラムの終わりに来ました');