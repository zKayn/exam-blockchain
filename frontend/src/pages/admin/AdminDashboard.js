import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Row, Col, Card, Alert } from "react-bootstrap";
import Layout from "../../components/Layout";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalExams: 0,
    totalStudents: 0,
    activeExams: 0,
    submissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!user || !user._id || user.role !== "admin") {
      navigate("/login");
      return;
    }
    
    // Fetch admin dashboard stats
    const fetchStats = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/admin/dashboard", {
          withCredentials: true
        });
        setStats(response.data.stats || {});
      } catch (error) {
        console.error("Lỗi lấy thống kê:", error);
        setError("Không thể tải thông tin thống kê");
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="text-center">
          <p>Đang tải...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h2 className="mb-4">Trang quản trị</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Row>
        <Col md={3}>
          <Card className="text-center mb-4">
            <Card.Body>
              <h3>{stats.totalExams}</h3>
              <Card.Text>Tổng số kỳ thi</Card.Text>
            </Card.Body>
            <Card.Footer>
              <button 
                className="btn btn-link" 
                onClick={() => navigate("/admin/exams")}
              >
                Xem chi tiết
              </button>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="text-center mb-4">
            <Card.Body>
              <h3>{stats.totalStudents}</h3>
              <Card.Text>Tổng số học sinh</Card.Text>
            </Card.Body>
            <Card.Footer>
              <button 
                className="btn btn-link" 
                onClick={() => navigate("/admin/students")}
              >
                Xem chi tiết
              </button>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="text-center mb-4">
            <Card.Body>
              <h3>{stats.activeExams}</h3>
              <Card.Text>Kỳ thi đang diễn ra</Card.Text>
            </Card.Body>
            <Card.Footer>
              <button 
                className="btn btn-link" 
                onClick={() => navigate("/admin/exams")}
              >
                Xem chi tiết
              </button>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="text-center mb-4">
            <Card.Body>
              <h3>{stats.submissions}</h3>
              <Card.Text>Bài thi đã nộp</Card.Text>
            </Card.Body>
            <Card.Footer>
              <button 
                className="btn btn-link" 
                onClick={() => navigate("/admin/submissions")}
              >
                Xem chi tiết
              </button>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Layout>
  );
};

export default AdminDashboard;