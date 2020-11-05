#!/bin/sh

apt-get -y install nodejs npm git build-essential

git clone --depth 1 https://github.com/ahayworth/iogear2mqtt /opt/iogear2mqtt

cd /opt/iogear2mqtt
npm install
