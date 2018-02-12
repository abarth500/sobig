db.twitter.drop();
db.twitter.createIndex({ "id": 1 }, { unique: true });
db.twitter.createIndex({ "coordinates": "2dsphere" });