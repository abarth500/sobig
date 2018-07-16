const mongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017',
    dbName = 'sobig';

mongoClient.connect(url, (err, client) => {
    if (!err) {
        process.on('SIGINT', () => {
            console.log('切断して終了します。');
            client.close();
        });
        console.log("MongoDBサーバへ接続しました。");
        const db = client.db(dbName),
            geoJson = db.collection('geoJson');
        geoJson.find({}).toArray((err, docs) => {
            console.log(docs);
        });
    }
});