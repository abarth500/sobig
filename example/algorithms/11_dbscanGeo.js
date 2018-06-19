var turf = require('@turf/turf');

module.exports = (q, opt, docs, callback) => {
    if (!opt.eps || !opt.minPts) {
        opt.eps = opt.eps ? opt.eps : 0.05;
        opt.minPts = opt.minPts ? opt.minPts : 3;
    }
    let points = [];
    docs.forEach((p) => {
        if (geotag != null) {
            points.push(turf.point([p.geotag.coordinates[0], p.geotag.coordinates[1]], { url: p.url, tags: p.tags, geotag: p.geotag }));
        }
    });
    let clustered = turf.clustersDbscan(turf.featureCollection(points), opt.eps, { minPoints: opt.minPts });
    let result = {};
    console.log(JSON.stringify(clustered, null, '  '));
    clustered.features.forEach((p) => {
        if (p.properties.dbscan != 'noise') {
            if (!result[p.properties.cluster]) {
                result[p.properties.cluster] = turf.featureCollection([]);
            }
            result[p.properties.cluster].features.push(p);
        }
    });
    callback(null, {
        'type': 'map-clustered',
        'result': result,
        'q': q,
        'opt': opt
    });
}