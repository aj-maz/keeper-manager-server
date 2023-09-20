#!/bin/bash
git submodule update --force --recursive --init --remote

cd lib/rai-analytics-server
docker build -t analytics-server .
echo "analytics server image built"
cd ..
cd rai-keeper
docker build -t rai-keeper .
echo "rai-keeper image built"
cd ..
cd tai-keeper
docker build -t tai-keeper .
echo "tai-keeper image built"


