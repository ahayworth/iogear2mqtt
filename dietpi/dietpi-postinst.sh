#!/bin/sh

apt-get -y install git build-essential python

cd /opt

wget https://unofficial-builds.nodejs.org/download/release/v14.9.0/node-v14.9.0-linux-armv6l.tar.gz
tar xzf node-v14.9.0-linux-armv6l.tar.gz
mv /opt/node-v14.9.0-linux-armv6l.tar.gz /opt/node
ln -sf /opt/node/bin/node /usr/bin/node
ln -sf /opt/node/bin/npm /usr/bin/npm
ln -sf /opt/node/bin/npx /usr/bin/npx

git clone --depth 1 https://github.com/ahayworth/iogear2mqtt

cd /opt/iogear2mqtt
npm install
