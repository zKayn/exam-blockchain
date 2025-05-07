// backend/blockchain/fabric-client.js
const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

// Đường dẫn tới connection profile
const ccpPath = path.resolve(__dirname, '..', '..', 'network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

// Kết nối với mạng Fabric
async function connectToNetwork() {
  try {
    // Tạo wallet cho identity
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Kiểm tra xem user đã tồn tại trong wallet chưa
    const identity = await wallet.get('admin');
    if (!identity) {
      console.log('Không tìm thấy admin identity trong wallet, phải đăng ký user');
      await enrollAdmin();
    }
    
    // Tạo gateway kết nối với mạng
    const gateway = new Gateway();
    await gateway.connect(ccp, { 
      wallet, 
      identity: 'admin', 
      discovery: { enabled: true, asLocalhost: true } 
    });
    
    // Lấy network channel
    const network = await gateway.getNetwork('mychannel');
    // Lấy contract
    const contract = network.getContract('examcc');
    
    return { gateway, network, contract };
  } catch (error) {
    console.error(`Lỗi kết nối với mạng Fabric: ${error}`);
    throw error;
  }
}

// Đăng ký admin user với CA
async function enrollAdmin() {
  try {
    // Tạo CA client
    const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
    const ca = new FabricCAServices(caURL);
    
    // Tạo wallet cho identity
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Đăng ký admin
    const enrollment = await ca.enroll({ 
      enrollmentID: 'admin', 
      enrollmentSecret: 'adminpw' 
    });
    
    // Tạo identity cho admin
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };
    
    // Lưu identity vào wallet
    await wallet.put('admin', x509Identity);
    console.log('Đã đăng ký admin vào wallet thành công');
  } catch (error) {
    console.error(`Lỗi đăng ký admin: ${error}`);
    throw error;
  }
}

// Lưu kết quả bài thi lên blockchain
async function submitExamToBlockchain(submissionId, studentId, examId, answers, score) {
  try {
    // Kết nối với network
    const { contract, gateway } = await connectToNetwork();
    
    // Gọi hàm submitExam trong chaincode
    const timestamp = new Date().toISOString();
    await contract.submitTransaction(
      'submitExam', 
      submissionId, 
      studentId, 
      examId,
      JSON.stringify(answers),
      score.toString(),
      timestamp
    );
    
    // Đóng kết nối
    gateway.disconnect();
    
    return {
      success: true,
      txId: submissionId,
      timestamp
    };
  } catch (error) {
    console.error(`Lỗi lưu kết quả lên blockchain: ${error}`);
    throw error;
  }
}

// Lấy kết quả bài thi từ blockchain
async function getSubmissionFromBlockchain(submissionId) {
  try {
    // Kết nối với network
    const { contract, gateway } = await connectToNetwork();
    
    // Gọi hàm getSubmission trong chaincode
    const result = await contract.evaluateTransaction('getSubmission', submissionId);
    
    // Đóng kết nối
    gateway.disconnect();
    
    return JSON.parse(result.toString());
  } catch (error) {
    console.error(`Lỗi lấy kết quả từ blockchain: ${error}`);
    throw error;
  }
}

module.exports = {
  connectToNetwork,
  submitExamToBlockchain,
  getSubmissionFromBlockchain
};