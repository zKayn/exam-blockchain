// routes/blockchain-analytics.js - Routes cho phân tích blockchain nâng cao
const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { 
  searchBlockchain, 
  getBlockchainStats,
  verifyBlockchain,
  getSubmissionsByStudent,
  getSubmissionsByExam 
} = require('../utils/blockchain-simulator');
const Exam = require('../models/Exam');
const User = require('../models/User');

// Tìm kiếm nâng cao trong blockchain
router.post('/search', async (req, res) => {
  try {
    const {
      studentId,
      examId,
      minScore,
      maxScore,
      fromDate,
      toDate,
      sortBy,
      limit = 50
    } = req.body;
    
    // Xây dựng criteria tìm kiếm
    const criteria = {};
    if (studentId) criteria.studentId = studentId;
    if (examId) criteria.examId = examId;
    if (minScore !== undefined) criteria.minScore = Number(minScore);
    if (maxScore !== undefined) criteria.maxScore = Number(maxScore);
    if (fromDate) criteria.fromDate = fromDate;
    if (toDate) criteria.toDate = toDate;
    if (sortBy) criteria.sortBy = sortBy;
    
    console.log('Tìm kiếm blockchain với criteria:', criteria);
    
    // Thực hiện tìm kiếm
    let results = await searchBlockchain(criteria);
    
    // Giới hạn kết quả
    if (limit && results.length > limit) {
      results = results.slice(0, limit);
    }
    
    // Lấy thêm thông tin từ database
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        try {
          // Lấy thông tin kỳ thi
          const exam = await Exam.findById(result.examId);
          
          // Lấy thông tin học sinh
          const student = await User.findOne({ studentId: result.studentId });
          
          return {
            ...result,
            examInfo: exam ? {
              title: exam.title,
              duration: exam.duration
            } : null,
            studentInfo: student ? {
              name: student.name,
              studentId: student.studentId
            } : null
          };
        } catch (error) {
          console.error('Lỗi lấy thông tin bổ sung:', error);
          return result;
        }
      })
    );
    
    return res.json({
      results: enrichedResults,
      total: results.length,
      criteria,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Lỗi tìm kiếm blockchain:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Phân tích điểm số theo kỳ thi
router.get('/exam-analytics/:examId', async (req, res) => {
  try {
    const examId = req.params.examId;
    
    if (!examId || !examId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID kỳ thi không hợp lệ' });
    }
    
    // Lấy thông tin kỳ thi
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }
    
    // Lấy dữ liệu từ blockchain
    const submissions = await getSubmissionsByExam(examId);
    
    if (submissions.length === 0) {
      return res.json({
        exam: {
          _id: exam._id,
          title: exam.title,
          totalQuestions: exam.questions.length
        },
        analytics: {
          totalSubmissions: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          passRate: 0,
          scoreDistribution: [],
          questionAnalysis: []
        }
      });
    }
    
    // Phân tích điểm số
    const scores = submissions.map(s => parseFloat(s.score));
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const passRate = (scores.filter(score => score >= 5).length / scores.length) * 100;
    
    // Phân phối điểm
    const scoreRanges = [
      { range: '0-2', count: 0 },
      { range: '2-4', count: 0 },
      { range: '4-6', count: 0 },
      { range: '6-8', count: 0 },
      { range: '8-10', count: 0 }
    ];
    
    scores.forEach(score => {
      if (score < 2) scoreRanges[0].count++;
      else if (score < 4) scoreRanges[1].count++;
      else if (score < 6) scoreRanges[2].count++;
      else if (score < 8) scoreRanges[3].count++;
      else scoreRanges[4].count++;
    });
    
    // Phân tích theo câu hỏi
    const questionAnalysis = [];
    if (exam.questions && exam.questions.length > 0) {
      for (let i = 0; i < exam.questions.length; i++) {
        let correctCount = 0;
        let totalCount = 0;
        
        submissions.forEach(submission => {
          if (submission.answers && submission.answers[i]) {
            totalCount++;
            if (submission.answers[i].isCorrect) {
              correctCount++;
            }
          }
        });
        
        questionAnalysis.push({
          questionIndex: i,
          question: exam.questions[i].content.substring(0, 100) + '...',
          correctCount,
          totalCount,
          accuracy: totalCount > 0 ? ((correctCount / totalCount) * 100).toFixed(2) : 0
        });
      }
    }
    
    return res.json({
      exam: {
        _id: exam._id,
        title: exam.title,
        totalQuestions: exam.questions.length
      },
      analytics: {
        totalSubmissions: submissions.length,
        averageScore: averageScore.toFixed(2),
        highestScore: highestScore.toFixed(2),
        lowestScore: lowestScore.toFixed(2),
        passRate: passRate.toFixed(2),
        scoreDistribution: scoreRanges,
        questionAnalysis
      },
      submissions: submissions.map(s => ({
        studentId: s.studentId,
        score: s.score,
        correctAnswers: s.correctAnswers,
        timestamp: s.timestamp,
        hash: s.hash
      }))
    });
  } catch (error) {
    console.error('Lỗi phân tích kỳ thi:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Phân tích hiệu suất học sinh
router.get('/student-analytics/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId;
    
    // Kiểm tra học sinh tồn tại
    const student = await User.findOne({ studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Không tìm thấy học sinh' });
    }
    
    // Lấy dữ liệu từ blockchain
    const submissions = await getSubmissionsByStudent(studentId);
    
    if (submissions.length === 0) {
      return res.json({
        student: {
          studentId: student.studentId,
          name: student.name
        },
        analytics: {
          totalExams: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          improvementTrend: 'no_data',
          examHistory: []
        }
      });
    }
    
    // Sắp xếp theo thời gian
    submissions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Phân tích điểm số
    const scores = submissions.map(s => parseFloat(s.score));
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    
    // Tính xu hướng cải thiện
    let improvementTrend = 'stable';
    if (submissions.length >= 3) {
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
      const secondHalf = scores.slice(Math.floor(scores.length / 2));
      
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg + 0.5) improvementTrend = 'improving';
      else if (secondAvg < firstAvg - 0.5) improvementTrend = 'declining';
    }
    
    // Lấy thông tin kỳ thi cho mỗi bài nộp
    const examHistory = await Promise.all(
      submissions.map(async (submission) => {
        try {
          const exam = await Exam.findById(submission.examId);
          return {
            examId: submission.examId,
            examTitle: exam ? exam.title : 'Kỳ thi không tồn tại',
            score: submission.score,
            correctAnswers: submission.correctAnswers,
            totalQuestions: submission.totalQuestions,
            percentage: submission.percentage,
            timestamp: submission.timestamp,
            hash: submission.hash
          };
        } catch (error) {
          return {
            examId: submission.examId,
            examTitle: 'Lỗi tải thông tin',
            score: submission.score,
            timestamp: submission.timestamp
          };
        }
      })
    );
    
    return res.json({
      student: {
        studentId: student.studentId,
        name: student.name
      },
      analytics: {
        totalExams: submissions.length,
        averageScore: averageScore.toFixed(2),
        highestScore: highestScore.toFixed(2),
        lowestScore: lowestScore.toFixed(2),
        improvementTrend,
        examHistory
      }
    });
  } catch (error) {
    console.error('Lỗi phân tích học sinh:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Báo cáo tổng quan hệ thống
router.get('/system-report', async (req, res) => {
  try {
    // Thống kê blockchain
    const blockchainStats = getBlockchainStats();
    
    // Xác minh blockchain
    const verification = verifyBlockchain();
    
    // Thống kê database
    const totalExams = await Exam.countDocuments();
    const activeExams = await Exam.countDocuments({ 
      isActive: true,
      endTime: { $gte: new Date() }
    });
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    
    // Tính toán thêm một số metrics
    const consistencyRate = blockchainStats && blockchainStats.totalSubmissions > 0 ? 
      (verification.valid ? 100 : 0) : 0;
    
    return res.json({
      timestamp: new Date().toISOString(),
      blockchain: {
        ...blockchainStats,
        verification,
        consistencyRate: `${consistencyRate}%`
      },
      database: {
        totalExams,
        activeExams,
        totalStudents,
        totalAdmins
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    });
  } catch (error) {
    console.error('Lỗi tạo báo cáo hệ thống:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// Xuất dữ liệu blockchain
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', studentId, examId, fromDate, toDate } = req.query;
    
    // Xây dựng criteria
    const criteria = {};
    if (studentId) criteria.studentId = studentId;
    if (examId) criteria.examId = examId;
    if (fromDate) criteria.fromDate = fromDate;
    if (toDate) criteria.toDate = toDate;
    
    // Lấy dữ liệu
    const results = await searchBlockchain(criteria);
    
    // Thêm thông tin bổ sung
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        try {
          const exam = await Exam.findById(result.examId);
          const student = await User.findOne({ studentId: result.studentId });
          
          return {
            submissionId: result.submissionId,
            studentId: result.studentId,
            studentName: student ? student.name : 'Unknown',
            examId: result.examId,
            examTitle: exam ? exam.title : 'Unknown',
            score: result.score,
            correctAnswers: result.correctAnswers,
            totalQuestions: result.totalQuestions,
            percentage: result.percentage,
            timestamp: result.timestamp,
            blockIndex: result.blockIndex,
            hash: result.hash
          };
        } catch (error) {
          return result;
        }
      })
    );
    
    if (format === 'csv') {
      // Xuất CSV
      const csv = [
        'Submission ID,Student ID,Student Name,Exam ID,Exam Title,Score,Correct Answers,Total Questions,Percentage,Timestamp,Block Index,Hash',
        ...enrichedResults.map(r => 
          `${r.submissionId},"${r.studentId}","${r.studentName}","${r.examId}","${r.examTitle}",${r.score},${r.correctAnswers},${r.totalQuestions},${r.percentage},"${r.timestamp}",${r.blockIndex},"${r.hash}"`
        )
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="blockchain-export-${Date.now()}.csv"`);
      return res.send(csv);
    } else {
      // Xuất JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="blockchain-export-${Date.now()}.json"`);
      return res.json({
        exportDate: new Date().toISOString(),
        criteria,
        totalRecords: enrichedResults.length,
        data: enrichedResults
      });
    }
  } catch (error) {
    console.error('Lỗi xuất dữ liệu:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

module.exports = router;