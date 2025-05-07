#!/bin/bash
# network/deployChaincode.sh

# Di chuyển đến thư mục test-network
cd /d/exam-blockchain/network/fabric-samples/test-network

# Triển khai chaincode - sử dụng đường dẫn tuyệt đối để tránh lỗi
./network.sh deployCC -c mychannel -ccn examcc -ccp /d/exam-blockchain/chaincode/exam -ccl javascript

echo "Chaincode đã được triển khai thành công!"