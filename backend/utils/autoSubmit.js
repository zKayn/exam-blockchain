// utils/autoSubmit.js - Nâng cao với backup blockchain và xử lý tự động
const cron = require('node-cron');
const Submission = require('../models/Submission');
const Exam = require('../models/Exam');
const { 
  submitExamToBlockchain, 
  backupBlockchain,
  verifyBlockchain,
  compareSubmissionWithBlockchain 
} = require('./blockchain-simulator');

// Tự động nộp bài quá hạn
async function autoSubmitExpiredExams() {
  try {
    console.log('🔄 Đang kiểm tra các bài thi quá hạn...');
    
    // Tìm các submission chưa nộp và đã quá thời gian
    const expiredSubmissions = await Submission.find({
      submitted: false,
      startTime: { $exists: true }
    }).populate('exam').populate('student', 'studentId name');
    
    let autoSubmittedCount = 0;
    
    for (const submission of expiredSubmissions) {
      const exam = submission.exam;
      const startTime = new Date(submission.startTime);
      const endTime = new Date(startTime.getTime() + exam.duration * 60000); // duration in minutes
      const now = new Date();
      
      // Kiểm tra xem đã quá hạn chưa
      if (now > endTime) {
        console.log(`⏰ Tự động nộp bài cho sinh viên ${submission.student.studentId} - Kỳ thi: ${exam.title}`);
        
        try {
          // Tính điểm dựa trên các câu trả lời hiện có
          let correctAnswers = 0;
          const processedAnswers = submission.answers.map(answer => {
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
          const score = exam.questions.length > 0 ? 
            (correctAnswers / exam.questions.length) * 10 : 0;
          
          // Cập nhật submission
          submission.answers = processedAnswers;
          submission.score = score;
          submission.correctAnswers = correctAnswers;
          submission.totalQuestions = exam.questions.length;
          submission.endTime = now;
          submission.submitted = true;
          
          // Lưu lên blockchain
          const blockchainResult = await submitExamToBlockchain(
            submission._id.toString(),
            submission.student.studentId,
            exam._id.toString(),
            processedAnswers,
            correctAnswers,
            exam.questions.length,
            score
          );
          
          submission.blockchainTxId = blockchainResult.txId;
          
          await submission.save();
          
          autoSubmittedCount++;
          
          console.log(`✅ Đã tự động nộp bài cho ${submission.student.studentId} - Điểm: ${score.toFixed(2)}`);
          
        } catch (error) {
          console.error(`❌ Lỗi tự động nộp bài cho ${submission.student.studentId}:`, error);
        }
      }
    }
    
    if (autoSubmittedCount > 0) {
      console.log(`📝 Đã tự động nộp ${autoSubmittedCount} bài thi quá hạn`);
    }
    
  } catch (error) {
    console.error('❌ Lỗi trong quá trình tự động nộp bài:', error);
  }
}

// Backup blockchain định kỳ
async function performBlockchainBackup() {
  try {
    console.log('💾 Đang thực hiện backup blockchain...');
    
    // Thực hiện backup
    backupBlockchain();
    
    // Xác minh tính toàn vẹn sau backup
    const verification = verifyBlockchain();
    
    if (verification.valid) {
      console.log(`✅ Backup blockchain thành công - ${verification.blockCount} blocks`);
    } else {
      console.error('❌ Phát hiện lỗi blockchain sau backup:', verification.message);
    }
    
  } catch (error) {
    console.error('❌ Lỗi backup blockchain:', error);
  }
}

// Kiểm tra tính nhất quán dữ liệu
async function checkDataConsistency() {
  try {
    console.log('🔍 Đang kiểm tra tính nhất quán dữ liệu...');
    
    // Lấy tất cả submission đã nộp có blockchain data
    const submissions = await Submission.find({
      submitted: true,
      blockchainTxId: { $exists: true, $ne: null }
    }).limit(50).sort({ createdAt: -1 }); // Kiểm tra 50 bài gần nhất
    
    let consistentCount = 0;
    let inconsistentCount = 0;
    const inconsistentSubmissions = [];
    
    for (const submission of submissions) {
      try {
        const verification = await compareSubmissionWithBlockchain(submission);
        
        if (verification.status === 'consistent') {
          consistentCount++;
        } else if (verification.status === 'inconsistent') {
          inconsistentCount++;
          inconsistentSubmissions.push({
            submissionId: submission._id,
            studentId: submission.student,
            discrepancies: verification.discrepancies
          });
        }
        
      } catch (error) {
        console.error(`Lỗi kiểm tra submission ${submission._id}:`, error);
      }
    }
    
    console.log(`📊 Kết quả kiểm tra: ${consistentCount} nhất quán, ${inconsistentCount} không nhất quán`);
    
    if (inconsistentCount > 0) {
      console.warn('⚠️  Phát hiện dữ liệu không nhất quán:', inconsistentSubmissions);
    }
    
  } catch (error) {
    console.error('❌ Lỗi kiểm tra tính nhất quán:', error);
  }
}

// Dọn dẹp các session cũ
async function cleanupOldSessions() {
  try {
    console.log('🧹 Đang dọn dẹp các session cũ...');
    
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    
    // Xóa các submission chưa hoàn thành và quá cũ
    const result = await Submission.deleteMany({
      submitted: false,
      createdAt: { $lt: threeDaysAgo },
      answers: { $size: 0 } // Chỉ xóa những bài không có câu trả lời nào
    });
    
    if (result.deletedCount > 0) {
      console.log(`🗑️  Đã xóa ${result.deletedCount} session cũ`);
    }
    
  } catch (error) {
    console.error('❌ Lỗi dọn dẹp session:', error);
  }
}

// Thống kê hệ thống
async function generateSystemStats() {
  try {
    const stats = {
      timestamp: new Date().toISOString(),
      submissions: {
        total: await Submission.countDocuments(),
        submitted: await Submission.countDocuments({ submitted: true }),
        pending: await Submission.countDocuments({ submitted: false }),
        withBlockchain: await Submission.countDocuments({ 
          blockchainTxId: { $exists: true, $ne: null } 
        })
      },
      exams: {
        total: await Exam.countDocuments(),
        active: await Exam.countDocuments({ 
          isActive: true,
          endTime: { $gte: new Date() }
        })
      }
    };
    
    // Chỉ log stats vào lúc đầu giờ để tránh spam
    const now = new Date();
    if (now.getMinutes() === 0) {
      console.log('📈 Thống kê hệ thống:', JSON.stringify(stats, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Lỗi tạo thống kê:', error);
  }
}

// Khởi tạo tất cả các cronjob
function initAutoSubmitTask() {
  console.log('🚀 Khởi tạo các tác vụ tự động...');
  
  // Chạy mỗi phút - kiểm tra bài thi quá hạn
  cron.schedule('* * * * *', async () => {
    await autoSubmitExpiredExams();
    await generateSystemStats();
  });
  
  // Chạy mỗi 15 phút - kiểm tra tính nhất quán
  cron.schedule('*/15 * * * *', async () => {
    await checkDataConsistency();
  });
  
  // Chạy mỗi giờ - backup blockchain
  cron.schedule('0 * * * *', async () => {
    await performBlockchainBackup();
  });
  
  // Chạy mỗi ngày lúc 2:00 AM - dọn dẹp
  cron.schedule('0 2 * * *', async () => {
    await cleanupOldSessions();
  });
  
  console.log('✅ Đã khởi tạo các tác vụ tự động:');
  console.log('   - Tự động nộp bài: mỗi phút');
  console.log('   - Kiểm tra nhất quán: mỗi 15 phút'); 
  console.log('   - Backup blockchain: mỗi giờ');
  console.log('   - Dọn dẹp dữ liệu: mỗi ngày 2:00 AM');
}

// Export các functions để có thể gọi manually
module.exports = {
  initAutoSubmitTask,
  autoSubmitExpiredExams,
  performBlockchainBackup,
  checkDataConsistency,
  cleanupOldSessions,
  generateSystemStats
};