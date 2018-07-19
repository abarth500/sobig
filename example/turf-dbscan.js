const turf = require('@turf/turf')
const points = turf.randomPoint(100, {
    bbox: [
        35.6194815119,
        139.6955976647,
        35.6746753669,
        139.769183168
    ]
});
const maxDistance = 100;
const minPoints = 5;
const clustered = turf.clustersDbscan(points, maxDistance, { minPoints: minPoints });
console.log(JSON.stringify(clustered));