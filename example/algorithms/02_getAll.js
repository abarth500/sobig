module.exports = (q, opt, docs, callback) => {
    opt.map = opt.map ? (opt.map == 'map' ? 'map' : 'heat') : 'map';
    let result = [];
    docs.forEach((p) => {
        if (p.geotag != null) {
            result.push({ url: p.url, tags: p.tags, geotag: p.geotag });
        }
    });
    callback(null, {
        'type': opt.map, //or 'scatter'
        'result': result,
        'q': q,
        'opt': opt
    });
}