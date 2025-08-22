⚡ Tính năng chính

Quản lý đề thi: Tạo, lưu trữ và phân phối đề thi trên blockchain
Bảo mật cao: Dữ liệu được mã hóa và lưu trữ phân tán
Chấm điểm tự động: Smart contract tự động chấm và lưu kết quả
Chứng chỉ số: Tạo chứng chỉ có thể xác minh trên blockchain
Theo dõi minh bạch: Tất cả hoạt động đều có thể theo dõi và xác minh

🛠️ Công nghệ sử dụng

Blockchain: Ethereum / Hyperledger Fabric
Smart Contracts: Solidity / Chaincode
Frontend: React.js / Vue.js
Backend: Node.js / Go
Database: IPFS / MongoDB
Web3: Web3.js / Ethers.js

📦 Cài đặt
Yêu cầu hệ thống

Node.js >= 16.0.0
npm hoặc yarn
Ganache hoặc Hardhat (cho development)
MetaMask extension

Các bước cài đặt

Clone repository
bashgit clone https://github.com/zKayn/exam-blockchain.git
cd exam-blockchain

Cài đặt dependencies
bashnpm install
# hoặc
yarn install

Cấu hình môi trường
bashcp .env.example .env
# Chỉnh sửa các biến môi trường trong file .env

Deploy smart contracts
bashnpm run deploy
# hoặc
truffle migrate --reset

Khởi chạy ứng dụng
bashnpm start
# hoặc
yarn start


🚀 Sử dụng
Cho giáo viên:

Đăng nhập vào hệ thống
Tạo đề thi mới
Cấu hình thời gian và quyền truy cập
Theo dõi tiến trình làm bài của học sinh

Cho học sinh:

Đăng nhập bằng tài khoản được cấp
Chọn bài thi và bắt đầu làm bài
Nộp bài khi hoàn thành
Xem kết quả và tải chứng chỉ
