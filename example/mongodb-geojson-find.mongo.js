//endpointsに首都大学東京を含むドキュメントを検索
db.geoJson.find({ "endpoints": "首都大学東京" });

//上記クエリの実行プランを表示
db.geoJson.find({ "endpoints": "首都大学東京" }).explain();

//静岡大学、新潟大学を結ぶ線と交わる図形を持つドキュメントを検索
db.geoJson.find({
    line: {
        $geoIntersects: {
            $geometry: {
                "type": "LineString",
                "coordinates": [
                    [137.715474, 34.7247871],
                    [138.9403503, 37.86701]
                ]
            }
        }
    }
});