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
        console.log("1.全件検索----------開始");
        geoJson.find({}).toArray((err, docs) => {
            console.log("1.全件検索==========終了");
            console.log(docs);
        });
        console.log("2.一致検索----------開始");
        geoJson.find({ "endpoints": "首都大学東京" }).toArray((err, docs) => {
            console.log("2.一致検索==========終了");
            console.log(docs);
        });
        console.log("3.地理空間検索-------開始");
        geoJson.find({
            line: {
                $geoIntersects: {
                    $geometry: {
                        "type": "LineString",
                        "coordinates": [
                            [137.715474, 34.7247871],
                            [138.9403503, 37.86701]
                        ]
                    }
                }
            }
        }).toArray((err, docs) => {
            console.log("3.地理空間検索=======終了");
            console.log(docs);
        });
    }
});