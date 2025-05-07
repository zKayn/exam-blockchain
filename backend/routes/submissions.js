// routes/submissions.js
const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const Submission = require('../models/Submission');
const { getSubmissionFromBlockchain } = require('../utils/blockchain-simulator');

// Lấy thông tin bài nộp của học sinh
router.get('/', authMiddleware.requireAuth, async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .populate('exam', 'title duration')
      .sort({ createdAt: -1 });
    
    return res.json({ submissions });
  } catch (error) {
    console.error('Lỗi lấy danh sách bài nộp:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Chi tiết bài nộp
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
    
    return res.json({ submission });
  } catch (error) {
    console.error('Lỗi lấy chi tiết bài nộp:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

module.exports = router;