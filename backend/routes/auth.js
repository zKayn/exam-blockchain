// routes/auth.js
const router = require('express').Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Đăng nhập
router.post('/login', async (req, res) => {
  const { studentId, password } = req.body;
  
  try {
    const user = await User.findOne({ studentId });
    
    if (!user) {
      return res.status(401).json({ message: 'Thông tin đăng nhập không chính xác' });
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Thông tin đăng nhập không chính xác' });
    }
    
    // Kiểm tra đăng nhập từ nơi khác
    if (req.session.userId && req.session.userId !== user._id.toString()) {
      return res.status(401).json({ 
        message: 'Tài khoản đã đăng nhập ở nơi khác',
        code: 'ALREADY_LOGGED_IN'
      });
    }
    
    // Lưu thông tin vào session
    req.session.userId = user._id;
    req.session.studentId = user.studentId;
    
    return res.json({
      message: 'Đăng nhập thành công',
      user: {
        _id: user._id,
        studentId: user.studentId,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Đăng xuất
router.post('/logout', (req, res) => {
  // Hủy session
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: 'Lỗi đăng xuất' });
    }
    
    // Xóa cookie
    res.clearCookie('connect.sid');
    
    return res.json({ message: 'Đăng xuất thành công' });
  });
});

// Lấy thông tin người dùng hiện tại
router.get('/me', authMiddleware.requireAuth, (req, res) => {
  return res.json({
    user: {
      _id: req.user._id,
      studentId: req.user.studentId,
      name: req.user.name,
      role: req.user.role
    }
  });
});

// Tạo tài khoản admin đầu tiên
router.post('/init-admin', async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (adminExists) {
      return res.status(400).json({ message: 'Admin đã tồn tại' });
    }
    
    const admin = new User({
      studentId: 'admin',
      password: 'admin123',
      name: 'Administrator',
      role: 'admin'
    });
    
    await admin.save();
    
    return res.status(201).json({ message: 'Tạo tài khoản admin thành công' });
  } catch (error) {
    console.error('Lỗi tạo tài khoản admin:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

module.exports = router;