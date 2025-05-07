#!/bin/bash
# network/startFabric.sh

# Di chuyển đến thư mục fabric-samples
cd /d/exam-blockchain/network/fabric-samples/test-network

# Dừng network hiện tại nếu có
./network.sh down

# Khởi động network mới với channel 'mychannel'
./network.sh up createChannel -c mychannel

# Triển khai chaincode
cd /d/exam-blockchain/network
./deployChaincode.sh

echo "Fabric network đã khởi động và chaincode đã được triển khai!"