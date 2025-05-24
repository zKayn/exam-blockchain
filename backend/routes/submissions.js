// routes/submissions.js - Nâng cao với các tính năng blockchain
const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const Submission = require('../models/Submission');
const { 
  getSubmissionFromBlockchain, 
  compareSubmissionWithBlockchain,
  getSubmissionsByStudent 
} = require('../utils/blockchain-simulator');

// Lấy thông tin bài nộp của học sinh với verification blockchain
router.get('/', authMiddleware.requireAuth, async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .populate('exam', 'title duration')
      .sort({ createdAt: -1 });
    
    // Thêm thông tin xác minh blockchain cho mỗi bài nộp
    const submissionsWithVerification = await Promise.all(
      submissions.map(async (submission) => {
        let verification = null;
        
        if (submission.submitted && submission.blockchainTxId) {
          try {
            verification = await compareSubmissionWithBlockchain(submission);
          } catch (error) {
            console.error('Lỗi xác minh blockchain:', error);
            verification = {
              status: 'error',
              message: 'Lỗi khi xác minh với blockchain'
            };
          }
        }
        
        return {
          ...submission.toObject(),
          blockchainVerification: verification
        };
      })
    );
    
    return res.json({ submissions: submissionsWithVerification });
  } catch (error) {
    console.error('Lỗi lấy danh sách bài nộp:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Chi tiết bài nộp với thông tin blockchain đầy đủ
router.get('/:submissionId', authMiddleware.requireAuth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId)
      .populate('exam', 'title duration questions')
      .populate('student', 'studentId name');
    
    if (!submission) {
      return res.status(404).json({ message: 'Không tìm thấy bài nộp' });
    }
    
    // Kiểm tra quyền truy cập
    if (
      submission.student._id.toString() !== req.user._id.toString() && 
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }
    
    let blockchainData = null;
    let verification = null;
    
    // Lấy thông tin từ blockchain nếu có
    if (submission.submitted && submission.blockchainTxId) {
      try {
        blockchainData = await getSubmissionFromBlockchain(submission.blockchainTxId);
        verification = await compareSubmissionWithBlockchain(submission);
      } catch (error) {
        console.error('Lỗi lấy dữ liệu blockchain:', error);
        verification = {
          status: 'error',
          message: 'Không thể kết nối với blockchain'
        };
      }
    }
    
    return res.json({ 
      submission: submission.toObject(),
      blockchain: blockchainData,
      verification
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết bài nộp:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// So sánh kết quả database vs blockchain cho sinh viên
router.get('/:submissionId/compare-blockchain', authMiddleware.requireAuth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId)
      .populate('exam', 'title questions');
    
    if (!submission) {
      return res.status(404).json({ message: 'Không tìm thấy bài nộp' });
    }
    
    // Kiểm tra quyền truy cập - chỉ sinh viên sở hữu hoặc admin
    if (
      submission.student.toString() !== req.user._id.toString() && 
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }
    
    if (!submission.submitted) {
      return res.status(400).json({ message: 'Bài nộp chưa được submit' });
    }
    
    if (!submission.blockchainTxId) {
      return res.status(400).json({ message: 'Bài nộp không có dữ liệu blockchain' });
    }
    
    // Lấy dữ liệu từ blockchain
    const blockchainData = await getSubmissionFromBlockchain(submission.blockchainTxId);
    
    if (!blockchainData) {
      return res.status(404).json({ message: 'Không tìm thấy dữ liệu trên blockchain' });
    }
    
    // So sánh chi tiết
    const verification = await compareSubmissionWithBlockchain(submission);
    
    // Tạo bảng so sánh dễ đọc
    const comparison = {
      submissionId: {
        database: submission._id.toString(),
        blockchain: blockchainData.submissionId,
        match: submission._id.toString() === blockchainData.submissionId
      },
      score: {
        database: submission.score,
        blockchain: parseFloat(blockchainData.score),
        match: Math.abs(submission.score - parseFloat(blockchainData.score)) < 0.01
      },
      correctAnswers: {
        database: submission.correctAnswers,
        blockchain: blockchainData.correctAnswers,
        match: submission.correctAnswers === blockchainData.correctAnswers
      },
      totalQuestions: {
        database: submission.totalQuestions,
        blockchain: blockchainData.totalQuestions,
        match: submission.totalQuestions === blockchainData.totalQuestions
      },
      timestamp: {
        database: submission.createdAt,
        blockchain: blockchainData.timestamp,
        timeDifference: Math.abs(new Date(submission.createdAt) - new Date(blockchainData.timestamp))
      }
    };
    
    // So sánh từng câu trả lời
    const answerComparison = [];
    if (submission.answers && blockchainData.answers) {
      for (let i = 0; i < Math.max(submission.answers.length, blockchainData.answers.length); i++) {
        const dbAnswer = submission.answers[i];
        const bcAnswer = blockchainData.answers[i];
        
        answerComparison.push({
          questionIndex: i,
          question: submission.exam.questions[i]?.content.substring(0, 100) + '...',
          database: dbAnswer ? {
            selectedOption: dbAnswer.selectedOption,
            isCorrect: dbAnswer.isCorrect
          } : null,
          blockchain: bcAnswer ? {
            selectedOption: bcAnswer.selectedOption,
            isCorrect: bcAnswer.isCorrect
          } : null,
          match: dbAnswer && bcAnswer ? 
            (dbAnswer.selectedOption === bcAnswer.selectedOption && dbAnswer.isCorrect === bcAnswer.isCorrect) : 
            false
        });
      }
    }
    
    return res.json({
      exam: {
        title: submission.exam.title,
        totalQuestions: submission.exam.questions.length
      },
      verification,
      comparison,
      answerComparison,
      blockchainHash: blockchainData.hash,
      blockchainIndex: blockchainData.blockIndex,
      summary: {
        isFullyConsistent: verification.status === 'consistent',
        hasBlockchainData: true,
        verificationMessage: verification.message
      }
    });
  } catch (error) {
    console.error('Lỗi so sánh với blockchain:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Lấy lịch sử blockchain của sinh viên
router.get('/student/:studentId/blockchain-history', authMiddleware.requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Kiểm tra quyền truy cập - chỉ chính sinh viên đó hoặc admin
    if (req.user.studentId !== studentId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }
    
    // Lấy dữ liệu từ blockchain
    const blockchainHistory = await getSubmissionsByStudent(studentId);
    
    // Lấy dữ liệu từ database để so sánh
    const dbSubmissions = await Submission.find({ 
      student: req.user._id 
    }).populate('exam', 'title');
    
    // Kết hợp dữ liệu
    const combinedHistory = blockchainHistory.map(bcData => {
      const dbData = dbSubmissions.find(db => 
        db._id.toString() === bcData.submissionId
      );
      
      return {
        submissionId: bcData.submissionId,
        examTitle: dbData ? dbData.exam.title : 'Không rõ',
        score: {
          blockchain: parseFloat(bcData.score),
          database: dbData ? dbData.score : null,
          consistent: dbData ? Math.abs(dbData.score - parseFloat(bcData.score)) < 0.01 : false
        },
        correctAnswers: {
          blockchain: bcData.correctAnswers,
          database: dbData ? dbData.correctAnswers : null,
          consistent: dbData ? dbData.correctAnswers === bcData.correctAnswers : false
        },
        timestamp: bcData.timestamp,
        blockIndex: bcData.blockIndex,
        hash: bcData.hash,
        hasDbRecord: !!dbData
      };
    });
    
    // Thống kê
    const stats = {
      totalOnBlockchain: blockchainHistory.length,
      totalInDatabase: dbSubmissions.length,
      consistentRecords: combinedHistory.filter(h => h.score.consistent && h.correctAnswers.consistent).length,
      averageBlockchainScore: blockchainHistory.length > 0 ? 
        (blockchainHistory.reduce((sum, s) => sum + parseFloat(s.score), 0) / blockchainHistory.length).toFixed(2) : 0
    };
    
    return res.json({
      studentId,
      history: combinedHistory,
      stats
    });
  } catch (error) {
    console.error('Lỗi lấy lịch sử blockchain:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Xác minh tính toàn vẹn của một bài nộp
router.post('/:submissionId/verify-integrity', authMiddleware.requireAuth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId)
      .populate('exam', 'title questions');
    
    if (!submission) {
      return res.status(404).json({ message: 'Không tìm thấy bài nộp' });
    }
    
    // Kiểm tra quyền truy cập
    if (
      submission.student.toString() !== req.user._id.toString() && 
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }
    
    if (!submission.submitted || !submission.blockchainTxId) {
      return res.status(400).json({ 
        message: 'Bài nộp chưa được submit hoặc không có dữ liệu blockchain',
        hasBlockchainData: false
      });
    }
    
    // Thực hiện xác minh toàn diện
    const verification = await compareSubmissionWithBlockchain(submission);
    const blockchainData = await getSubmissionFromBlockchain(submission.blockchainTxId);
    
    // Kiểm tra tính toàn vẹn của dữ liệu
    const integrityChecks = {
      blockchainDataExists: !!blockchainData,
      scoresMatch: verification.discrepancies ? 
        !verification.discrepancies.some(d => d.field === 'score') : true,
      answersMatch: verification.discrepancies ? 
        !verification.discrepancies.some(d => d.field.startsWith('answer')) : true,
      timestampReasonable: blockchainData ? 
        Math.abs(new Date(submission.createdAt) - new Date(blockchainData.timestamp)) < 60000 : false, // 1 phút
      hashValid: blockchainData ? blockchainData.hash && blockchainData.hash.length === 64 : false
    };
    
    const overallIntegrity = Object.values(integrityChecks).every(check => check);
    
    return res.json({
      submissionId: submission._id,
      examTitle: submission.exam.title,
      verification,
      integrityChecks,
      overallIntegrity,
      recommendation: overallIntegrity ? 
        'Dữ liệu toàn vẹn và đáng tin cậy' : 
        'Phát hiện bất thường trong dữ liệu',
      blockchainHash: blockchainData ? blockchainData.hash : null,
      verificationTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Lỗi xác minh tính toàn vẹn:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

module.exports = router;