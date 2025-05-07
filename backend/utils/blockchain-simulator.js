// utils/blockchain-simulator.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Tạo đường dẫn đến file lưu trữ blockchain
const BLOCKCHAIN_FILE = path.join(__dirname, '../data/blockchain.json');

// Đảm bảo thư mục data tồn tại
if (!fs.existsSync(path.dirname(BLOCKCHAIN_FILE))) {
  fs.mkdirSync(path.dirname(BLOCKCHAIN_FILE), { recursive: true });
}

// Đảm bảo file blockchain tồn tại
if (!fs.existsSync(BLOCKCHAIN_FILE)) {
  fs.writeFileSync(BLOCKCHAIN_FILE, JSON.stringify({ chain: [] }));
}

// Hàm tính hash của block
function calculateHash(data, previousHash) {
  return crypto.createHash('sha256')
    .update(previousHash + JSON.stringify(data) + Date.now().toString())
    .digest('hex');
}

async function submitExamToBlockchain(submissionId, studentId, examId, answers, correctAnswers, totalQuestions, score) {
  try {
    // Đọc blockchain hiện tại
    let blockchain;
    try {
      blockchain = JSON.parse(fs.readFileSync(BLOCKCHAIN_FILE, 'utf8'));
      if (!blockchain.chain) {
        blockchain = { chain: [] };
      }
    } catch (error) {
      console.error('Lỗi đọc file blockchain:', error);
      blockchain = { chain: [] };
    }
    
    // Lấy hash của block cuối cùng
    const previousHash = blockchain.chain.length > 0 
      ? blockchain.chain[blockchain.chain.length - 1].hash 
      : '0';
    
    // Tạo block mới
    const data = {
      submissionId,
      studentId,
      examId,
      answers,
      correctAnswers,
      totalQuestions,
      score: score.toString(),
      timestamp: new Date().toISOString()
    };
    
    const hash = calculateHash(data, previousHash);
    
    // Thêm block vào chain
    blockchain.chain.push({
      data,
      hash,
      previousHash,
      timestamp: new Date().toISOString()
    });
    
    // Lưu blockchain
    try {
      fs.writeFileSync(BLOCKCHAIN_FILE, JSON.stringify(blockchain, null, 2));
    } catch (error) {
      console.error('Lỗi ghi file blockchain:', error);
      fs.mkdirSync(path.dirname(BLOCKCHAIN_FILE), { recursive: true });
      fs.writeFileSync(BLOCKCHAIN_FILE, JSON.stringify(blockchain, null, 2));
    }
    
    return {
      success: true,
      txId: hash,
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error(`Lỗi lưu kết quả lên blockchain: ${error}`);
    throw error;
  }
}

// Lấy kết quả bài thi từ blockchain theo txId (hash)
async function getSubmissionFromBlockchain(txId) {
  try {
    // Đọc blockchain
    const blockchain = JSON.parse(fs.readFileSync(BLOCKCHAIN_FILE, 'utf8'));
    
    // Tìm block với hash tương ứng
    const block = blockchain.chain.find(block => block.hash === txId);
    
    if (!block) {
      console.log(`Không tìm thấy block với hash: ${txId}`);
      return null;
    }
    
    return {
      ...block.data,
      hash: block.hash,
      timestamp: block.timestamp
    };
  } catch (error) {
    console.error(`Lỗi lấy kết quả từ blockchain: ${error}`);
    return null;
  }
}

// Lấy bài nộp theo submissionId
async function getSubmissionById(submissionId) {
  try {
    // Đọc blockchain
    const blockchain = JSON.parse(fs.readFileSync(BLOCKCHAIN_FILE, 'utf8'));
    
    // Tìm block chứa submission
    const block = blockchain.chain.find(block => block.data.submissionId === submissionId);
    
    if (!block) {
      console.log(`Không tìm thấy bài nộp với ID: ${submissionId}`);
      return null;
    }
    
    return {
      ...block.data,
      hash: block.hash,
      timestamp: block.timestamp
    };
  } catch (error) {
    console.error(`Lỗi lấy kết quả từ blockchain: ${error}`);
    return null;
  }
}

// Xác minh tính toàn vẹn của blockchain
function verifyBlockchain() {
  try {
    const blockchain = JSON.parse(fs.readFileSync(BLOCKCHAIN_FILE, 'utf8'));
    
    // Kiểm tra từng block trong chain
    for (let i = 1; i < blockchain.chain.length; i++) {
      const currentBlock = blockchain.chain[i];
      const previousBlock = blockchain.chain[i - 1];
      
      // Kiểm tra hash của block trước
      if (currentBlock.previousHash !== previousBlock.hash) {
        return {
          valid: false,
          message: `Lỗi tại block ${i}: Block không trỏ đến hash của block trước đó`
        };
      }
      
      // Tính lại hash của block hiện tại để kiểm tra
      const calculatedHash = crypto.createHash('sha256')
        .update(currentBlock.previousHash + JSON.stringify(currentBlock.data))
        .digest('hex');
      
      // So sánh hash đã lưu với hash tính toán lại
      if (calculatedHash !== currentBlock.hash) {
        return {
          valid: false,
          message: `Lỗi tại block ${i}: Dữ liệu đã bị thay đổi`
        };
      }
    }
    
    return {
      valid: true,
      message: 'Blockchain hợp lệ',
      blockCount: blockchain.chain.length
    };
  } catch (error) {
    console.error(`Lỗi xác minh blockchain: ${error}`);
    return {
      valid: false,
      message: `Lỗi xác minh: ${error.message}`
    };
  }
}

module.exports = {
  submitExamToBlockchain,
  getSubmissionFromBlockchain,
  getSubmissionById,
  verifyBlockchain
};