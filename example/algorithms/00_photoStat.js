const regression = require('regression'),
    async = require('async'),
    sobig_filtering = require(process.cwd() + '/util/util.js').sobig_filtering;
module.exports = (q, opt, docs, callback) => {
    if (!opt.x || !opt.y) {
        opt.x = opt.x ? opt.x : 'ExposureTime';
        opt.y = opt.y ? opt.y : 'FNumber';
        opt.filter = [
            ["$ISO", "<=", 100]
        ];
    }
    let result = [];
    let series = [];
    async.each(docs, (p, cbP) => {
        const v = {
            url: p.url,
            tags: p.tags,
            geotag: p.geotag,
            ExposureTime: p.exif.ExposureTime,
            FNumber: p.exif.FNumber,
            ISO: p.exif.ISO,
            Make: p.exif.Make,
            Model: p.exif.Model
        }
        sobig_filtering(v, opt.filter, (err, pass) => {
            if (pass) {
                result.push(v);
                series.push([v[opt.x], v[opt.y]]);
            }
            cbP(err);
        })
    }, (err) => {
        const line = regression.linear(series);
        opt.regression = {
            gradient: line.equation[0],
            yIntercept: line.equation[1]
        }
        callback(null, {
            'type': 'scatter',
            'result': result,
            'q': q,
            'opt': opt
        });
    });
}