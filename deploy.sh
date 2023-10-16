#!/bin/bash
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources:
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

git submodule update --force --recursive --init 

docker swarm init

mkdir db
mkdir files

cd lib/rai-analytics-server
docker build -t rai-analytics-server .
echo "rai-analytics-server server image built"
cd ..
cd rai-keeper
docker build -t rai-keeper .
echo "rai-keeper image built"
cd ..
cd tai-keeper
docker build -t tai-keeper .
echo "tai-keeper image built"
cd ..
cd client
docker build -t manager-client .
echo "manager-client image built"
cd ..
cd ..
docker build -t manager-server .
echo "manager-service image built"



docker stack deploy -c docker-compose.yaml main-app

sleep 30

docker stack deploy -c docker-compose-nginx.yaml nginx-server