import sys
import json

inpt = sys.stdin.readline()
inpt = json.loads(inpt)
docs = inpt["docs"]
q = inpt["q"]
opt = inpt["opt"]

result = []
for doc in docs:
    if doc["geotag"] is not None:
        result.append({"url":doc["url"], "tags":doc["tags"], "geotag":doc["geotag"]})

rtn = {"type":"map", "result":result, "q":q, "opt":opt}
print(json.dumps(rtn))

sys.exit(0)