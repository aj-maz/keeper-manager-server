mkdir db
mkdir files
mkdir files/wallets

mkdir images 
mkdir logs 

cd images
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

docker-compose up