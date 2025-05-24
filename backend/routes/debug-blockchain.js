// backend/routes/debug-blockchain.js - Route để test và debug
const router = require('express').Router();
const { 
  verifyBlockchain, 
  getBlockchainStats,
  readBlockchain,
  ensureBlockchainFile
} = require('../utils/blockchain-simulator');

// Debug route để kiểm tra blockchain
router.get('/debug', async (req, res) => {
  try {
    console.log('🔧 DEBUG: Bắt đầu kiểm tra blockchain...');
    
    // 1. Kiểm tra file tồn tại
    const fileExists = ensureBlockchainFile();
    console.log('📁 File blockchain:', fileExists ? 'TỒN TẠI' : 'KHÔNG TỒN TẠI');
    
    // 2. Đọc blockchain
    let blockchain;
    try {
      blockchain = readBlockchain();
      console.log('📖 Đọc blockchain: THÀNH CÔNG');
      console.log('📊 Số blocks:', blockchain.chain?.length || 0);
    } catch (readError) {
      console.log('📖 Đọc blockchain: LỖI -', readError.message);
      return res.json({
        debug: true,
        status: 'error',
        step: 'read_blockchain',
        error: readError.message,
        fileExists
      });
    }
    
    // 3. Lấy thống kê
    let stats;
    try {
      stats = getBlockchainStats();
      console.log('📊 Thống kê: THÀNH CÔNG');
    } catch (statsError) {
      console.log('📊 Thống kê: LỖI -', statsError.message);
      return res.json({
        debug: true,
        status: 'error',
        step: 'get_stats',
        error: statsError.message,
        fileExists,
        blockchain: blockchain ? 'OK' : 'ERROR'
      });
    }
    
    // 4. Xác minh blockchain
    let verification;
    try {
      verification = verifyBlockchain();
      console.log('🔍 Xác minh: THÀNH CÔNG');
      console.log('✅ Kết quả:', verification.valid ? 'HỢP LỆ' : 'CÓ LỖI');
    } catch (verifyError) {
      console.log('🔍 Xác minh: LỖI -', verifyError.message);
      return res.json({
        debug: true,
        status: 'error',
        step: 'verify_blockchain',
        error: verifyError.message,
        fileExists,
        blockchain: blockchain ? 'OK' : 'ERROR',
        stats: stats ? 'OK' : 'ERROR'
      });
    }
    
    // 5. Trả về kết quả debug
    const result = {
      debug: true,
      status: 'success',
      timestamp: new Date().toISOString(),
      fileExists,
      blockchain: {
        chainLength: blockchain.chain?.length || 0,
        metadata: blockchain.metadata
      },
      stats,
      verification,
      steps: {
        ensureFile: '✅ SUCCESS',
        readBlockchain: '✅ SUCCESS', 
        getStats: '✅ SUCCESS',
        verifyBlockchain: '✅ SUCCESS'
      }
    };
    
    console.log('🎉 DEBUG hoàn tất: TẤT CẢ OK');
    return res.json(result);
    
  } catch (error) {
    console.error('💥 DEBUG: Lỗi không mong muốn:', error);
    return res.status(500).json({
      debug: true,
      status: 'fatal_error',
      error: error.message,
      stack: error.stack
    });
  }
});

// Test route đơn giản
router.get('/test', (req, res) => {
  return res.json({
    message: 'Blockchain debug route hoạt động',
    timestamp: new Date().toISOString(),
    test: 'OK'
  });
});

module.exports = router;