const query_overpass = require('query-overpass');
const q = `[out:json][timeout:60];
node["leisure"="stadium"](34.3704,136.2806,37.2913,141.2904);
out;
`;
query_overpass(q, (error, results) => {
    console.log(JSON.stringify(results, null, "\t"));
});