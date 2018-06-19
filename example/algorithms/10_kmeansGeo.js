var turf = require('@turf/turf');

module.exports = (q, opt, docs, callback) => {
    opt.k = opt.k ? opt.k : 4;
    let points = [];
    docs.forEach((p) => {
        if (p.geotag != null) {
            points.push(turf.point([p.geotag.coordinates[0], p.geotag.coordinates[1]], { url: p.url, tags: p.tags, geotag: p.geotag }));
        }
    });
    let clustered = turf.clustersKmeans(turf.featureCollection(points), { numberOfClusters: opt.k });
    let result = {};
    clustered.features.forEach((p) => {
        if (!result[p.properties.cluster]) {
            result[p.properties.cluster] = turf.featureCollection([]);
        }
        result[p.properties.cluster].features.push(p);
    });
    callback(null, {
        'type': 'map-clustered', //or 'scatter'
        'result': result,
        'q': q,
        'opt': opt
    });
}