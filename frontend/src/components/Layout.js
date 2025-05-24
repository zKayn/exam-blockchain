// src/components/Layout.js - Cập nhật với navigation blockchain
import React from "react";
import { Container } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:5000/api/auth/logout", {}, { withCredentials: true });
      localStorage.removeItem("user");
      document.cookie = "connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      navigate("/login");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <Container>
          <Link className="navbar-brand" to="/">
            🔗 Hệ thống thi Blockchain
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              {user && user.role === "admin" ? (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/admin">
                      📊 Dashboard
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/admin/exams">
                      📝 Quản lý kỳ thi
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/admin/students">
                      👥 Quản lý học sinh
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/admin/blockchain">
                      🔗 Blockchain
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/dashboard">
                      🏠 Trang chủ
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/exams">
                      📝 Kỳ thi
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/blockchain-verification">
                      🔗 Xác minh Blockchain
                    </Link>
                  </li>
                </>
              )}
            </ul>
            {user && user.name && (
              <div className="d-flex align-items-center">
                <span className="navbar-text me-3">
                  👋 Xin chào, <strong>{user.name}</strong>
                  {user.role === 'admin' && (
                    <span className="badge bg-warning text-dark ms-2">Admin</span>
                  )}
                </span>
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={handleLogout}
                >
                  🚪 Đăng xuất
                </button>
              </div>
            )}
          </div>
        </Container>
      </nav>
      
      <Container className="mt-4">{children}</Container>
    </div>
  );
};

export default Layout;