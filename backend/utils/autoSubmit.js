// utils/autoSubmit.js
const cron = require('node-cron');
const { submitExamToBlockchain } = require('./blockchain-simulator');

// Khởi tạo cronjob
function initAutoSubmitTask() {
  // Chạy mỗi phút
  cron.schedule('* * * * *', async () => {
    console.log('Đang chạy tác vụ nộp bài tự động...');
    // Logic tự động nộp bài sẽ được triển khai sau
  });
  console.log('Đã khởi tạo tác vụ nộp bài tự động');
}

module.exports = {
  initAutoSubmitTask
};