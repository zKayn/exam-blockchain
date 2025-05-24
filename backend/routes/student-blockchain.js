// routes/student-blockchain.js - Routes mới cho sinh viên kiểm tra blockchain
const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const Submission = require('../models/Submission');
const { 
  getSubmissionFromBlockchain, 
  compareSubmissionWithBlockchain,
  getSubmissionsByStudent
} = require('../utils/blockchain-simulator');

// Lấy tất cả kết quả của sinh viên từ blockchain
router.get('/my-blockchain-results', authMiddleware.requireAuth, async (req, res) => {
  try {
    // Lấy dữ liệu từ blockchain
    const blockchainResults = await getSubmissionsByStudent(req.user.studentId);
    
    // Lấy dữ liệu từ database
    const dbSubmissions = await Submission.find({ 
      student: req.user._id,
      submitted: true 
    }).populate('exam', 'title duration');
    
    // Kết hợp dữ liệu
    const combinedResults = dbSubmissions.map(dbSub => {
      const blockchainData = blockchainResults.find(
        bc => bc.submissionId === dbSub._id.toString()
      );
      
      return {
        submission: {
          _id: dbSub._id,
          exam: dbSub.exam,
          score: dbSub.score,
          correctAnswers: dbSub.correctAnswers,
          totalQuestions: dbSub.totalQuestions,
          createdAt: dbSub.createdAt,
          blockchainTxId: dbSub.blockchainTxId
        },
        blockchain: blockchainData,
        hasBlockchainData: !!blockchainData
      };
    });
    
    return res.json({
      student: {
        studentId: req.user.studentId,
        name: req.user.name
      },
      results: combinedResults,
      summary: {
        totalSubmissions: dbSubmissions.length,
        onBlockchain: blockchainResults.length,
        averageScore: dbSubmissions.length > 0 ? 
          (dbSubmissions.reduce((sum, sub) => sum + sub.score, 0) / dbSubmissions.length).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Lỗi lấy kết quả blockchain:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Xác minh một bài nộp cụ thể với blockchain
router.get('/verify-submission/:submissionId', authMiddleware.requireAuth, async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    
    if (!submissionId || !submissionId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID bài nộp không hợp lệ' });
    }
    
    // Tìm bài nộp và kiểm tra quyền sở hữu
    const submission = await Submission.findOne({
      _id: submissionId,
      student: req.user._id,
      submitted: true
    }).populate('exam', 'title questions');
    
    if (!submission) {
      return res.status(404).json({ message: 'Không tìm thấy bài nộp hoặc bạn không có quyền truy cập' });
    }
    
    // So sánh với blockchain
    const verification = await compareSubmissionWithBlockchain(submission);
    
    // Lấy dữ liệu chi tiết từ blockchain
    let blockchainData = null;
    if (submission.blockchainTxId) {
      blockchainData = await getSubmissionFromBlockchain(submission.blockchainTxId);
    }
    
    return res.json({
      submission: {
        _id: submission._id,
        exam: {
          title: submission.exam.title,
          totalQuestions: submission.exam.questions.length
        },
        score: submission.score,
        correctAnswers: submission.correctAnswers,
        totalQuestions: submission.totalQuestions,
        answers: submission.answers,
        createdAt: submission.createdAt,
        blockchainTxId: submission.blockchainTxId
      },
      blockchain: blockchainData,
      verification
    });
  } catch (error) {
    console.error('Lỗi xác minh bài nộp:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Lấy chi tiết kết quả từ blockchain
router.get('/blockchain-result/:txId', authMiddleware.requireAuth, async (req, res) => {
  try {
    const txId = req.params.txId;
    
    if (!txId) {
      return res.status(400).json({ message: 'Thiếu transaction ID' });
    }
    
    // Lấy dữ liệu từ blockchain
    const blockchainData = await getSubmissionFromBlockchain(txId);
    
    if (!blockchainData) {
      return res.status(404).json({ message: 'Không tìm thấy dữ liệu trên blockchain' });
    }
    
    // Kiểm tra quyền truy cập - chỉ cho phép sinh viên xem dữ liệu của chính mình
    if (blockchainData.studentId !== req.user.studentId) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập dữ liệu này' });
    }
    
    // Tìm thông tin kỳ thi tương ứng
    const submission = await Submission.findById(blockchainData.submissionId)
      .populate('exam', 'title');
    
    return res.json({
      blockchain: blockchainData,
      exam: submission ? submission.exam : null,
      verified: true,
      message: 'Dữ liệu được xác thực từ blockchain'
    });
  } catch (error) {
    console.error('Lỗi lấy dữ liệu blockchain:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// So sánh điểm số giữa database và blockchain
router.get('/compare-scores', authMiddleware.requireAuth, async (req, res) => {
  try {
    // Lấy tất cả bài nộp của sinh viên
    const submissions = await Submission.find({ 
      student: req.user._id,
      submitted: true 
    }).populate('exam', 'title');
    
    const comparisons = [];
    
    for (const submission of submissions) {
      const verification = await compareSubmissionWithBlockchain(submission);
      
      let blockchainScore = null;
      if (submission.blockchainTxId) {
        const blockchainData = await getSubmissionFromBlockchain(submission.blockchainTxId);
        if (blockchainData) {
          blockchainScore = parseFloat(blockchainData.score);
        }
      }
      
      comparisons.push({
        exam: submission.exam.title,
        submissionId: submission._id,
        databaseScore: submission.score,
        blockchainScore,
        isConsistent: verification.status === 'consistent',
        verification: verification.message,
        createdAt: submission.createdAt
      });
    }
    
    // Thống kê
    const consistent = comparisons.filter(c => c.isConsistent).length;
    const hasBlockchain = comparisons.filter(c => c.blockchainScore !== null).length;
    
    return res.json({
      student: {
        studentId: req.user.studentId,
        name: req.user.name
      },
      comparisons,
      summary: {
        totalSubmissions: comparisons.length,
        consistentResults: consistent,
        resultsOnBlockchain: hasBlockchain,
        consistencyRate: comparisons.length > 0 ? 
          (consistent / comparisons.length * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Lỗi so sánh điểm số:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

module.exports = router;