import sys
import json
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn import metrics
import geojson

kms_per_radian = 6371.0088

inpt = sys.stdin.readline()
inpt = json.loads(inpt)
docs = inpt["docs"]
q = inpt["q"]
opt = inpt["opt"]

if "eps" not in opt or "minPts" not in opt:
    opt["eps"] = 0.05
    opt["minPts"] = 3

lat = []
lon = []
for doc in docs:
    if doc["geotag"] is not None:
        lat.append(doc["geotag"]["coordinates"][1])
        lon.append(doc["geotag"]["coordinates"][0])

source = np.array([lat,lon])
source = source.T
eps = opt["eps"] / kms_per_radian
result = DBSCAN(eps=eps,min_samples=opt["minPts"],metric='haversine').fit(np.radians(source))

result2 = {}
for i, label in enumerate(result.labels_):
    if str(label) not in result2.keys():
        result2[str(label)] = []
    result2[str(label)].append(geojson.Feature(geometry=geojson.Point((docs[i]["geotag"]["coordinates"][0],docs[i]["geotag"]["coordinates"][1])),properties={"cluster":int(label),"url":docs[i]["url"], "tags":docs[i]["tags"], "geotag":docs[i]["geotag"]}))

for idx, features in result2.items():
    result2[idx] = geojson.FeatureCollection(features)


rtn = {"type":"map-clustered", "result":result2, "q":q, "opt":opt}
print(geojson.dumps(rtn))

sys.exit(0)