import sys
import json
import numpy as np
from sklearn.cluster import KMeans
import geojson

inpt = sys.stdin.readline()
inpt = json.loads(inpt)
docs = inpt["docs"]
q = inpt["q"]
opt = inpt["opt"]

if "k" not in opt:
    opt["k"] = 4

lat = []
lon = []
for doc in docs:
    if(doc["geotag"] is not None):
        lat.append(doc["geotag"]["coordinates"][1])
        lon.append(doc["geotag"]["coordinates"][0])

source = np.array([lat,lon])
source = source.T
result = KMeans(n_clusters=opt["k"]).fit_predict(source)

result2 = {}
for idx, cluster in enumerate(result):
    if str(cluster) not in result2:
        result2[str(cluster)] = []
    result2[str(cluster)].append(geojson.Feature(geometry=geojson.Point((docs[idx]["geotag"]["coordinates"][0],docs[idx]["geotag"]["coordinates"][1])),properties={"cluster":int(cluster),"url":docs[idx]["url"], "tags":docs[idx]["tags"], "geotag":docs[idx]["geotag"]})) 

for idx, features in result2.items():
    result2[idx] = geojson.FeatureCollection(features)

rtn = {"type":"map-clustered", "result":result2, "q":q, "opt":opt}
print(geojson.dumps(rtn))

sys.exit(0)