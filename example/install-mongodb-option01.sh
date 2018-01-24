curl https://raw.githubusercontent.com/mongodb/mongo/master/debian/init.d -o mongod
chmod +x ./mongod
sudo mv mongod /etc/init.d/
sudo service mongod start
