const Flickr = require('flickr-sdk'),
    mongoClient = require('mongodb').MongoClient,
    async = require('async'),
    apikeys = require(__dirname + '/sns-api-keys.json');
const flickr = new Flickr(apikeys.flickr.consumer_key);

var pap = require("posix-argv-parser");
var args = pap.create();
var v = pap.validators;
args.createOption(["-y", "--latitude"], {
    defaultValue: 35.659043874914,
    validators: [v.number("Custom message. ${1} must be a Float.")],
    transform: (value) => { return parseFloat(value); }
});
args.createOption(["-x", "--longitude"], {
    defaultValue: 139.70059168537,
    validators: [v.number("Custom message. ${1} must be a Float.")],
    transform: (value) => { return parseFloat(value); }
});
args.createOption(["-r", "--radius"], {
    defaultValue: 5,
    validators: [v.integer("Custom message. ${1} must be a Integer.")],
    transform: (value) => { return parseInt(value, 10); }
});

async.waterfall([
    (callback) => {
        args.parse(process.argv.slice(2), (err, options) => {
            const opt = {
                url: 'mongodb://localhost:27017',
                dbName: 'sobig',
                colName: 'flickr',
                lat: options["--latitude"].value,
                lon: options["--longitude"].value,
                radius: options["--radius"].value
            };
            console.log('ARGV', options["--latitude"].value,
                options["--longitude"].value, options["--radius"].value);
            callback(err, opt);
        });
    },
    (opt, callback) => {
        //接続処理
        mongoClient.connect(opt.url, (err, client) => {
            callback(err, opt, client)
        });
    },
    (opt, client, callback) => {
        //接続後の処理
        process.on('exit', () => {
            console.log('データベースの接続を切断して終了します。');
            client.close();
        });
        process.on('SIGINT', () => {
            console.log('SIGINTを受け取りました。');
            process.exit(0);
        });
        const db = client.db(opt.dbName),
            col = db.collection(opt.colName);
        callback(null, opt, col);
    },
    (opt, col, callback) => {
        //コレクションの再構築
        col.dropIndexes().then(() => {
            col.remove({}, { 'w': 1 }).then(() => {
                col.createIndexes([
                    { key: { id: 1 }, unique: true },
                    { key: { coordinates: "2dsphere" } },
                    { key: { dateupload: 1 } },
                    { key: { datetaken: 1 } }
                ], {}, (error) => {
                    callback(error, opt, col);
                })
            }).catch((error) => {
                callback(error, opt, col);
            });
        }).catch((error) => {
            callback(error, opt, col);
        });
    },
    (opt, col, callback) => {
        //結果をデータベースに格納する
        const insertDB = function(photos, fin) {
            let n = 0;
            async.each(photos, (photo, finPhoto) => {
                if (photo.exif && photo.exif.ExposureTime && photo.exif.FNumber) {
                    //重要な項目のみ抜粋とExifの変形
                    const exif = require('./util/util.js').exif;　 /* 簡易的にExif情報を使いやすく変形 */
                    const item = {
                        dateupload: new Date(photo.dateupload),
                        datetaken: new Date(photo.datetaken),
                        id: photo.id,
                        owner: photo.owner,
                        tags: photo.tags == "" ? [] : photo.tags.split(' '),
                        exif: exif(photo.exif),
                        url: photo.url_m,
                        coordinates: {
                            "type": "Point",
                            "coordinates": [
                                parseFloat(photo.longitude),
                                parseFloat(photo.latitude)
                            ]
                        }
                    };
                    col.insertOne(item, { w: 1 }).then(() => {
                        n++;
                        finPhoto(null);
                    }).catch((error) => {
                        console.log("ERROR:", error.message);
                        finPhoto(null);
                    });
                } else {
                    finPhoto(null);
                }
            }, (error) => {
                if (error) {
                    console.log('失敗(Insert)', photo.dateupload, error);
                } else {
                    console.log("\t" + n + '件挿入');
                }
                fin(error);
            });
        }

        //Flickrに問い合わせを行う
        const per_page = 250; /* リクエストあたりの写真取得数 */
        const queryFlickr = function(lat, lon, radius, fin) {
            let maxDate = Math.floor((new Date()).getTime() / 1000);
            let lastNoP = per_page;
            async.doWhilst(
                (nextQuery) => {
                    console.log("[Q]", maxDate);
                    flickr.photos.search({
                        lat: lat,
                        lon: lon,
                        radius: radius,
                        max_upload_date: maxDate,
                        sort: 'date-posted-desc',
                        extras: 'date_upload,date_taken,tags,url_m,geo',
                        per_page: per_page
                    }).then((resSearch) => {
                        let photos = resSearch.body.photos;
                        lastNoP = photos.photo.length;
                        async.mapLimit(photos.photo, 6, (photo, finPhoto) => {
                            maxDate = Math.min(maxDate, parseInt(photo.dateupload));
                            flickr.photos.getExif({
                                photo_id: photo.id
                            }).then((resExif) => {
                                photo.camera = resExif.body.photo.camera;
                                photo.exif = {};
                                resExif.body.photo.exif.forEach((item) => {
                                    photo.exif[item.tag] = item.raw._content;
                                });
                                finPhoto(null, photo);
                            }).catch((error) => {
                                console.log("[SKIP]: ", photo.id, "(No Exif)");
                                finPhoto(null, photo);
                            });
                        }, (error, photosWithEXIF) => {
                            console.log("", photosWithEXIF.length + '件取得')
                            insertDB(photosWithEXIF, nextQuery);
                        });
                    }).catch((error) => {
                        throw error;
                    });
                },
                () => {
                    console.log(lastNoP);
                    return lastNoP == per_page;
                },
                (err) => {
                    fin(err);
                }
            );
        }
        queryFlickr(opt.lat, opt.lon, opt.radius, callback);
    }
], (error) => {
    if (error) {
        console.log("失敗", error);
    } else {
        console.log("終了");
    }
    process.exit(0);
});