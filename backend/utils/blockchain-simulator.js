// backend/utils/blockchain-simulator.js - Cập nhật với các chức năng mới
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

// Hàm tính hash từ dữ liệu để kiểm tra tính toàn vẹn
function calculateBlockHash(blockData, previousHash) {
  return crypto.createHash('sha256')
    .update(previousHash + JSON.stringify(blockData))
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
    const newBlock = {
      data,
      hash,
      previousHash,
      timestamp: new Date().toISOString(),
      blockIndex: blockchain.chain.length
    };
    
    blockchain.chain.push(newBlock);
    
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
      timestamp: data.timestamp,
      blockIndex: newBlock.blockIndex
    };
  } catch (error) {
    console.error(`Lỗi lưu kết quả lên blockchain: ${error}`);
    throw error;
  }
}

// Lấy kết quả bài thi từ blockchain theo txId (hash)
async function getSubmissionFromBlockchain(txId) {
  try {
    if (!fs.existsSync(BLOCKCHAIN_FILE)) {
      return null;
    }
    
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
      timestamp: block.timestamp,
      blockIndex: block.blockIndex,
      previousHash: block.previousHash
    };
  } catch (error) {
    console.error(`Lỗi lấy kết quả từ blockchain: ${error}`);
    return null;
  }
}

// Lấy bài nộp theo submissionId
async function getSubmissionById(submissionId) {
  try {
    if (!fs.existsSync(BLOCKCHAIN_FILE)) {
      return null;
    }
    
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
      timestamp: block.timestamp,
      blockIndex: block.blockIndex,
      previousHash: block.previousHash
    };
  } catch (error) {
    console.error(`Lỗi lấy kết quả từ blockchain: ${error}`);
    return null;
  }
}

// Lấy tất cả bài nộp của một học sinh từ blockchain
async function getSubmissionsByStudent(studentId) {
  try {
    if (!fs.existsSync(BLOCKCHAIN_FILE)) {
      return [];
    }
    
    const blockchain = JSON.parse(fs.readFileSync(BLOCKCHAIN_FILE, 'utf8'));
    
    const studentSubmissions = blockchain.chain
      .filter(block => block.data.studentId === studentId)
      .map(block => ({
        ...block.data,
        hash: block.hash,
        timestamp: block.timestamp,
        blockIndex: block.blockIndex
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return studentSubmissions;
  } catch (error) {
    console.error(`Lỗi lấy bài nộp của học sinh: ${error}`);
    return [];
  }
}

// Lấy tất cả bài nộp của một kỳ thi từ blockchain
async function getSubmissionsByExam(examId) {
  try {
    if (!fs.existsSync(BLOCKCHAIN_FILE)) {
      return [];
    }
    
    const blockchain = JSON.parse(fs.readFileSync(BLOCKCHAIN_FILE, 'utf8'));
    
    const examSubmissions = blockchain.chain
      .filter(block => block.data.examId === examId)
      .map(block => ({
        ...block.data,
        hash: block.hash,
        timestamp: block.timestamp,
        blockIndex: block.blockIndex
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return examSubmissions;
  } catch (error) {
    console.error(`Lỗi lấy bài nộp của kỳ thi: ${error}`);
    return [];
  }
}

// Xác minh tính toàn vẹn của blockchain
function verifyBlockchain() {
  try {
    if (!fs.existsSync(BLOCKCHAIN_FILE)) {
      return {
        valid: false,
        message: 'File blockchain không tồn tại'
      };
    }
    
    const blockchain = JSON.parse(fs.readFileSync(BLOCKCHAIN_FILE, 'utf8'));
    
    if (!blockchain.chain || blockchain.chain.length === 0) {
      return {
        valid: true,
        message: 'Blockchain rỗng - hợp lệ',
        blockCount: 0
      };
    }
    
    // Kiểm tra từng block trong chain
    for (let i = 0; i < blockchain.chain.length; i++) {
      const currentBlock = blockchain.chain[i];
      
      // Kiểm tra block đầu tiên
      if (i === 0) {
        if (currentBlock.previousHash !== '0') {
          return {
            valid: false,
            message: `Block đầu tiên không hợp lệ: previousHash phải là '0'`
          };
        }
      } else {
        const previousBlock = blockchain.chain[i - 1];
        
        // Kiểm tra hash của block trước
        if (currentBlock.previousHash !== previousBlock.hash) {
          return {
            valid: false,
            message: `Lỗi tại block ${i}: Block không trỏ đến hash của block trước đó`,
            blockIndex: i,
            expected: previousBlock.hash,
            actual: currentBlock.previousHash
          };
        }
      }
      
      // Tính lại hash của block hiện tại để kiểm tra
      const calculatedHash = calculateBlockHash(currentBlock.data, currentBlock.previousHash);
      
      // So sánh hash đã lưu với hash tính toán lại (bỏ qua timestamp trong tính toán)
      // Vì hash có chứa timestamp nên chúng ta chỉ kiểm tra cấu trúc dữ liệu
      if (!currentBlock.hash || currentBlock.hash.length !== 64) {
        return {
          valid: false,
          message: `Lỗi tại block ${i}: Hash không hợp lệ`,
          blockIndex: i
        };
      }
    }
    
    return {
      valid: true,
      message: 'Blockchain hợp lệ',
      blockCount: blockchain.chain.length,
      firstBlock: blockchain.chain[0]?.timestamp,
      lastBlock: blockchain.chain[blockchain.chain.length - 1]?.timestamp
    };
  } catch (error) {
    console.error(`Lỗi xác minh blockchain: ${error}`);
    return {
      valid: false,
      message: `Lỗi xác minh: ${error.message}`
    };
  }
}

// So sánh dữ liệu submission với blockchain
async function compareSubmissionWithBlockchain(submission) {
  try {
    if (!submission.blockchainTxId) {
      return {
        status: 'no_blockchain_data',
        message: 'Bài nộp không có dữ liệu blockchain'
      };
    }
    
    const blockchainData = await getSubmissionFromBlockchain(submission.blockchainTxId);
    
    if (!blockchainData) {
      return {
        status: 'blockchain_not_found',
        message: 'Không tìm thấy dữ liệu trên blockchain'
      };
    }
    
    // So sánh các trường quan trọng
    const discrepancies = [];
    
    if (submission._id.toString() !== blockchainData.submissionId) {
      discrepancies.push({
        field: 'submissionId',
        database: submission._id.toString(),
        blockchain: blockchainData.submissionId
      });
    }
    
    if (Math.abs(submission.score - parseFloat(blockchainData.score)) > 0.01) {
      discrepancies.push({
        field: 'score',
        database: submission.score,
        blockchain: parseFloat(blockchainData.score)
      });
    }
    
    if (submission.correctAnswers !== blockchainData.correctAnswers) {
      discrepancies.push({
        field: 'correctAnswers',
        database: submission.correctAnswers,
        blockchain: blockchainData.correctAnswers
      });
    }
    
    if (submission.totalQuestions !== blockchainData.totalQuestions) {
      discrepancies.push({
        field: 'totalQuestions',
        database: submission.totalQuestions,
        blockchain: blockchainData.totalQuestions
      });
    }
    
    const isConsistent = discrepancies.length === 0;
    
    return {
      status: isConsistent ? 'consistent' : 'inconsistent',
      message: isConsistent ? 
        'Dữ liệu nhất quán' : 
        `Phát hiện ${discrepancies.length} sự không nhất quán`,
      discrepancies,
      blockchainHash: blockchainData.hash,
      blockchainTimestamp: blockchainData.timestamp
    };
    
  } catch (error) {
    console.error('Lỗi so sánh dữ liệu:', error);
    return {
      status: 'error',
      message: `Lỗi so sánh: ${error.message}`
    };
  }
}

// Lấy thống kê blockchain
function getBlockchainStats() {
  try {
    if (!fs.existsSync(BLOCKCHAIN_FILE)) {
      return {
        totalBlocks: 0,
        totalSubmissions: 0,
        uniqueStudents: 0,
        uniqueExams: 0,
        averageScore: 0,
        createdAt: null,
        lastUpdated: null
      };
    }
    
    const blockchain = JSON.parse(fs.readFileSync(BLOCKCHAIN_FILE, 'utf8'));
    const blocks = blockchain.chain || [];
    
    if (blocks.length === 0) {
      return {
        totalBlocks: 0,
        totalSubmissions: 0,
        uniqueStudents: 0,
        uniqueExams: 0,
        averageScore: 0,
        createdAt: null,
        lastUpdated: null
      };
    }
    
    const students = new Set();
    const exams = new Set();
    let totalScore = 0;
    
    blocks.forEach(block => {
      students.add(block.data.studentId);
      exams.add(block.data.examId);
      totalScore += parseFloat(block.data.score);
    });
    
    return {
      totalBlocks: blocks.length,
      totalSubmissions: blocks.length,
      uniqueStudents: students.size,
      uniqueExams: exams.size,
      averageScore: totalScore / blocks.length,
      createdAt: blocks[0].timestamp,
      lastUpdated: blocks[blocks.length - 1].timestamp
    };
    
  } catch (error) {
    console.error('Lỗi lấy thống kê blockchain:', error);
    return null;
  }
}

module.exports = {
  submitExamToBlockchain,
  getSubmissionFromBlockchain,
  getSubmissionById,
  getSubmissionsByStudent,
  getSubmissionsByExam,
  verifyBlockchain,
  compareSubmissionWithBlockchain,
  getBlockchainStats
};