const Twitter = require('twitter'),
    mongoClient = require('mongodb').MongoClient,
    async = require('async'),
    apikeys = require(__dirname + '/sns-api-keys.json');
const client = new Twitter(apikeys.twitter);

const pap = require("posix-argv-parser");
const args = pap.create();
const v = pap.validators;
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
args.createOption(["-l", "--lang"], {
    defaultValue: "en",
});

async.waterfall([
    (callback) => {
        args.parse(process.argv.slice(2), (err, options) => {
            const opt = {
                url: 'mongodb://localhost:27017',
                dbName: 'sobig',
                colName: 'twitter',
                query: options["--query"].value,
                language: options["--lang"].value
            };
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
            { key: { date: 1 } },
        ], {}, (error) => {
            callback(error, opt, col);
        })
    },
    (opt, col, callback) => {
        //結果をデータベースに格納する
        let nn = 0;
        const insertDB = (tweets, fin) => {
                //console.log(tweets);
                let n = 0,
                    dup = 0;
                async.eachSeries(tweets.statuses, (status, finStatus) => {
                    //重要な項目のみ抜粋
                    const item = {
                        date: new Date(status.created_at),
                        id: status.id_str,
                        owner: status.user.id_str,
                        tweet: status.text,
                        tags: [],
                        geotag: status.coordinates,
                        place: (status.place != null ? {
                            id: status.place.id,
                            full_name: status.place.full_name,
                            bounding_box: status.place.bounding_box
                        } : null)
                    };
                    status.entities.hashtags.forEach((tag) => {
                        item.tags.push(tag.text);
                    });
                    col.insertOne(item, { w: 1 }).then(() => {
                        n++;
                        finStatus(null);
                    }).catch((error) => {
                        //console.log("ERROR:", error.message);
                        dup++;
                        finStatus(null);
                    });
                }, (error) => {
                    if (error) {
                        console.log('失敗(Insert)', error);
                    } else {
                        nn += n;
                        console.log("\t" + dup + '件の重複除去');
                        console.log("\t" + n + '件挿入 (全' + nn + '件)');
                    }
                    fin(error);
                });
            }
            //Twitterに問い合わせを行う
        let count = 100; /* リクエストあたりのTweet取得数 */
        const queryTwitter = (q, geo, language, fin) => {
            let lastNoQ = count;
            let qOpt = {
                q: q,
                result_type: 'recent',
                lang: language,
                count: count,
                max_id: '9000000000000000000',
            };
            if (opt.radius) {
                qOpt.geocode = opt.lat + "," + opt.lon + "," + opt.radius + "km";
            }
            //結果が返ってこなくなるまで時間を遡りつつTweet取得
            let tick = Date.now();
            async.doWhilst(
                (nextQuery) => {
                    console.log("[Q]", qOpt.max_id);
                    client.get('search/tweets', qOpt)
                        .then((tweets) => {
                            console.log(tweets.statuses.length + "件取得");
                            lastNoQ = tweets.statuses.length;
                            if (lastNoQ > 0) {
                                //結果は新しい->古い順
                                qOpt.max_id = tweets.statuses[lastNoQ - 1].id_str;
                                let d0 = new Date(tweets.statuses[0].created_at)
                                let d1 = new Date(tweets.statuses[lastNoQ - 1].created_at)
                                    //console.log("\tmax :" + qOpt.max_id)
                                console.log("\tdate :" + d0 + " -> " + d1);
                            }
                            let wait = 5000 - (Date.now() - tick);
                            //console.log("\twait=" + wait);
                            setTimeout(async.apply(insertDB, tweets, (err) => {
                                tick = Date.now();
                                nextQuery(err);
                            }), wait);
                        })
                        .catch((error) => {
                            console.log(error);
                            fin(error);
                        });
                },
                () => {
                    return lastNoQ != 0;
                },
                (err) => {
                    fin(err);
                }
            );
        }
        queryTwitter(opt.query, opt.geocode, opt.language, callback);
    },
], (error) => {
    if (error) {
        console.log("失敗", error);
    } else {
        console.log("成功");
    }
    process.exit(0);
});