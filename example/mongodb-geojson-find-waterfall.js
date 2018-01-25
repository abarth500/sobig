const mongoClient = require('mongodb').MongoClient,
    async = require('async');

const url = 'mongodb://localhost:27017',
    dbName = 'sobig';

async.waterfall([
    (callback) => {
        //接続処理
        mongoClient.connect(url, callback);
    },
    (client, callback) => {
        //接続後の処理
        process.on('SIGINT', () => {
            console.log('切断して終了します。');
            client.close();
        });
        const db = client.db(dbName),
            geoJson = db.collection('geoJson');
        callback(false, geoJson);
    },
    (geoJson, callback) => {
        console.log("1.全件検索----------開始");
        geoJson.find({}).toArray((err, docs) => {
            console.log("1.全件検索==========終了");
            console.log(docs);
            callback(err, geoJson, docs.length);
        });
    },
    (geoJson, result1, callback) => {
        console.log("2.一致検索----------開始");
        geoJson.find({ "endpoints": "首都大学東京" }).toArray((err, docs) => {
            console.log("2.一致検索==========終了");
            console.log(docs);
            callback(err, geoJson, result1, docs.length);
        });
    },
    (geoJson, result1, result2, callback) => {
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
            callback(err, geoJson, result1, result2, docs.length);
        });
    },
], (err, geoJson, result1, result2, result3) => {
    if (err) {
        console.log("失敗");
    } else {
        console.log("終了");
        console.log("結果件数：", result1 + '件', result2 + '件', result3 + '件');
    }
});