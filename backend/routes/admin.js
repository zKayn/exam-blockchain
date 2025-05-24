// routes/admin.js - SỬA LỖI NULL EXAM TITLE
const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const Exam = require('../models/Exam');
const User = require('../models/User');
const Submission = require('../models/Submission');
const { 
  getSubmissionFromBlockchain, 
  verifyBlockchain, 
  compareSubmissionWithBlockchain,
  getBlockchainStats,
  getSubmissionsByStudent,
  getSubmissionsByExam 
} = require('../utils/blockchain-simulator');

// Dashboard thống kê với blockchain
router.get('/dashboard', async (req, res) => {
  try {
    const totalExams = await Exam.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const activeExams = await Exam.countDocuments({ 
      isActive: true,
      endTime: { $gte: new Date() }
    });
    const submissions = await Submission.countDocuments({ submitted: true });
    
    // Thống kê blockchain
    const blockchainStats = getBlockchainStats();
    
    return res.json({
      stats: {
        totalExams,
        totalStudents,
        activeExams,
        submissions
      },
      blockchain: blockchainStats
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// =============== BLOCKCHAIN ROUTES - ĐẶT TRƯỚC CÁC ROUTES KHÁC ===============

// Xác minh tính toàn vẹn blockchain - PHẢI ĐẶT TRƯỚC route /:txId
router.get('/blockchain/verify-integrity', async (req, res) => {
  try {
    console.log('🔍 Đang xác minh tính toàn vẹn blockchain...');
    const verification = verifyBlockchain();
    
    // Lấy thêm thống kê chi tiết
    const stats = getBlockchainStats();
    
    return res.json({
      verification,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Lỗi kiểm tra blockchain:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// So sánh toàn bộ dữ liệu database với blockchain - FIXED NULL CHECK
router.get('/blockchain/compare-all', async (req, res) => {
  try {
    console.log('🔄 Đang so sánh toàn bộ dữ liệu...');
    
    // Lấy submissions với populate và xử lý null exam
    const submissions = await Submission.find({ 
      submitted: true,
      exam: { $ne: null } // Chỉ lấy submission có exam không null
    })
    .populate('student', 'studentId name')
    .populate('exam', 'title')
    .sort({ createdAt: -1 });
    
    console.log(`📊 Tìm thấy ${submissions.length} submissions hợp lệ`);
    
    const comparisons = [];
    
    for (const submission of submissions) {
      try {
        // Kiểm tra null safety
        if (!submission.exam || !submission.student) {
          console.log(`⚠️  Bỏ qua submission ${submission._id}: thiếu exam hoặc student`);
          continue;
        }
        
        const comparison = await compareSubmissionWithBlockchain(submission);
        
        comparisons.push({
          submissionId: submission._id,
          student: {
            studentId: submission.student.studentId || 'Unknown',
            name: submission.student.name || 'Unknown'
          },
          exam: submission.exam.title || 'Unknown Exam', // Null check
          score: submission.score || 0,
          blockchainTxId: submission.blockchainTxId || null,
          verification: comparison
        });
        
      } catch (submissionError) {
        console.error(`❌ Lỗi xử lý submission ${submission._id}:`, submissionError);
        
        // Vẫn thêm vào results nhưng với trạng thái lỗi
        comparisons.push({
          submissionId: submission._id,
          student: {
            studentId: submission.student?.studentId || 'Unknown',
            name: submission.student?.name || 'Unknown'
          },
          exam: submission.exam?.title || 'Error Loading Exam',
          score: submission.score || 0,
          blockchainTxId: submission.blockchainTxId || null,
          verification: {
            status: 'error',
            message: `Lỗi xử lý: ${submissionError.message}`,
            consistent: false,
            error: submissionError.message
          }
        });
      }
    }
    
    // Thống kê tổng quan với null check
    const consistent = comparisons.filter(c => c.verification?.status === 'consistent').length;
    const inconsistent = comparisons.filter(c => c.verification?.status === 'inconsistent').length;
    const errors = comparisons.filter(c => c.verification?.status === 'error').length;
    const noBlockchain = comparisons.filter(c => c.verification?.status === 'no_blockchain_data').length;
    
    const result = {
      summary: {
        total: comparisons.length,
        consistent,
        inconsistent,
        errors,
        noBlockchain,
        consistencyRate: comparisons.length > 0 ? (consistent / comparisons.length * 100).toFixed(2) : '0.00'
      },
      comparisons
    };
    
    console.log(`✅ So sánh hoàn tất: ${consistent}/${comparisons.length} nhất quán`);
    return res.json(result);
    
  } catch (error) {
    console.error('❌ Lỗi so sánh toàn bộ dữ liệu:', error);
    return res.status(500).json({ 
      message: 'Lỗi máy chủ', 
      error: error.message,
      summary: {
        total: 0,
        consistent: 0,
        inconsistent: 0,
        errors: 1,
        noBlockchain: 0,
        consistencyRate: '0.00'
      },
      comparisons: []
    });
  }
});

// Lấy chi tiết block từ blockchain theo txId - ĐẶT SAU CÁC ROUTES CỤ THỂ
router.get('/blockchain/blocks/:txId', async (req, res) => {
  try {
    const txId = req.params.txId;
    
    if (!txId) {
      return res.status(400).json({ message: 'Thiếu transaction ID' });
    }
    
    console.log(`🔍 Đang lấy block với txId: ${txId}`);
    const blockData = await getSubmissionFromBlockchain(txId);
    
    if (!blockData) {
      return res.status(404).json({ message: 'Không tìm thấy block với transaction ID này' });
    }
    
    return res.json({
      block: blockData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết block:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// =============== EXISTING ADMIN ROUTES ===============

// Lấy danh sách tất cả kỳ thi (cho admin)
router.get('/exams', async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    return res.json({ exams });
  } catch (error) {
    console.error('Lỗi lấy danh sách kỳ thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Lấy chi tiết kỳ thi (admin)
router.get('/exams/:examId', async (req, res) => {
  try {
    const examId = req.params.examId;
    
    if (!examId || !examId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID kỳ thi không hợp lệ' });
    }
    
    const exam = await Exam.findById(examId);
    
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }
    
    return res.json({ exam });
  } catch (error) {
    console.error('Lỗi lấy chi tiết kỳ thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Lấy danh sách bài nộp của kỳ thi
router.get('/exams/:examId/submissions', async (req, res) => {
  try {
    const examId = req.params.examId;
    
    if (!examId || !examId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID kỳ thi không hợp lệ' });
    }
    
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }
    
    const submissions = await Submission.find({
      exam: examId
    }).populate('student', 'studentId name').sort({ createdAt: -1 });
    
    return res.json({ submissions });
  } catch (error) {
    console.error('Lỗi lấy danh sách bài nộp:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// API so sánh dữ liệu submission với blockchain - FIXED NULL CHECK
router.get('/submissions/:submissionId/verify', async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    
    if (!submissionId || !submissionId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID bài nộp không hợp lệ' });
    }
    
    const submission = await Submission.findById(submissionId)
      .populate('student', 'name studentId')
      .populate('exam', 'title');
    
    if (!submission) {
      return res.status(404).json({ message: 'Không tìm thấy bài nộp' });
    }
    
    // Null check cho exam và student
    if (!submission.exam) {
      return res.status(400).json({ 
        message: 'Bài nộp này liên kết với kỳ thi đã bị xóa',
        submission: {
          id: submission._id,
          exam: 'Kỳ thi đã bị xóa',
          score: submission.score || 0
        }
      });
    }
    
    if (!submission.student) {
      return res.status(400).json({ 
        message: 'Bài nộp này liên kết với học sinh đã bị xóa',
        submission: {
          id: submission._id,
          exam: submission.exam.title,
          student: 'Học sinh đã bị xóa'
        }
      });
    }
    
    // So sánh với blockchain
    const comparison = await compareSubmissionWithBlockchain(submission);
    
    return res.json({
      submission: {
        id: submission._id,
        student: submission.student,
        exam: submission.exam.title,
        score: submission.score,
        correctAnswers: submission.correctAnswers,
        totalQuestions: submission.totalQuestions,
        blockchainTxId: submission.blockchainTxId
      },
      verification: comparison
    });
  } catch (error) {
    console.error('Lỗi xác minh bài nộp:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// API lấy tất cả bài nộp của học sinh từ blockchain - FIXED NULL CHECK
router.get('/students/:studentId/blockchain-submissions', async (req, res) => {
  try {
    const studentId = req.params.studentId;
    
    // Kiểm tra học sinh tồn tại
    const student = await User.findOne({ studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Không tìm thấy học sinh' });
    }
    
    // Lấy dữ liệu từ blockchain
    const blockchainSubmissions = await getSubmissionsByStudent(studentId);
    
    // Lấy dữ liệu từ database để so sánh - với null check
    const dbSubmissions = await Submission.find({ student: student._id })
      .populate('exam', 'title')
      .sort({ createdAt: -1 });
    
    return res.json({
      student: {
        studentId: student.studentId,
        name: student.name
      },
      blockchain: blockchainSubmissions,
      database: dbSubmissions.map(sub => ({
        _id: sub._id,
        examTitle: sub.exam?.title || 'Kỳ thi đã bị xóa', // Null check
        score: sub.score,
        correctAnswers: sub.correctAnswers,
        totalQuestions: sub.totalQuestions,
        blockchainTxId: sub.blockchainTxId,
        createdAt: sub.createdAt
      }))
    });
  } catch (error) {
    console.error('Lỗi lấy dữ liệu blockchain của học sinh:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// API lấy tất cả bài nộp của kỳ thi từ blockchain
router.get('/exams/:examId/blockchain-submissions', async (req, res) => {
  try {
    const examId = req.params.examId;
    
    if (!examId || !examId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID kỳ thi không hợp lệ' });
    }
    
    // Kiểm tra kỳ thi tồn tại
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }
    
    // Lấy dữ liệu từ blockchain
    const blockchainSubmissions = await getSubmissionsByExam(examId);
    
    // Lấy dữ liệu từ database để so sánh
    const dbSubmissions = await Submission.find({ exam: examId })
      .populate('student', 'studentId name')
      .sort({ createdAt: -1 });
    
    return res.json({
      exam: {
        _id: exam._id,
        title: exam.title
      },
      blockchain: blockchainSubmissions,
      database: dbSubmissions.map(sub => ({
        _id: sub._id,
        student: sub.student || { studentId: 'Unknown', name: 'Unknown' }, // Null check
        score: sub.score,
        correctAnswers: sub.correctAnswers,
        totalQuestions: sub.totalQuestions,
        blockchainTxId: sub.blockchainTxId,
        createdAt: sub.createdAt
      }))
    });
  } catch (error) {
    console.error('Lỗi lấy dữ liệu blockchain của kỳ thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// =============== OTHER EXISTING ROUTES (giữ nguyên) ===============

// Cập nhật trạng thái kỳ thi
router.put('/exams/:examId/toggle-status', async (req, res) => {
  try {
    const { isActive } = req.body;
    const examId = req.params.examId;
    
    if (!examId || !examId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID kỳ thi không hợp lệ' });
    }
    
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }
    
    exam.isActive = isActive;
    await exam.save();
    
    return res.json({ message: 'Cập nhật trạng thái kỳ thi thành công', exam });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái kỳ thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Cập nhật kỳ thi
router.put('/exams/:examId', async (req, res) => {
  try {
    const { title, description, duration, startTime, endTime, questions, isActive } = req.body;
    const examId = req.params.examId;
    
    if (!examId || !examId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID kỳ thi không hợp lệ' });
    }
    
    const exam = await Exam.findById(examId);
    
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }
    
    // Kiểm tra dữ liệu hợp lệ trước khi cập nhật
    if (!title || !duration || !startTime || !endTime || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'Thiếu thông tin cần thiết' });
    }
    
    // Cập nhật thông tin kỳ thi
    exam.title = title;
    exam.description = description || '';
    exam.duration = Number(duration);
    exam.startTime = new Date(startTime);
    exam.endTime = new Date(endTime);
    
    if (isActive !== undefined) {
      exam.isActive = isActive;
    }
    
    exam.questions = questions;
    
    await exam.save();
    
    return res.json({ message: 'Cập nhật kỳ thi thành công', exam });
  } catch (error) {
    console.error('Lỗi cập nhật kỳ thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Tạo kỳ thi mới
router.post('/exams', async (req, res) => {
  try {
    const { title, description, duration, startTime, endTime, questions } = req.body;
    
    if (!title || !duration || !startTime || !endTime || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'Thiếu thông tin cần thiết' });
    }
    
    // Kiểm tra cấu trúc câu hỏi
    let invalidQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.content || !q.options || !Array.isArray(q.options) || 
          q.options.length !== 4 || q.correctAnswer === undefined) {
        invalidQuestions.push(i);
      }
    }
    
    if (invalidQuestions.length > 0) {
      return res.status(400).json({ 
        message: 'Cấu trúc câu hỏi không hợp lệ', 
        invalidQuestions 
      });
    }
    
    const exam = new Exam({
      title,
      description: description || '',
      duration: Number(duration),
      questions,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      isActive: false,
      createdAt: new Date()
    });
    
    await exam.save();
    
    return res.status(201).json({
      message: 'Tạo kỳ thi thành công',
      exam
    });
  } catch (error) {
    console.error('Lỗi tạo kỳ thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Xóa kỳ thi
router.delete('/exams/:examId', async (req, res) => {
  try {
    const examId = req.params.examId;
    
    if (!examId || !examId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID kỳ thi không hợp lệ' });
    }
    
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }
    
    const submissionCount = await Submission.countDocuments({ exam: examId });
    if (submissionCount > 0) {
      return res.status(400).json({ 
        message: 'Không thể xóa kỳ thi đã có bài nộp',
        submissionCount 
      });
    }
    
    await Exam.findByIdAndDelete(examId);
    
    return res.json({ 
      message: 'Xóa kỳ thi thành công',
      examId
    });
  } catch (error) {
    console.error('Lỗi xóa kỳ thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Lấy danh sách học sinh
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).sort({ createdAt: -1 });
    return res.json({ students });
  } catch (error) {
    console.error('Lỗi lấy danh sách học sinh:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Tạo học sinh mới
router.post('/students', async (req, res) => {
  try {
    const { studentId, name, password } = req.body;
    
    if (!studentId || !name || !password) {
      return res.status(400).json({ message: 'Thiếu thông tin học sinh' });
    }
    
    const existingStudent = await User.findOne({ studentId });
    if (existingStudent) {
      return res.status(400).json({ message: 'Mã học sinh đã tồn tại' });
    }
    
    const student = new User({
      studentId,
      name,
      password,
      role: 'student',
      createdAt: new Date()
    });
    
    await student.save();
    
    return res.status(201).json({
      message: 'Tạo học sinh thành công',
      student: {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        role: student.role,
        createdAt: student.createdAt
      }
    });
  } catch (error) {
    console.error('Lỗi tạo học sinh:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Lấy thông tin chi tiết của học sinh
router.get('/students/:studentId', async (req, res) => {
  try {
    const student = await User.findOne({ studentId: req.params.studentId, role: 'student' });
    
    if (!student) {
      return res.status(404).json({ message: 'Không tìm thấy học sinh' });
    }
    
    return res.json({ 
      student: {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        role: student.role,
        createdAt: student.createdAt
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin học sinh:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Lấy danh sách bài nộp của học sinh - FIXED NULL CHECK
router.get('/students/:studentId/submissions', async (req, res) => {
  try {
    const student = await User.findOne({ studentId: req.params.studentId, role: 'student' });
    
    if (!student) {
      return res.status(404).json({ message: 'Không tìm thấy học sinh' });
    }
    
    const submissions = await Submission.find({ student: student._id })
      .populate('exam')
      .sort({ createdAt: -1 });
    
    // Filter out submissions với exam null và add null check
    const validSubmissions = submissions.filter(sub => sub.exam !== null).map(sub => ({
      ...sub.toObject(),
      exam: {
        ...sub.exam.toObject(),
        title: sub.exam.title || 'Unknown Exam'
      }
    }));
    
    return res.json({ submissions: validSubmissions });
  } catch (error) {
    console.error('Lỗi lấy danh sách bài nộp:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Đặt lại mật khẩu học sinh
router.put('/students/:studentId/reset-password', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: 'Thiếu mật khẩu mới' });
    }
    
    const student = await User.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ message: 'Không tìm thấy học sinh' });
    }
    
    student.password = password;
    await student.save();
    
    return res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    console.error('Lỗi đặt lại mật khẩu:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Lấy chi tiết bài nộp - FIXED NULL CHECK
router.get('/submissions/:submissionId', async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    
    if (!submissionId || !submissionId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID bài nộp không hợp lệ' });
    }
    
    const submission = await Submission.findById(submissionId)
      .populate('student', 'name studentId')
      .populate('exam');
    
    if (!submission) {
      return res.status(404).json({ message: 'Không tìm thấy bài nộp' });
    }
    
    // Null check cho exam
    if (!submission.exam) {
      return res.status(400).json({ 
        message: 'Bài nộp này liên kết với kỳ thi đã bị xóa',
        submission: {
          _id: submission._id,
          student: submission.student,
          score: submission.score,
          exam: null
        }
      });
    }
    
    // Đảm bảo thông tin số câu đúng và tổng số câu được cập nhật
    if (submission.correctAnswers === undefined || submission.totalQuestions === undefined) {
      submission.correctAnswers = submission.answers.filter(a => a.isCorrect).length;
      submission.totalQuestions = submission.exam.questions?.length || 0;
      await submission.save();
    }
    
    return res.json({ submission });
  } catch (error) {
    console.error('Lỗi lấy chi tiết bài nộp:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

module.exports = router;