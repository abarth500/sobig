const Twitter = require('twitter'),
    mongoClient = require('mongodb').MongoClient,
    async = require('async'),
    apikeys = require(__dirname + '/sns-api-keys.json');
const client = new Twitter(apikeys.twitter);

var pap = require("posix-argv-parser");
var args = pap.create();
var v = pap.validators;
args.createOption(["-y", "--latitude"], {
    defaultValue: 35.6590789,
    validators: [v.number("Custom message. ${1} must be a Float.")],
    transform: (value) => { return parseFloat(value); }
});
args.createOption(["-x", "--longitude"], {
    defaultValue: 139.6962405,
    validators: [v.number("Custom message. ${1} must be a Float.")],
    transform: (value) => { return parseFloat(value); }
});
args.createOption(["-r", "--radius"], {
    defaultValue: 5,
    validators: [v.integer("Custom message. ${1} must be a Integer.")],
    transform: (value) => { return parseInt(value, 10); }
});
args.createOption(["-q", "--query"], {
    defaultValue: "渋谷"
});

async.waterfall([
    (callback) => {
        args.parse(process.argv.slice(2), (err, options) => {
            const opt = {
                url: 'mongodb://localhost:27017',
                dbName: 'sobig',
                colName: 'twitter',
                lat: options["--latitude"].value,
                lon: options["--longitude"].value,
                radius: options["--radius"].value,
                q: options["--query"].value
            };
            console.log('ARGV', options["--latitude"].value,
                options["--longitude"].value, options["--radius"].value, options["--query"].value);
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
        callback(false, opt, col);
    },
    (opt, col, callback) => {
        //結果をデータベースに格納する
        const insertDB = function(tweets, fin) {
            async.each(tweets.statuses, (status, finStatus) => {
                //重要な項目のみ抜粋
                const item = {
                    date: new Date(status.created_at),
                    id: status.id_str,
                    owner: status.user.id_str,
                    tweet: status.text,
                    tags: [],
                    coordinates: status.coordinates,
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
                    finStatus(null);
                }).catch((error) => {
                    console.log("ERROR:", error.message);
                    finStatus(null);
                });
            }, (error) => {
                fin(error);
            });
        }

        //Twitterに問い合わせを行う
        let count = 100; /* リクエストあたりのTweet取得数 */
        const queryTwitter = function(fin) {
            let maxID = '50000000000000000000';
            let lastNoQ = count;
            //結果が返ってこなくなるまで時間を遡りつつTweet取得
            async.doWhilst(
                (nextQuery) => {
                    let geo = opt.lat + "," + opt.lon + "," + opt.radius + "km";
                    let q = opt.q;
                    console.log("[Q]", maxID, q, geo);
                    client.get('search/tweets', {
                            geocode: geo,
                            q: q,
                            count: count //,
                                //max_id: maxID
                        })
                        .then((tweets) => {
                            console.log(tweets);
                            console.log(tweets.statuses.length + "件取得");
                            lastNoQ = tweets.statuses.length;
                            if (lastNoQ > 0) {
                                //結果は新しい->古い順
                                maxID = tweets.statuses[lastNoQ - 1].id_str;
                                console.log("\tmax = " + maxID);
                            }
                            insertDB(tweets, nextQuery);
                        })
                        .catch((error) => {
                            console.log(error);
                            fin(error);
                        });
                },
                () => {
                    return lastNoQ == count;
                },
                (err) => {
                    fin(err);
                }
            );
        }
        queryTwitter(callback);
    },
], (error) => {
    if (error) {
        console.log("失敗", error);
    } else {
        console.log("成功");
    }
    process.exit(0);
});