// routes/exams.js
const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const { submitExamToBlockchain } = require('../utils/blockchain-simulator');

// routes/exams.js - Cập nhật phần lấy danh sách kỳ thi cho học sinh
router.get('/', authMiddleware.requireAuth, async (req, res) => {
  try {
    // Log để debug
    console.log('Đang lấy danh sách kỳ thi cho học sinh...');
    console.log('Thời gian hiện tại:', new Date());
    
    // Lấy tất cả kỳ thi cho học sinh (chỉ những kỳ thi đã kích hoạt và chưa kết thúc)
    const exams = await Exam.find({
      isActive: true,
      endTime: { $gte: new Date() }
    }).sort({ startTime: 1 });
    
    // Log để debug
    console.log('Số kỳ thi tìm thấy:', exams.length);
    exams.forEach((exam, index) => {
      console.log(`Kỳ thi ${index + 1}:`, {
        id: exam._id,
        title: exam.title,
        isActive: exam.isActive,
        startTime: exam.startTime,
        endTime: exam.endTime,
        now: new Date(),
        isEnded: exam.endTime < new Date()
      });
    });
    
    return res.json({ exams });
  } catch (error) {
    console.error('Lỗi lấy danh sách kỳ thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Lấy chi tiết kỳ thi theo ID
router.get('/:examId', authMiddleware.requireAuth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }
    
    // Kiểm tra quyền truy cập
    if (!exam.isActive && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Kỳ thi chưa được kích hoạt' });
    }
    
    return res.json({ exam });
  } catch (error) {
    console.error('Lỗi lấy chi tiết kỳ thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Bắt đầu kỳ thi
router.post('/:examId/start', authMiddleware.requireAuth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }
    
    if (!exam.isActive) {
      return res.status(403).json({ message: 'Kỳ thi chưa được kích hoạt' });
    }
    
    // Kiểm tra thời gian kỳ thi
    const now = new Date();
    if (now < new Date(exam.startTime) || now > new Date(exam.endTime)) {
      return res.status(403).json({ message: 'Chưa đến thời gian làm bài hoặc đã quá hạn' });
    }
    
    // Kiểm tra đã có bài nộp chưa
    let submission = await Submission.findOne({
      student: req.user._id,
      exam: exam._id
    });
    
    // Nếu chưa có bài nộp, tạo bài nộp mới
    if (!submission) {
      submission = new Submission({
        student: req.user._id,
        exam: exam._id,
        startTime: now,
        answers: []
      });
      
      await submission.save();
    } else if (submission.submitted) {
      return res.status(403).json({ message: 'Bạn đã nộp bài này rồi' });
    }
    
    return res.json({ 
      message: 'Bắt đầu kỳ thi thành công',
      submission
    });
  } catch (error) {
    console.error('Lỗi bắt đầu kỳ thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// routes/exams.js - Phần API nộp bài
router.post('/:examId/submit', authMiddleware.requireAuth, async (req, res) => {
  try {
    const { answers } = req.body;
    const exam = await Exam.findById(req.params.examId);
    
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }
    
    // Tìm bài nộp
    const submission = await Submission.findOne({
      student: req.user._id,
      exam: exam._id,
      submitted: false
    });
    
    if (!submission) {
      return res.status(404).json({ message: 'Không tìm thấy bài làm hoặc đã nộp bài' });
    }
    
    // Tính điểm
    let correctAnswers = 0;
    const processedAnswers = answers.map(answer => {
      const question = exam.questions[answer.questionIndex];
      const isCorrect = question && question.correctAnswer === answer.selectedOption;
      
      if (isCorrect) {
        correctAnswers += 1;
      }
      
      return {
        questionIndex: answer.questionIndex,
        selectedOption: answer.selectedOption,
        isCorrect
      };
    });
    
    // Điểm theo thang 10
    const score = (correctAnswers / exam.questions.length) * 10;
    
    // Cập nhật bài nộp
    submission.answers = processedAnswers;
    submission.score = score;
    submission.correctAnswers = correctAnswers;
    submission.totalQuestions = exam.questions.length;
    submission.endTime = new Date();
    submission.submitted = true;
    
    // Lưu kết quả lên blockchain
    const blockchainResult = await submitExamToBlockchain(
      submission._id.toString(),
      req.user.studentId,
      exam._id.toString(),
      processedAnswers,
      correctAnswers,
      exam.questions.length,
      score
    );
    
    submission.blockchainTxId = blockchainResult.txId;
    
    await submission.save();
    
    return res.json({
      message: 'Nộp bài thành công',
      submission,
      blockchainTxId: blockchainResult.txId
    });
  } catch (error) {
    console.error('Lỗi nộp bài:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// routes/exams.js - Sửa phần lấy kết quả bài thi
router.get('/:examId/result', authMiddleware.requireAuth, async (req, res) => {
  try {
    const submission = await Submission.findOne({
      student: req.user._id,
      exam: req.params.examId,
      submitted: true
    }).populate('exam', 'title duration questions');
    
    if (!submission) {
      return res.status(404).json({ message: 'Không tìm thấy kết quả bài thi' });
    }
    
    // Tính lại correctAnswers và totalQuestions nếu chưa có
    if (submission.correctAnswers === undefined || submission.totalQuestions === undefined) {
      submission.correctAnswers = submission.answers.filter(a => a.isCorrect).length;
      submission.totalQuestions = submission.exam.questions.length;
      await submission.save();
    }
    
    return res.json({ submission });
  } catch (error) {
    console.error('Lỗi lấy kết quả bài thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Kiểm tra trạng thái làm bài
router.get('/:examId/status', authMiddleware.requireAuth, async (req, res) => {
  try {
    const submission = await Submission.findOne({
      student: req.user._id,
      exam: req.params.examId
    });
    
    if (!submission) {
      return res.json({ status: 'not_started' });
    }
    
    if (submission.submitted) {
      return res.json({ 
        status: 'submitted',
        submissionId: submission._id
      });
    }
    
    // Kiểm tra thời gian còn lại
    const exam = await Exam.findById(req.params.examId);
    const endTime = new Date(submission.startTime);
    endTime.setMinutes(endTime.getMinutes() + exam.duration);
    
    const now = new Date();
    const timeLeft = Math.max(0, endTime - now);
    
    return res.json({
      status: 'in_progress',
      submission,
      timeLeft
    });
  } catch (error) {
    console.error('Lỗi kiểm tra trạng thái bài thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

module.exports = router;