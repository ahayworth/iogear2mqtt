#!/bin/sh

curl -sL https://deb.nodesource.com/setup_14.x | bash -
apt-get -y install nodejs git

git clone --shallow https://github.com/ahayworth/iogear2mqtt /opt/iogear2mqtt

cd /opt/iogear2mqtt
npm install
