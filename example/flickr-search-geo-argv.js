const Flickr = require('flickr-sdk'),
    mongoClient = require('mongodb').MongoClient,
    async = require('async'),
    apikeys = require(__dirname + '/sns-api-keys.json');
const flickr = new Flickr(apikeys.flickr.consumer_key);

var pap = require("posix-argv-parser");
var args = pap.create();
var v = pap.validators;
args.createOption(["-y", "--latitude"], {
    defaultValue: .0,
    validators: [v.number("Error: ${1} must be a Float.")],
    transform: (value) => { return parseFloat(value); }
});
args.createOption(["-x", "--longitude"], {
    defaultValue: .0,
    validators: [v.number("Error: ${1} must be a Float.")],
    transform: (value) => { return parseFloat(value); }
});
args.createOption(["-r", "--radius"], {
    defaultValue: 0,
    validators: [v.integer("Error: ${1} must be a Integer.")],
    transform: (value) => { return parseInt(value, 10); }
});
args.createOption(["-q", "--query"], {
    defaultValue: "",
});

async.waterfall([
    (callback) => {
        args.parse(process.argv.slice(2), (err, options) => {
            const opt = {
                url: 'mongodb://localhost:27017',
                dbName: 'sobig',
                colName: 'flickr'
            };
            if (options["--query"].value != "") {
                opt.query = options["--query"].value
            }
            if (options["--radius"].value !== 0) {
                opt.lat = options["--latitude"].value;
                opt.lon = options["--longitude"].value;
                opt.radius = options["--radius"].value;
            }
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
        //データ削除(もしコレクションが空でなければ)
        col.count({}, {}, (error, result) => {
            if (error) {
                callback(error, opt, col);
            } else {
                if (result > 0) {
                    col.dropIndexes().then(() => {
                        col.remove({}, { 'w': 1 }).then(() => {
                            callback(error, opt, col);
                        }).catch((error) => {
                            callback(error, opt, col);
                        });
                    }).catch((error) => {
                        callback(error, opt, col);
                    });
                } else {
                    callback(error, opt, col);
                }
            }
        });
    },
    (opt, col, callback) => {
        //コレクションの再構築
        col.createIndexes([
            { key: { id: 1 }, unique: true },
            { key: { geotag: "2dsphere" } },
            { key: { dateupload: 1 } },
            { key: { datetaken: 1 } }
        ], {}, (error) => {
            callback(error, opt, col);
        })
    },
    (opt, col, callback) => {
        //結果をデータベースに格納する
        let nn = 0;
        const insertDB = function(photos, fin) {
            let n = 0,
                dup = 0;
            async.each(photos, (photo, finPhoto) => {
                if (photo.exif && photo.exif.ExposureTime && photo.exif.FNumber) {
                    //重要な項目のみ抜粋とExifの変形
                    const exif = require('./util/util.js').exif;　 /* 簡易的にExif情報を使いやすく変形 */
                    const item = {
                        dateupload: new Date(photo.dateupload * 1000),
                        datetaken: new Date(photo.datetaken * 1000),
                        id: photo.id,
                        owner: photo.owner,
                        tags: photo.tags == "" ? [] : photo.tags.split(' '),
                        exif: exif(photo.exif),
                        url: photo.url_m,
                        geotag: null
                    };
                    //もしジオタグが付いていれば・・・
                    if (photo.longitude == 0 && photo.latitude == 0 && photo.latitude == 0) {
                        item.geotag = {
                            "type": "Point",
                            "coordinates": [
                                parseFloat(photo.longitude),
                                parseFloat(photo.latitude)
                            ]
                        };
                    }
                    col.insertOne(item, { w: 1 }).then(() => {
                        n++;
                        finPhoto(null);
                    }).catch((error) => {
                        //console.log("ERROR:", error.message);
                        dup++;
                        finPhoto(null);
                    });
                } else {
                    finPhoto(null);
                }
            }, (error) => {
                if (error) {
                    console.log('失敗(Insert)', photo.dateupload, error);
                } else {
                    nn += n;
                    console.log("\t" + dup + '件の重複除去');
                    console.log("\t" + n + '件挿入　(全' + nn + '件)');
                }
                fin(error);
            });
        }

        //Flickrに問い合わせを行う
        const per_page = 250; /* リクエストあたりの写真取得数 */
        const queryFlickr = function(q, lat, lon, radius, fin) {
            let maxDate = Math.floor((new Date()).getTime() / 1000);
            let isLast = false;
            let qOpt = {
                max_upload_date: maxDate,
                per_page: per_page
            };
            if (radius == 0) {
                qOpt.has_geo = 1;
                qOpt.lat = lat;
                qOpt.lon = lon;
                qOpt.extras = 'geo,' + qOpt.extras;
            }
            if (q != '') {
                qOpt.text = q;
            }
            async.doWhilst(
                (nextQuery) => {
                    console.log("[Q]", new Date(maxDate * 1000).toISOString());
                    flickr.photos.search(qOpt).then((resSearch) => {
                        let photos = resSearch.body.photos;
                        console.log("Length:" + photos.photo.length, "Perpage:" + photos.perpage, "Pages:" + photos.pages, "Page:" + photos.page);
                        isLast = photos.pages == photos.page;
                        async.mapLimit(photos.photo, 6, (photo, finPhoto) => {
                            photo.dateupload = parseInt(photo.dateupload);
                            photo.datetaken = Math.round(new Date(photo.datetaken) / 1000);
                            maxDate = Math.min(maxDate, photo.dateupload);
                            maxDate--; //厳密に言えば同じ時刻にアップロードされた写真が250枚以上ある時はこの方法では取り逃しが生じる
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
                                //console.log("[SKIP]: ", photo.id, "(No Exif)");
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
                    return !isLast;
                },
                (err) => {
                    fin(err);
                }
            );
        }
        queryFlickr(opt.q, opt.lat, opt.lon, opt.radius, callback);
    }
], (error) => {
    if (error) {
        console.log("失敗", error);
    } else {
        console.log("終了");
    }
    process.exit(0);
});