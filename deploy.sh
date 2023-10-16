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

docker swarm init --advertise-addr 127.0.0.1

mkdir db
mkdir files
mkdir files/wallets

cd ..
git clone https://github.com/ajand/keeper-manager-analytics-server.git rai-analytics-server
cd rai-analytics-server
docker build -t rai-analytics-server .
cd ..

git clone https://github.com/money-god/auction-keeper.git tai-keeper
cd tai-keeper
git submodule update --force --recursive --init --remote
docker build -t tai-keeper .
cd ..

git clone https://github.com/reflexer-labs/auction-keeper.git rai-keeper
cd rai-keeper
git submodule update --force --recursive --init --remote
docker build -t rai-keeper .
cd ..

git clone https://github.com/Ajand/GEB-Keeper-Manager-client.git client
cd client
docker build -t manager-client .
echo "manager-client image built"

cd ..
cd keeper-manager
docker build -t manager-server .
echo "manager-service image built"



docker stack deploy -c docker-compose.yaml main-app
