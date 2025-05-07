// middleware/auth.js
const User = require('../models/User');

exports.requireAuth = async (req, res, next) => {
  try {
    console.log('Session:', req.session);
    
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: 'Người dùng không tồn tại' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Lỗi xác thực:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.requireAdmin = async (req, res, next) => {
  try {
    // Đảm bảo user đã được xác thực
    if (!req.user) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }
    
    // Kiểm tra quyền admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    
    next();
  } catch (error) {
    console.error('Lỗi kiểm tra quyền admin:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};