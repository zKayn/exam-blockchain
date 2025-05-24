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

// Dashboard thống kê
router.get('/dashboard', async (req, res) => {
  try {
    const totalExams = await Exam.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const activeExams = await Exam.countDocuments({ 
      isActive: true,
      endTime: { $gte: new Date() }
    });
    const submissions = await Submission.countDocuments({ submitted: true });
    
    return res.json({
      stats: {
        totalExams,
        totalStudents,
        activeExams,
        submissions
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

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
// routes/admin.js - Lấy chi tiết kỳ thi (admin)
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
    
    // Log để debug
    console.log('Chi tiết kỳ thi:', {
      id: exam._id,
      title: exam.title,
      isActive: exam.isActive,
      startTime: exam.startTime,
      endTime: exam.endTime
    });
    
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

// routes/admin.js - Cập nhật phần sửa kỳ thi
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
    
    // Log để debug
    console.log('Đang cập nhật kỳ thi:', examId);
    console.log('Dữ liệu cập nhật:', {
      title,
      description,
      duration,
      startTime,
      endTime,
      isActive
    });
    
    // Cập nhật thông tin kỳ thi
    exam.title = title;
    exam.description = description || '';
    exam.duration = Number(duration);
    
    // Đảm bảo đúng định dạng ngày giờ
    try {
      exam.startTime = new Date(startTime);
      exam.endTime = new Date(endTime);
    } catch (e) {
      console.error('Lỗi chuyển đổi ngày giờ:', e);
      return res.status(400).json({ message: 'Định dạng ngày giờ không hợp lệ' });
    }
    
    // Giữ nguyên trạng thái kích hoạt nếu không được cập nhật
    if (isActive !== undefined) {
      exam.isActive = isActive;
    }
    
    exam.questions = questions;
    
    // Log trước khi lưu
    console.log('Kỳ thi sau khi cập nhật:', {
      id: exam._id,
      title: exam.title,
      isActive: exam.isActive,
      startTime: exam.startTime,
      endTime: exam.endTime
    });
    
    await exam.save();
    
    return res.json({ message: 'Cập nhật kỳ thi thành công', exam });
  } catch (error) {
    console.error('Lỗi cập nhật kỳ thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Tạo kỳ thi mới
// Trong routes/admin.js - Tạo kỳ thi mới
router.post('/exams', async (req, res) => {
  try {
    console.log('Nhận yêu cầu tạo kỳ thi:', req.body);
    const { title, description, duration, startTime, endTime, questions } = req.body;
    
    // Kiểm tra các trường bắt buộc
    if (!title) console.log('Thiếu title');
    if (!duration) console.log('Thiếu duration');
    if (!startTime) console.log('Thiếu startTime');
    if (!endTime) console.log('Thiếu endTime');
    if (!questions || !Array.isArray(questions)) console.log('Thiếu questions hoặc không phải mảng');
    
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
      console.log('Các câu hỏi không hợp lệ:', invalidQuestions);
      return res.status(400).json({ 
        message: 'Cấu trúc câu hỏi không hợp lệ', 
        invalidQuestions 
      });
    }
    
    // Tạo kỳ thi mới
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
    
    console.log('Đối tượng kỳ thi trước khi lưu:', exam);
    await exam.save();
    console.log('Đã lưu kỳ thi thành công');
    
    return res.status(201).json({
      message: 'Tạo kỳ thi thành công',
      exam
    });
  } catch (error) {
    console.error('Lỗi tạo kỳ thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Thêm vào routes/admin.js

// Xóa kỳ thi
router.delete('/exams/:examId', async (req, res) => {
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
    
    // Kiểm tra xem đã có bài nộp chưa
    const submissionCount = await Submission.countDocuments({ exam: examId });
    if (submissionCount > 0) {
      return res.status(400).json({ 
        message: 'Không thể xóa kỳ thi đã có bài nộp',
        submissionCount 
      });
    }
    
    // Thực hiện xóa kỳ thi
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
    
    // Kiểm tra studentId đã tồn tại chưa
    const existingStudent = await User.findOne({ studentId });
    if (existingStudent) {
      return res.status(400).json({ message: 'Mã học sinh đã tồn tại' });
    }
    
    // Tạo học sinh mới
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

// Lấy danh sách bài nộp của học sinh
router.get('/students/:studentId/submissions', async (req, res) => {
  try {
    // Tìm học sinh theo studentId
    const student = await User.findOne({ studentId: req.params.studentId, role: 'student' });
    
    if (!student) {
      return res.status(404).json({ message: 'Không tìm thấy học sinh' });
    }
    
    // Lấy danh sách bài nộp
    const submissions = await Submission.find({ student: student._id })
      .populate('exam')
      .sort({ createdAt: -1 });
    
    return res.json({ submissions });
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

// routes/admin.js - Cập nhật API lấy chi tiết bài nộp
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
    
    // Đảm bảo thông tin số câu đúng và tổng số câu được cập nhật
    if (submission.correctAnswers === undefined || submission.totalQuestions === undefined) {
      submission.correctAnswers = submission.answers.filter(a => a.isCorrect).length;
      submission.totalQuestions = submission.exam.questions.length;
      await submission.save();
    }
    
    return res.json({ submission });
  } catch (error) {
    console.error('Lỗi lấy chi tiết bài nộp:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Lấy dữ liệu blockchain
router.get('/blockchain/:txId', async (req, res) => {
  try {
    const txId = req.params.txId;
    
    if (!txId) {
      return res.status(400).json({ message: 'Thiếu mã giao dịch blockchain' });
    }
    
    const data = await getSubmissionFromBlockchain(txId);
    
    if (!data) {
      return res.status(404).json({ message: 'Không tìm thấy dữ liệu blockchain' });
    }
    
    return res.json({ data });
  } catch (error) {
    console.error('Lỗi lấy dữ liệu blockchain:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Kiểm tra tính toàn vẹn blockchain
router.get('/blockchain/verify', async (req, res) => {
  try {
    const result = await verifyBlockchain();
    return res.json(result);
  } catch (error) {
    console.error('Lỗi kiểm tra blockchain:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

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

// API so sánh dữ liệu submission với blockchain
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

// API lấy tất cả bài nộp của học sinh từ blockchain
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
    
    // Lấy dữ liệu từ database để so sánh
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
        examTitle: sub.exam.title,
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
        student: sub.student,
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

// API xác minh tính toàn vẹn blockchain
router.get('/blockchain/verify', async (req, res) => {
  try {
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

// API so sánh toàn bộ dữ liệu database với blockchain
router.get('/blockchain/compare-all', async (req, res) => {
  try {
    const submissions = await Submission.find({ submitted: true })
      .populate('student', 'studentId name')
      .populate('exam', 'title')
      .sort({ createdAt: -1 });
    
    const comparisons = [];
    
    for (const submission of submissions) {
      const comparison = await compareSubmissionWithBlockchain(submission);
      comparisons.push({
        submissionId: submission._id,
        student: submission.student,
        exam: submission.exam.title,
        score: submission.score,
        blockchainTxId: submission.blockchainTxId,
        verification: comparison
      });
    }
    
    // Thống kê tổng quan
    const consistent = comparisons.filter(c => c.verification.status === 'consistent').length;
    const inconsistent = comparisons.filter(c => c.verification.status === 'inconsistent').length;
    const errors = comparisons.filter(c => c.verification.status === 'error').length;
    const noBlockchain = comparisons.filter(c => c.verification.status === 'no_blockchain_data').length;
    
    return res.json({
      summary: {
        total: comparisons.length,
        consistent,
        inconsistent,
        errors,
        noBlockchain,
        consistencyRate: comparisons.length > 0 ? (consistent / comparisons.length * 100).toFixed(2) : 0
      },
      comparisons
    });
  } catch (error) {
    console.error('Lỗi so sánh toàn bộ dữ liệu:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// API lấy chi tiết block từ blockchain
router.get('/blockchain/blocks/:txId', async (req, res) => {
  try {
    const txId = req.params.txId;
    
    if (!txId) {
      return res.status(400).json({ message: 'Thiếu transaction ID' });
    }
    
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

// Thêm vào cuối file admin.js hiện tại
module.exports = router;