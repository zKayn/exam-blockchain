// src/api/axios.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

// Xử lý lỗi
api.interceptors.response.use(
  response => response,
  error => {
    // Xử lý lỗi đăng nhập ở nơi khác
    if (error.response && error.response.status === 401 && 
        error.response.data.code === 'ALREADY_LOGGED_IN') {
      // Chuyển hướng đến trang đăng nhập với thông báo
      window.location.href = '/login?error=already_logged_in';
    }
    return Promise.reject(error);
  }
);

export default api;