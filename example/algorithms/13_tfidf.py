import sys
import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
import geojson

np.set_printoptions(precision=2)

inpt = sys.stdin.readline()
inpt = json.loads(inpt)
docs = inpt["docs"]
q = inpt["q"]
opt = inpt["opt"]

if "topTag" not in opt:
    opt["topTag"] = 40
if "topDoc" not in opt:
    opt["topDoc"] = 100

source = []
doc_length = len(docs)
for doc in docs:
    if "tweet" in doc:
        text = doc["tweet"]
    else:
        text = ' '.join(doc["tags"])
    source.append(text)

source = np.array(source)


vectorizer = TfidfVectorizer(use_idf=True, token_pattern=u'(?u)\\b\\w+\\b',min_df=10,analyzer='word',max_features=opt["topTag"])
result = vectorizer.fit_transform(source)
tfidfOrder = np.argsort(result.sum(axis=1)[0:opt["topDoc"],0:1][::-1],axis=0)
tfidfOrder = np.ravel(tfidfOrder,order='C')[0:opt["topDoc"]]
result = result[tfidfOrder].toarray().tolist()
source = np.array(source)[tfidfOrder].tolist()

schema = {}
for k,v in sorted(vectorizer.vocabulary_.items(), key=lambda x:x[1]):
    schema[str(v)] = k

rtn = {"type":"heatChart", "result":{"schema":schema,"data":result,"tweet":source}, "q":q, "opt":opt}
print(geojson.dumps(rtn))

sys.exit(0)