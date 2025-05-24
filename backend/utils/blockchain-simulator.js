// backend/utils/blockchain-simulator.js - THÊM CÁC FUNCTIONS THIẾU
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Tạo đường dẫn đến file lưu trữ blockchain
const BLOCKCHAIN_FILE = path.join(__dirname, '../data/blockchain.json');
const BLOCKCHAIN_BACKUP_DIR = path.join(__dirname, '../data/backups');

// EMERGENCY: Đảm bảo thư mục và file tồn tại
function ensureBlockchainFile() {
  try {
    // Tạo thư mục data nếu chưa có
    if (!fs.existsSync(path.dirname(BLOCKCHAIN_FILE))) {
      fs.mkdirSync(path.dirname(BLOCKCHAIN_FILE), { recursive: true });
      console.log('✅ Đã tạo thư mục data');
    }

    // Tạo thư mục backup nếu chưa có
    if (!fs.existsSync(BLOCKCHAIN_BACKUP_DIR)) {
      fs.mkdirSync(BLOCKCHAIN_BACKUP_DIR, { recursive: true });
      console.log('✅ Đã tạo thư mục backups');
    }

    // Kiểm tra file blockchain
    if (!fs.existsSync(BLOCKCHAIN_FILE)) {
      const initialData = {
        chain: [],
        metadata: {
          version: '1.0.0',
          created: new Date().toISOString(),
          lastModified: new Date().toISOString()
        }
      };
      fs.writeFileSync(BLOCKCHAIN_FILE, JSON.stringify(initialData, null, 2));
      console.log('✅ Đã tạo file blockchain mới');
    }

    return true;
  } catch (error) {
    console.error('❌ Lỗi tạo file blockchain:', error);
    return false;
  }
}

// Đọc blockchain an toàn
function readBlockchain() {
  try {
    // Đảm bảo file tồn tại
    ensureBlockchainFile();
    
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
    console.error('❌ Lỗi đọc blockchain, tạo mới:', error);
    
    // Tạo blockchain mới nếu có lỗi
    const newBlockchain = { 
      chain: [],
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    };
    
    try {
      fs.writeFileSync(BLOCKCHAIN_FILE, JSON.stringify(newBlockchain, null, 2));
      console.log('✅ Đã tạo blockchain mới');
    } catch (writeError) {
      console.error('❌ Không thể tạo blockchain mới:', writeError);
    }
    
    return newBlockchain;
  }
}

// Hàm tính hash của block
function calculateHash(data, previousHash, timestamp) {
  return crypto.createHash('sha256')
    .update(previousHash + JSON.stringify(data) + timestamp)
    .digest('hex');
}

// Ghi blockchain an toàn
function writeBlockchain(blockchain) {
  try {
    // Đảm bảo thư mục tồn tại
    ensureBlockchainFile();
    
    // Cập nhật metadata
    blockchain.metadata = blockchain.metadata || {};
    blockchain.metadata.lastModified = new Date().toISOString();
    blockchain.metadata.totalBlocks = blockchain.chain.length;
    
    fs.writeFileSync(BLOCKCHAIN_FILE, JSON.stringify(blockchain, null, 2));
    console.log('✅ Ghi blockchain thành công');
    return true;
  } catch (error) {
    console.error('❌ Lỗi ghi blockchain:', error);
    return false;
  }
}

// Hàm nộp bài lên blockchain 
async function submitExamToBlockchain(submissionId, studentId, examId, answers, correctAnswers, totalQuestions, score) {
  try {
    console.log(`📝 Lưu kết quả lên blockchain: ${submissionId}`);
    
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
      nonce: Math.floor(Math.random() * 1000000),
      merkleRoot: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
    };
    
    // Thêm block vào chain
    blockchain.chain.push(newBlock);
    
    // Lưu blockchain
    const saved = writeBlockchain(blockchain);
    
    if (!saved) {
      throw new Error('Không thể lưu blockchain');
    }
    
    console.log('✅ Lưu blockchain thành công');
    
    return {
      success: true,
      txId: hash,
      timestamp: data.timestamp,
      blockIndex: newBlock.blockIndex,
      merkleRoot: newBlock.merkleRoot
    };
  } catch (error) {
    console.error(`❌ Lỗi lưu kết quả lên blockchain: ${error}`);
    throw error;
  }
}

// Lấy kết quả bài thi từ blockchain theo txId - FIXED
async function getSubmissionFromBlockchain(txId) {
  try {
    console.log(`🔍 Tìm submission với txId: ${txId}`);
    
    const blockchain = readBlockchain();
    
    // Tìm block với hash tương ứng
    const block = blockchain.chain.find(block => block.hash === txId);
    
    if (!block) {
      console.log(`❌ Không tìm thấy block với hash: ${txId}`);
      return null;
    }
    
    console.log(`✅ Tìm thấy block với hash: ${txId}`);
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
    console.error(`❌ Lỗi lấy kết quả từ blockchain: ${error}`);
    return null;
  }
}

// Lấy bài nộp theo submissionId - THÊM FUNCTION NÀY
async function getSubmissionById(submissionId) {
  try {
    console.log(`🔍 Tìm submission với ID: ${submissionId}`);
    
    const blockchain = readBlockchain();
    
    // Tìm block chứa submission
    const block = blockchain.chain.find(block => 
      block.data && block.data.submissionId === submissionId
    );
    
    if (!block) {
      console.log(`❌ Không tìm thấy bài nộp với ID: ${submissionId}`);
      return null;
    }
    
    console.log(`✅ Tìm thấy submission với ID: ${submissionId}`);
    return {
      ...block.data,
      hash: block.hash,
      timestamp: block.timestamp,
      blockIndex: block.blockIndex,
      previousHash: block.previousHash,
      merkleRoot: block.merkleRoot
    };
  } catch (error) {
    console.error(`❌ Lỗi lấy kết quả từ blockchain: ${error}`);
    return null;
  }
}

// Lấy tất cả bài nộp của một học sinh từ blockchain - THÊM FUNCTION NÀY
async function getSubmissionsByStudent(studentId) {
  try {
    console.log(`🔍 Tìm submissions của học sinh: ${studentId}`);
    
    const blockchain = readBlockchain();
    
    const studentSubmissions = blockchain.chain
      .filter(block => block.data && block.data.studentId === studentId)
      .map(block => ({
        ...block.data,
        hash: block.hash,
        timestamp: block.timestamp,
        blockIndex: block.blockIndex,
        merkleRoot: block.merkleRoot
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    console.log(`✅ Tìm thấy ${studentSubmissions.length} submissions của học sinh ${studentId}`);
    return studentSubmissions;
  } catch (error) {
    console.error(`❌ Lỗi lấy bài nộp của học sinh: ${error}`);
    return [];
  }
}

// Lấy tất cả bài nộp của một kỳ thi từ blockchain - THÊM FUNCTION NÀY
async function getSubmissionsByExam(examId) {
  try {
    console.log(`🔍 Tìm submissions của kỳ thi: ${examId}`);
    
    const blockchain = readBlockchain();
    
    const examSubmissions = blockchain.chain
      .filter(block => block.data && block.data.examId === examId)
      .map(block => ({
        ...block.data,
        hash: block.hash,
        timestamp: block.timestamp,
        blockIndex: block.blockIndex,
        merkleRoot: block.merkleRoot
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    console.log(`✅ Tìm thấy ${examSubmissions.length} submissions của kỳ thi ${examId}`);
    return examSubmissions;
  } catch (error) {
    console.error(`❌ Lỗi lấy bài nộp của kỳ thi: ${error}`);
    return [];
  }
}

// Xác minh tính toàn vẹn của blockchain - FIXED
function verifyBlockchain() {
  try {
    console.log('🔍 Bắt đầu xác minh blockchain...');
    
    const blockchain = readBlockchain();
    
    if (!blockchain || !blockchain.chain) {
      console.log('⚠️  Blockchain rỗng hoặc không hợp lệ');
      return {
        valid: true,
        message: 'Blockchain rỗng - hợp lệ',
        blockCount: 0,
        details: [],
        error: null
      };
    }

    if (blockchain.chain.length === 0) {
      console.log('✅ Blockchain rỗng - hợp lệ');
      return {
        valid: true,
        message: 'Blockchain rỗng - hợp lệ',
        blockCount: 0,
        details: [],
        error: null
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
      
      try {
        // Kiểm tra cấu trúc block cơ bản
        if (!currentBlock.data || !currentBlock.hash || !currentBlock.timestamp) {
          blockDetails.valid = false;
          blockDetails.issues.push('Block thiếu dữ liệu cần thiết');
          isValid = false;
        }
        
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
            blockDetails.issues.push('previousHash không khớp với hash của block trước');
            isValid = false;
          }
        }
        
        // Kiểm tra hash hợp lệ
        if (!currentBlock.hash || currentBlock.hash.length !== 64) {
          blockDetails.valid = false;
          blockDetails.issues.push('Hash không hợp lệ');
          isValid = false;
        }
        
        // Kiểm tra blockIndex
        if (currentBlock.blockIndex !== undefined && currentBlock.blockIndex !== i) {
          blockDetails.valid = false;
          blockDetails.issues.push(`blockIndex không đúng: expected ${i}, got ${currentBlock.blockIndex}`);
          isValid = false;
        }
        
      } catch (blockError) {
        console.error(`❌ Lỗi kiểm tra block ${i}:`, blockError);
        blockDetails.valid = false;
        blockDetails.issues.push(`Lỗi kiểm tra: ${blockError.message}`);
        isValid = false;
      }
      
      details.push(blockDetails);
    }
    
    const result = {
      valid: isValid,
      message: isValid ? 'Blockchain hợp lệ' : 'Blockchain có lỗi',
      blockCount: blockchain.chain.length,
      details,
      metadata: blockchain.metadata,
      firstBlock: blockchain.chain[0]?.timestamp,
      lastBlock: blockchain.chain[blockchain.chain.length - 1]?.timestamp,
      error: null
    };
    
    console.log(`✅ Xác minh hoàn tất: ${isValid ? 'HỢP LỆ' : 'CÓ LỖI'}`);
    return result;
    
  } catch (error) {
    console.error('❌ Lỗi xác minh blockchain:', error);
    return {
      valid: false,
      message: `Lỗi xác minh: ${error.message}`,
      blockCount: 0,
      details: [],
      error: error.message
    };
  }
}

// So sánh dữ liệu submission với blockchain - FIXED
async function compareSubmissionWithBlockchain(submission) {
  try {
    console.log(`🔍 So sánh submission ${submission._id} với blockchain...`);
    
    if (!submission.blockchainTxId) {
      return {
        status: 'no_blockchain_data',
        message: 'Bài nộp không có dữ liệu blockchain',
        consistent: false,
        discrepancies: [],
        error: null
      };
    }
    
    const blockchainData = await getSubmissionFromBlockchain(submission.blockchainTxId);
    
    if (!blockchainData) {
      return {
        status: 'blockchain_not_found',
        message: 'Không tìm thấy dữ liệu trên blockchain',
        consistent: false,
        discrepancies: [],
        error: null
      };
    }
    
    // So sánh các trường quan trọng
    const discrepancies = [];
    
    try {
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
    } catch (compareError) {
      console.error('❌ Lỗi so sánh dữ liệu:', compareError);
      return {
        status: 'error',
        message: `Lỗi so sánh: ${compareError.message}`,
        consistent: false,
        discrepancies: [],
        error: compareError.message
      };
    }
    
    const isConsistent = discrepancies.length === 0;
    
    const result = {
      status: isConsistent ? 'consistent' : 'inconsistent',
      message: isConsistent ? 
        'Dữ liệu nhất quán giữa database và blockchain' : 
        `Phát hiện ${discrepancies.length} sự không nhất quán`,
      consistent: isConsistent,
      discrepancies,
      blockchainHash: blockchainData.hash,
      blockchainTimestamp: blockchainData.timestamp,
      blockchainIndex: blockchainData.blockIndex,
      merkleRoot: blockchainData.merkleRoot,
      error: null
    };
    
    console.log(`✅ So sánh hoàn tất: ${isConsistent ? 'NHẤT QUÁN' : 'KHÔNG NHẤT QUÁN'}`);
    return result;
    
  } catch (error) {
    console.error('❌ Lỗi so sánh dữ liệu:', error);
    return {
      status: 'error',
      message: `Lỗi so sánh: ${error.message}`,
      consistent: false,
      discrepancies: [],
      error: error.message
    };
  }
}

// Lấy thống kê blockchain - FIXED
function getBlockchainStats() {
  try {
    console.log('📊 Lấy thống kê blockchain...');
    
    const blockchain = readBlockchain();
    const blocks = blockchain.chain || [];
    
    if (blocks.length === 0) {
      console.log('📊 Blockchain rỗng, trả về stats mặc định');
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
        totalStorage: '0 KB',
        metadata: blockchain.metadata || {}
      };
    }
    
    const students = new Set();
    const exams = new Set();
    const scores = [];
    let totalCorrectAnswers = 0;
    let totalQuestions = 0;
    
    blocks.forEach(block => {
      try {
        if (block.data) {
          students.add(block.data.studentId);
          exams.add(block.data.examId);
          const score = parseFloat(block.data.score);
          if (!isNaN(score)) {
            scores.push(score);
          }
          
          if (block.data.correctAnswers) {
            totalCorrectAnswers += block.data.correctAnswers;
          }
          if (block.data.totalQuestions) {
            totalQuestions += block.data.totalQuestions;
          }
        }
      } catch (blockError) {
        console.error('❌ Lỗi xử lý block:', blockError);
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
    
    const result = {
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
      metadata: blockchain.metadata || {}
    };
    
    console.log('✅ Thống kê blockchain hoàn tất');
    return result;
    
  } catch (error) {
    console.error('❌ Lỗi lấy thống kê blockchain:', error);
    return {
      totalBlocks: 0,
      totalSubmissions: 0,
      uniqueStudents: 0,
      uniqueExams: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      totalCorrectAnswers: 0,
      totalQuestions: 0,
      accuracyRate: 0,
      createdAt: null,
      lastUpdated: null,
      totalStorage: '0 KB',
      metadata: {},
      error: error.message
    };
  }
}

// Tìm kiếm trong blockchain - FIXED
async function searchBlockchain(criteria) {
  try {
    console.log('🔍 Tìm kiếm blockchain với criteria:', criteria);
    
    const blockchain = readBlockchain();
    let results = [...blockchain.chain];
    
    // Lọc theo học sinh
    if (criteria.studentId) {
      results = results.filter(block => 
        block.data && block.data.studentId === criteria.studentId
      );
    }
    
    // Lọc theo kỳ thi
    if (criteria.examId) {
      results = results.filter(block => 
        block.data && block.data.examId === criteria.examId
      );
    }
    
    // Lọc theo điểm số
    if (criteria.minScore !== undefined) {
      results = results.filter(block => 
        block.data && parseFloat(block.data.score) >= criteria.minScore
      );
    }
    
    if (criteria.maxScore !== undefined) {
      results = results.filter(block => 
        block.data && parseFloat(block.data.score) <= criteria.maxScore
      );
    }
    
    // Lọc theo thời gian
    if (criteria.fromDate) {
      results = results.filter(block => 
        block.timestamp && new Date(block.timestamp) >= new Date(criteria.fromDate)
      );
    }
    
    if (criteria.toDate) {
      results = results.filter(block => 
        block.timestamp && new Date(block.timestamp) <= new Date(criteria.toDate)
      );
    }
    
    // Sắp xếp kết quả
    if (criteria.sortBy) {
      results.sort((a, b) => {
        switch (criteria.sortBy) {
          case 'score_asc':
            return parseFloat(a.data?.score || 0) - parseFloat(b.data?.score || 0);
          case 'score_desc':
            return parseFloat(b.data?.score || 0) - parseFloat(a.data?.score || 0);
          case 'time_asc':
            return new Date(a.timestamp) - new Date(b.timestamp);
          case 'time_desc':
            return new Date(b.timestamp) - new Date(a.timestamp);
          default:
            return 0;
        }
      });
    }
    
    const mappedResults = results.map(block => ({
      ...block.data,
      hash: block.hash,
      timestamp: block.timestamp,
      blockIndex: block.blockIndex,
      merkleRoot: block.merkleRoot
    }));
    
    console.log(`✅ Tìm kiếm hoàn tất, ${mappedResults.length} kết quả`);
    return mappedResults;
    
  } catch (error) {
    console.error('❌ Lỗi tìm kiếm blockchain:', error);
    return [];
  }
}

// Backup blockchain
function backupBlockchain() {
  try {
    console.log('💾 Đang backup blockchain...');
    
    ensureBlockchainFile();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BLOCKCHAIN_BACKUP_DIR, `blockchain-backup-${timestamp}.json`);
    
    if (fs.existsSync(BLOCKCHAIN_FILE)) {
      fs.copyFileSync(BLOCKCHAIN_FILE, backupFile);
      console.log(`✅ Blockchain đã được backup tại: ${backupFile}`);
      return true;
    } else {
      console.log('⚠️  File blockchain không tồn tại để backup');
      return false;
    }
  } catch (error) {
    console.error('❌ Lỗi backup blockchain:', error);
    return false;
  }
}

// Export tất cả functions - THÊM CÁC FUNCTIONS THIẾU
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
  writeBlockchain,
  ensureBlockchainFile
};