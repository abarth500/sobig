const async = require('async');
module.exports = (q, opt, docs, callback) => {
    opt.top = opt.top ? opt.top : 100;
    let result = {};
    let result2 = [];
    async.each(docs, (p, cbP) => {
        let text;
        if (p.tweet) {
            //Twitter
            text = p.tweet.split(/( |　)+/);
        } else {
            //Flickr
            text = p.tags;
        }
        text.forEach((word) => {
            word = word.replace(/[\,\.]$/, ''); // 末尾のピリオドを削除
            word = word.replace('`', "'"); // アポストロフィを統一
            word = word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
            if (!result[word]) {
                result[word] = {
                    name: word,
                    weight: 0
                };
            }
            result[word].weight++;
        });
        async.setImmediate(cbP, null);
    }, (err) => {
        Object.keys(result).forEach((word) => {
            result2.push(result[word]);
        });
        result2.sort((a, b) => {
            return b.weight - a.weight;
        });
        callback(null, {
            'type': 'wordCloud',
            'result': result2.slice(0, opt.top),
            'q': q,
            'opt': opt
        });
    });
}