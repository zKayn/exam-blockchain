// models/Exam.js
const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  // Trong mô hình Exam.js, đảm bảo schema của questions thật rõ ràng
  questions: [{
    content: {
      type: String,
      required: true
    },
    options: {
      type: [String],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length === 4;
        },
        message: props => `Options phải có đúng 4 phần tử!`
      },
      required: true
    },
    correctAnswer: {
      type: Number,
      min: 0,
      max: 3,
      required: true
    }
  }],
  isActive: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Exam', examSchema);