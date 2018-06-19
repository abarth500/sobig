 # Regression Lineの算出用ライブラリ
npm install --save regression
 
 # nodejsからPythonを呼び出すライブラリ
npm install --save python-shell

 # カラーパレット生成用のライブラリ(Google製)
git clone --depth 1 https://github.com/google/palette.js.git ./util/palette.js/

 # Leaflet上にヒートマップを描画するライブラリ
git clone --depth 1 https://github.com/Leaflet/Leaflet.heat.git ./util/heatmap/
 
 # Python3.6のインストール
sudo add-apt-repository ppa:jonathonf/python-3.6
sudo apt-get update
sudo apt-get install python3.6
wget https://bootstrap.pypa.io/get-pip.py
sudo python3.6 get-pip.py

 # 機械学習ライブラリscikit-learnと関連ライブラリのインストール
sudo pip install numpy
sudo pip install scipy
sudo pip install scikit-learn

 # Python用GeoJSONライブラリのインストール
sudo pip install geojson
