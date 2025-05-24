// backend/server.js - Cấu hình cuối cùng với tất cả routes blockchain
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');
const { initAutoSubmitTask } = require('./utils/autoSubmit');

// Khởi tạo auto submit task và các tác vụ tự động
initAutoSubmitTask();

dotenv.config();

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Đã kết nối MongoDB');
  console.log(`📍 Database: ${process.env.MONGODB_URI}`);
})
.catch(err => {
  console.error('❌ Lỗi kết nối MongoDB:', err);
  process.exit(1);
});

const app = express();

// Trust proxy for production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // Lazy session update
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 3, // 3 giờ
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Rate limiting middleware (basic)
const requestCounts = new Map();
app.use((req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100; // per minute
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
  } else {
    const data = requestCounts.get(ip);
    if (now > data.resetTime) {
      data.count = 1;
      data.resetTime = now + windowMs;
    } else {
      data.count++;
      if (data.count > maxRequests) {
        return res.status(429).json({ 
          message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' 
        });
      }
    }
  }
  next();
});

// Auth middleware
const authMiddleware = require('./middleware/auth');

// ==================== PUBLIC ROUTES ====================
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Authentication routes (public)
app.use('/api/auth', require('./routes/auth'));

// ==================== PROTECTED ROUTES ====================
// Student routes (require authentication)
app.use('/api/exams', authMiddleware.requireAuth, require('./routes/exams'));
app.use('/api/submissions', authMiddleware.requireAuth, require('./routes/submissions'));

// Student blockchain verification routes
app.use('/api/student-blockchain', authMiddleware.requireAuth, require('./routes/student-blockchain'));

// ==================== ADMIN ROUTES ====================
// Admin routes (require admin authentication)
app.use('/api/admin', 
  authMiddleware.requireAuth, 
  authMiddleware.requireAdmin, 
  require('./routes/admin')
);

// Blockchain analytics routes (admin only)
app.use('/api/blockchain-analytics', 
  authMiddleware.requireAuth, 
  authMiddleware.requireAdmin, 
  require('./routes/blockchain-analytics')
);

// ==================== MAINTENANCE ROUTES ====================
// Manual maintenance endpoints (admin only)
app.post('/api/maintenance/auto-submit', 
  authMiddleware.requireAuth, 
  authMiddleware.requireAdmin, 
  async (req, res) => {
    try {
      const { autoSubmitExpiredExams } = require('./utils/autoSubmit');
      await autoSubmitExpiredExams();
      res.json({ message: 'Tác vụ tự động nộp bài đã được thực hiện' });
    } catch (error) {
      console.error('Lỗi tác vụ tự động nộp bài:', error);
      res.status(500).json({ message: 'Lỗi thực hiện tác vụ' });
    }
  }
);

app.post('/api/maintenance/backup-blockchain', 
  authMiddleware.requireAuth, 
  authMiddleware.requireAdmin, 
  async (req, res) => {
    try {
      const { performBlockchainBackup } = require('./utils/autoSubmit');
      await performBlockchainBackup();
      res.json({ message: 'Backup blockchain đã được thực hiện' });
    } catch (error) {
      console.error('Lỗi backup blockchain:', error);
      res.status(500).json({ message: 'Lỗi backup blockchain' });
    }
  }
);

app.post('/api/maintenance/check-consistency', 
  authMiddleware.requireAuth, 
  authMiddleware.requireAdmin, 
  async (req, res) => {
    try {
      const { checkDataConsistency } = require('./utils/autoSubmit');
      await checkDataConsistency();
      res.json({ message: 'Kiểm tra tính nhất quán đã được thực hiện' });
    } catch (error) {
      console.error('Lỗi kiểm tra tính nhất quán:', error);
      res.status(500).json({ message: 'Lỗi kiểm tra tính nhất quán' });
    }
  }
);

app.get('/api/maintenance/stats', 
  authMiddleware.requireAuth, 
  authMiddleware.requireAdmin, 
  async (req, res) => {
    try {
      const { generateSystemStats } = require('./utils/autoSubmit');
      const stats = await generateSystemStats();
      res.json(stats);
    } catch (error) {
      console.error('Lỗi tạo thống kê:', error);
      res.status(500).json({ message: 'Lỗi tạo thống kê' });
    }
  }
);

// ==================== ERROR HANDLING ====================
// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Lỗi server:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Không tiết lộ chi tiết lỗi trong production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    message: err.message || 'Lỗi máy chủ nội bộ',
    ...(isDevelopment && { 
      stack: err.stack,
      details: err.details 
    })
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❓ 404 - Endpoint không tồn tại: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: 'Endpoint không tồn tại',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/exams',
      'GET /api/admin/dashboard'
    ]
  });
});

// ==================== SERVER STARTUP ====================
const PORT = process.env.PORT || 5000;

// Graceful shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
  console.log(`🔄 Nhận tín hiệu ${signal}, đang shutdown gracefully...`);
  
  // Đóng server HTTP
  server.close(() => {
    console.log('✅ HTTP server đã đóng');
    
    // Đóng kết nối MongoDB
    mongoose.connection.close(false, () => {
      console.log('✅ Đã đóng kết nối MongoDB');
      process.exit(0);
    });
  });
  
  // Force close sau 10 giây
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Start server
const server = app.listen(PORT, () => {
  console.log('\n🚀 ===== SERVER STARTED =====');
  console.log(`📍 Server đang chạy trên cổng ${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🗄️  Database: ${process.env.MONGODB_URI?.replace(/\/\/.*:.*@/, '//***:***@') || 'Not configured'}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log('🔗 Available endpoints:');
  console.log('   - POST /api/auth/login');
  console.log('   - GET  /api/exams');
  console.log('   - GET  /api/admin/dashboard');
  console.log('   - GET  /api/student-blockchain/my-blockchain-results');
  console.log('   - POST /api/blockchain-analytics/search');
  console.log('============================\n');
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      console.error(`❌ ${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`❌ ${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

module.exports = app;