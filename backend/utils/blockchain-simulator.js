// backend/utils/blockchain-simulator.js - Phiên bản nâng cao
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Tạo đường dẫn đến file lưu trữ blockchain
const BLOCKCHAIN_FILE = path.join(__dirname, '../data/blockchain.json');
const BLOCKCHAIN_BACKUP_DIR = path.join(__dirname, '../data/backups');

// Đảm bảo thư mục data tồn tại
if (!fs.existsSync(path.dirname(BLOCKCHAIN_FILE))) {
  fs.mkdirSync(path.dirname(BLOCKCHAIN_FILE), { recursive: true });
}

// Đảm bảo thư mục backup tồn tại
if (!fs.existsSync(BLOCKCHAIN_BACKUP_DIR)) {
  fs.mkdirSync(BLOCKCHAIN_BACKUP_DIR, { recursive: true });
}

// Đảm bảo file blockchain tồn tại
if (!fs.existsSync(BLOCKCHAIN_FILE)) {
  fs.writeFileSync(BLOCKCHAIN_FILE, JSON.stringify({ 
    chain: [],
    metadata: {
      version: '1.0.0',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }
  }));
}

// Hàm tính hash của block
function calculateHash(data, previousHash, timestamp) {
  return crypto.createHash('sha256')
    .update(previousHash + JSON.stringify(data) + timestamp)
    .digest('hex');
}

// Hàm tính hash từ dữ liệu để kiểm tra tính toàn vẹn
function calculateBlockHash(blockData, previousHash, timestamp) {
  return crypto.createHash('sha256')
    .update(previousHash + JSON.stringify(blockData) + timestamp)
    .digest('hex');
}

// Backup blockchain
function backupBlockchain() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BLOCKCHAIN_BACKUP_DIR, `blockchain-backup-${timestamp}.json`);
    
    if (fs.existsSync(BLOCKCHAIN_FILE)) {
      fs.copyFileSync(BLOCKCHAIN_FILE, backupFile);
      console.log(`Blockchain đã được backup tại: ${backupFile}`);
    }
  } catch (error) {
    console.error('Lỗi backup blockchain:', error);
  }
}

// Đọc blockchain an toàn
function readBlockchain() {
  try {
    const data = fs.readFileSync(BLOCKCHAIN_FILE, 'utf8');
    const blockchain = JSON.parse(data);
    
    // Đảm bảo cấu trúc đúng
    if (!blockchain.chain) {
      blockchain.chain = [];
    }
    if (!blockchain.metadata) {
      blockchain.metadata = {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
    }
    
    return blockchain;
  } catch (error) {
    console.error('Lỗi đọc blockchain:', error);
    return { 
      chain: [],
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    };
  }
}

// Ghi blockchain an toàn
function writeBlockchain(blockchain) {
  try {
    // Backup trước khi ghi
    backupBlockchain();
    
    // Cập nhật metadata
    blockchain.metadata.lastModified = new Date().toISOString();
    blockchain.metadata.totalBlocks = blockchain.chain.length;
    
    fs.writeFileSync(BLOCKCHAIN_FILE, JSON.stringify(blockchain, null, 2));
    return true;
  } catch (error) {
    console.error('Lỗi ghi blockchain:', error);
    return false;
  }
}

// Hàm nộp bài lên blockchain - nâng cao
async function submitExamToBlockchain(submissionId, studentId, examId, answers, correctAnswers, totalQuestions, score) {
  try {
    // Đọc blockchain hiện tại
    const blockchain = readBlockchain();
    
    // Lấy hash của block cuối cùng
    const previousHash = blockchain.chain.length > 0 
      ? blockchain.chain[blockchain.chain.length - 1].hash 
      : '0';
    
    // Tạo timestamp
    const timestamp = new Date().toISOString();
    
    // Tạo block mới với dữ liệu đầy đủ
    const data = {
      submissionId,
      studentId,
      examId,
      answers,
      correctAnswers: Number(correctAnswers),
      totalQuestions: Number(totalQuestions),
      score: Number(score).toFixed(2),
      percentage: ((correctAnswers / totalQuestions) * 100).toFixed(2),
      timestamp
    };
    
    // Tính hash của block
    const hash = calculateHash(data, previousHash, timestamp);
    
    // Tạo block mới
    const newBlock = {
      blockIndex: blockchain.chain.length,
      data,
      hash,
      previousHash,
      timestamp,
      nonce: Math.floor(Math.random() * 1000000), // Thêm nonce để tăng tính bảo mật
      merkleRoot: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
    };
    
    // Thêm block vào chain
    blockchain.chain.push(newBlock);
    
    // Lưu blockchain
    const saved = writeBlockchain(blockchain);
    
    if (!saved) {
      throw new Error('Không thể lưu blockchain');
    }
    
    return {
      success: true,
      txId: hash,
      timestamp: data.timestamp,
      blockIndex: newBlock.blockIndex,
      merkleRoot: newBlock.merkleRoot
    };
  } catch (error) {
    console.error(`Lỗi lưu kết quả lên blockchain: ${error}`);
    throw error;
  }
}

// Lấy kết quả bài thi từ blockchain theo txId (hash)
async function getSubmissionFromBlockchain(txId) {
  try {
    const blockchain = readBlockchain();
    
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
      previousHash: block.previousHash,
      merkleRoot: block.merkleRoot,
      verified: true
    };
  } catch (error) {
    console.error(`Lỗi lấy kết quả từ blockchain: ${error}`);
    return null;
  }
}

// Lấy bài nộp theo submissionId
async function getSubmissionById(submissionId) {
  try {
    const blockchain = readBlockchain();
    
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
      previousHash: block.previousHash,
      merkleRoot: block.merkleRoot
    };
  } catch (error) {
    console.error(`Lỗi lấy kết quả từ blockchain: ${error}`);
    return null;
  }
}

// Lấy tất cả bài nộp của một học sinh từ blockchain
async function getSubmissionsByStudent(studentId) {
  try {
    const blockchain = readBlockchain();
    
    const studentSubmissions = blockchain.chain
      .filter(block => block.data.studentId === studentId)
      .map(block => ({
        ...block.data,
        hash: block.hash,
        timestamp: block.timestamp,
        blockIndex: block.blockIndex,
        merkleRoot: block.merkleRoot
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
    const blockchain = readBlockchain();
    
    const examSubmissions = blockchain.chain
      .filter(block => block.data.examId === examId)
      .map(block => ({
        ...block.data,
        hash: block.hash,
        timestamp: block.timestamp,
        blockIndex: block.blockIndex,
        merkleRoot: block.merkleRoot
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return examSubmissions;
  } catch (error) {
    console.error(`Lỗi lấy bài nộp của kỳ thi: ${error}`);
    return [];
  }
}

// Xác minh tính toàn vẹn của blockchain - nâng cao
function verifyBlockchain() {
  try {
    const blockchain = readBlockchain();
    
    if (!blockchain.chain || blockchain.chain.length === 0) {
      return {
        valid: true,
        message: 'Blockchain rỗng - hợp lệ',
        blockCount: 0,
        details: []
      };
    }
    
    const details = [];
    let isValid = true;
    
    // Kiểm tra từng block trong chain
    for (let i = 0; i < blockchain.chain.length; i++) {
      const currentBlock = blockchain.chain[i];
      const blockDetails = {
        blockIndex: i,
        hash: currentBlock.hash,
        valid: true,
        issues: []
      };
      
      // Kiểm tra block đầu tiên
      if (i === 0) {
        if (currentBlock.previousHash !== '0') {
          blockDetails.valid = false;
          blockDetails.issues.push('Block đầu tiên phải có previousHash = "0"');
          isValid = false;
        }
      } else {
        const previousBlock = blockchain.chain[i - 1];
        
        // Kiểm tra hash của block trước
        if (currentBlock.previousHash !== previousBlock.hash) {
          blockDetails.valid = false;
          blockDetails.issues.push(`previousHash không khớp với hash của block trước`);
          isValid = false;
        }
      }
      
      // Kiểm tra cấu trúc dữ liệu
      if (!currentBlock.data || !currentBlock.hash || !currentBlock.timestamp) {
        blockDetails.valid = false;
        blockDetails.issues.push('Block thiếu dữ liệu cần thiết');
        isValid = false;
      }
      
      // Kiểm tra hash hợp lệ
      if (!currentBlock.hash || currentBlock.hash.length !== 64) {
        blockDetails.valid = false;
        blockDetails.issues.push('Hash không hợp lệ');
        isValid = false;
      }
      
      // Kiểm tra blockIndex
      if (currentBlock.blockIndex !== i) {
        blockDetails.valid = false;
        blockDetails.issues.push(`blockIndex không đúng: expected ${i}, got ${currentBlock.blockIndex}`);
        isValid = false;
      }
      
      details.push(blockDetails);
    }
    
    return {
      valid: isValid,
      message: isValid ? 'Blockchain hợp lệ' : 'Blockchain có lỗi',
      blockCount: blockchain.chain.length,
      details,
      metadata: blockchain.metadata,
      firstBlock: blockchain.chain[0]?.timestamp,
      lastBlock: blockchain.chain[blockchain.chain.length - 1]?.timestamp
    };
  } catch (error) {
    console.error(`Lỗi xác minh blockchain: ${error}`);
    return {
      valid: false,
      message: `Lỗi xác minh: ${error.message}`,
      details: []
    };
  }
}

// So sánh dữ liệu submission với blockchain - nâng cao
async function compareSubmissionWithBlockchain(submission) {
  try {
    if (!submission.blockchainTxId) {
      return {
        status: 'no_blockchain_data',
        message: 'Bài nộp không có dữ liệu blockchain',
        consistent: false
      };
    }
    
    const blockchainData = await getSubmissionFromBlockchain(submission.blockchainTxId);
    
    if (!blockchainData) {
      return {
        status: 'blockchain_not_found',
        message: 'Không tìm thấy dữ liệu trên blockchain',
        consistent: false
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
    
    // So sánh answers
    if (submission.answers && blockchainData.answers) {
      if (submission.answers.length !== blockchainData.answers.length) {
        discrepancies.push({
          field: 'answers_length',
          database: submission.answers.length,
          blockchain: blockchainData.answers.length
        });
      } else {
        // So sánh từng câu trả lời
        for (let i = 0; i < submission.answers.length; i++) {
          const dbAnswer = submission.answers[i];
          const bcAnswer = blockchainData.answers[i];
          
          if (dbAnswer.selectedOption !== bcAnswer.selectedOption) {
            discrepancies.push({
              field: `answer_${i}_selectedOption`,
              database: dbAnswer.selectedOption,
              blockchain: bcAnswer.selectedOption
            });
          }
          
          if (dbAnswer.isCorrect !== bcAnswer.isCorrect) {
            discrepancies.push({
              field: `answer_${i}_isCorrect`,
              database: dbAnswer.isCorrect,
              blockchain: bcAnswer.isCorrect
            });
          }
        }
      }
    }
    
    const isConsistent = discrepancies.length === 0;
    
    return {
      status: isConsistent ? 'consistent' : 'inconsistent',
      message: isConsistent ? 
        'Dữ liệu nhất quán giữa database và blockchain' : 
        `Phát hiện ${discrepancies.length} sự không nhất quán`,
      consistent: isConsistent,
      discrepancies,
      blockchainHash: blockchainData.hash,
      blockchainTimestamp: blockchainData.timestamp,
      blockchainIndex: blockchainData.blockIndex,
      merkleRoot: blockchainData.merkleRoot
    };
    
  } catch (error) {
    console.error('Lỗi so sánh dữ liệu:', error);
    return {
      status: 'error',
      message: `Lỗi so sánh: ${error.message}`,
      consistent: false
    };
  }
}

// Lấy thống kê blockchain - nâng cao
function getBlockchainStats() {
  try {
    const blockchain = readBlockchain();
    const blocks = blockchain.chain || [];
    
    if (blocks.length === 0) {
      return {
        totalBlocks: 0,
        totalSubmissions: 0,
        uniqueStudents: 0,
        uniqueExams: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        createdAt: null,
        lastUpdated: null,
        totalStorage: 0,
        metadata: blockchain.metadata
      };
    }
    
    const students = new Set();
    const exams = new Set();
    const scores = [];
    let totalCorrectAnswers = 0;
    let totalQuestions = 0;
    
    blocks.forEach(block => {
      students.add(block.data.studentId);
      exams.add(block.data.examId);
      const score = parseFloat(block.data.score);
      scores.push(score);
      
      if (block.data.correctAnswers) {
        totalCorrectAnswers += block.data.correctAnswers;
      }
      if (block.data.totalQuestions) {
        totalQuestions += block.data.totalQuestions;
      }
    });
    
    // Tính kích thước file
    let fileSize = 0;
    try {
      const stats = fs.statSync(BLOCKCHAIN_FILE);
      fileSize = stats.size;
    } catch (e) {
      fileSize = 0;
    }
    
    return {
      totalBlocks: blocks.length,
      totalSubmissions: blocks.length,
      uniqueStudents: students.size,
      uniqueExams: exams.size,
      averageScore: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0,
      highestScore: scores.length > 0 ? Math.max(...scores).toFixed(2) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores).toFixed(2) : 0,
      totalCorrectAnswers,
      totalQuestions,
      accuracyRate: totalQuestions > 0 ? ((totalCorrectAnswers / totalQuestions) * 100).toFixed(2) : 0,
      createdAt: blocks[0]?.timestamp,
      lastUpdated: blocks[blocks.length - 1]?.timestamp,
      totalStorage: `${(fileSize / 1024).toFixed(2)} KB`,
      metadata: blockchain.metadata
    };
    
  } catch (error) {
    console.error('Lỗi lấy thống kê blockchain:', error);
    return null;
  }
}

// Tìm kiếm trong blockchain
async function searchBlockchain(criteria) {
  try {
    const blockchain = readBlockchain();
    let results = [...blockchain.chain];
    
    // Lọc theo học sinh
    if (criteria.studentId) {
      results = results.filter(block => 
        block.data.studentId === criteria.studentId
      );
    }
    
    // Lọc theo kỳ thi
    if (criteria.examId) {
      results = results.filter(block => 
        block.data.examId === criteria.examId
      );
    }
    
    // Lọc theo điểm số
    if (criteria.minScore !== undefined) {
      results = results.filter(block => 
        parseFloat(block.data.score) >= criteria.minScore
      );
    }
    
    if (criteria.maxScore !== undefined) {
      results = results.filter(block => 
        parseFloat(block.data.score) <= criteria.maxScore
      );
    }
    
    // Lọc theo thời gian
    if (criteria.fromDate) {
      results = results.filter(block => 
        new Date(block.timestamp) >= new Date(criteria.fromDate)
      );
    }
    
    if (criteria.toDate) {
      results = results.filter(block => 
        new Date(block.timestamp) <= new Date(criteria.toDate)
      );
    }
    
    // Sắp xếp kết quả
    if (criteria.sortBy) {
      results.sort((a, b) => {
        switch (criteria.sortBy) {
          case 'score_asc':
            return parseFloat(a.data.score) - parseFloat(b.data.score);
          case 'score_desc':
            return parseFloat(b.data.score) - parseFloat(a.data.score);
          case 'time_asc':
            return new Date(a.timestamp) - new Date(b.timestamp);
          case 'time_desc':
            return new Date(b.timestamp) - new Date(a.timestamp);
          default:
            return 0;
        }
      });
    }
    
    return results.map(block => ({
      ...block.data,
      hash: block.hash,
      timestamp: block.timestamp,
      blockIndex: block.blockIndex,
      merkleRoot: block.merkleRoot
    }));
    
  } catch (error) {
    console.error('Lỗi tìm kiếm blockchain:', error);
    return [];
  }
}

// Export tất cả functions
module.exports = {
  submitExamToBlockchain,
  getSubmissionFromBlockchain,
  getSubmissionById,
  getSubmissionsByStudent,
  getSubmissionsByExam,
  verifyBlockchain,
  compareSubmissionWithBlockchain,
  getBlockchainStats,
  searchBlockchain,
  backupBlockchain,
  readBlockchain,
  writeBlockchain
};