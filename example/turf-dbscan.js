var turf = require('@turf/turf')
var points = turf.randomPoint(100, {
    bbox: [
        35.6194815119,
        139.6955976647,
        35.6746753669,
        139.769183168
    ]
});
var maxDistance = 100;
var minPoints = 5;
var clustered = turf.clustersDbscan(points, maxDistance, { minPoints: minPoints });
console.log(JSON.stringify(clustered));