import sys
import json
import pprint
import numpy as np
from sklearn.model_selection import cross_validate, StratifiedKFold
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn import metrics
import geojson

inpt = sys.stdin.readline()
inpt = json.loads(inpt)
docs = inpt["docs"]
q = inpt["q"]
opt = inpt["opt"]

target = []
source = []

for doc in docs:
    if doc["exif"]["Make"] in ["Apple","Canon","NIKON CORPORATION"]: #"samsung","sony"etc...
        target.append(str(doc["exif"]["Make"]))
        fl = float(doc["exif"]["FocalLengthIn35mmFormat"].replace(" mm", "")) if "FocalLengthIn35mmFormat" in doc["exif"].keys() else float(doc["exif"]["FocalLength"].replace(" mm", ""))
        s = [int(doc["exif"]["ISO"]),float(doc["exif"]["FNumber"]),float(doc["exif"]["ExposureTime"]), float(doc["exif"]["FocalLength"].replace(" mm", "")),fl]
        source.append(s)       

scoring = {"p": "precision_macro","r": "recall_macro"}
skf = StratifiedKFold(n_splits=5,shuffle=True, random_state=0)
scores_SVM = cross_validate(SVC(), source, target, cv=skf, scoring=scoring, return_train_score=True)
scores_DTC = cross_validate(DecisionTreeClassifier(), source, target, cv=skf, scoring=scoring, return_train_score=True)
scores_KNC = cross_validate(KNeighborsClassifier(), source, target, cv=skf, scoring=scoring, return_train_score=True)
scores_SVM = {"[train] Precision":scores_SVM["train_p"].tolist(),"[train] Recall":scores_SVM["train_r"].tolist(),"[test] Precision":scores_SVM["test_p"].tolist(),"[test] Recall":scores_SVM["test_r"].tolist()}
scores_DTC = {"[train] Precision":scores_DTC["train_p"].tolist(),"[train] Recall":scores_DTC["train_r"].tolist(),"[test] Precision":scores_DTC["test_p"].tolist(),"[test] Recall":scores_DTC["test_r"].tolist()}
scores_KNC = {"[train] Precision":scores_KNC["train_p"].tolist(),"[train] Recall":scores_KNC["train_r"].tolist(),"[test] Precision":scores_KNC["test_p"].tolist(),"[test] Recall":scores_KNC["test_r"].tolist()}
rtn = {"type":"table", "result":{"SVM":scores_SVM,"KNeighborsClassifier":scores_KNC,"DecisionTreeClassifier":scores_DTC}, "q":q, "opt":opt}
print(json.dumps(rtn))

sys.exit(0)
