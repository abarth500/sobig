db.createCollection('geoJson');
db.geoJson.createIndex({ endpoitns: 1 });
db.geoJson.createIndex({ line: "2dsphere" });
db.geoJson.insert({
    "endpoitns": ["首都大学東京", "岡山理科大学"],
    "line": {
        "type": "LineString",
        "coordinates": [
            [139.3653938, 35.6613515],
            [133.9272884, 34.6961635]
        ]
    }
});
db.geoJson.insert({
    "endpoitns": ["大分工業高等専門学校", "帯広畜産大学"],
    "line": {
        "type": "LineString",
        "coordinates": [
            [131.6158472, 33.214347],
            [143.1709827, 42.876002]
        ]
    }
});