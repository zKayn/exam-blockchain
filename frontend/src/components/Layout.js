import React from "react";
import { Container } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios"; // Thêm import axios
import "bootstrap/dist/css/bootstrap.min.css";

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = async () => {
    try {
      // Gọi API đăng xuất
      await axios.post("http://localhost:5000/api/auth/logout", {}, { withCredentials: true });
      
      // Xóa thông tin người dùng trong localStorage
      localStorage.removeItem("user");
      
      // Xóa cookie phiên đăng nhập
      document.cookie = "connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      // Chuyển hướng về trang đăng nhập
      navigate("/login");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      // Xóa dữ liệu người dùng ngay cả khi có lỗi
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <Container>
          <Link className="navbar-brand" to="/">
            Hệ thống thi trắc nghiệm
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
                      Trang quản trị
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/admin/exams">
                      Quản lý kỳ thi
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/admin/students">
                      Quản lý học sinh
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/dashboard">
                      Trang chủ
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/exams">
                      Kỳ thi
                    </Link>
                  </li>
                </>
              )}
            </ul>
            {user && user.name && (
              <div className="d-flex">
                <span className="navbar-text me-3">Xin chào, {user.name}</span>
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={handleLogout}
                >
                  Đăng xuất
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