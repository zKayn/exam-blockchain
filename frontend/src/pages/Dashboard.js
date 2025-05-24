// src/pages/Dashboard.js - Nâng cao với tính năng blockchain
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Row, Col, Card, Button, Alert, Badge, Table } from "react-bootstrap";
import Layout from "../components/Layout";

const Dashboard = () => {
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [blockchainSummary, setBlockchainSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!user || !user._id) {
      navigate("/login");
      return;
    }
    
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      // Lấy danh sách kỳ thi
      const examsResponse = await axios.get("http://localhost:5000/api/exams", {
        withCredentials: true
      });
      setExams(examsResponse.data.exams || []);

      // Lấy danh sách bài nộp của sinh viên
      const submissionsResponse = await axios.get("http://localhost:5000/api/submissions", {
        withCredentials: true
      });
      setSubmissions(submissionsResponse.data.submissions || []);

      // Lấy thông tin blockchain của sinh viên
      try {
        const blockchainResponse = await axios.get("http://localhost:5000/api/student-blockchain/my-blockchain-results", {
          withCredentials: true
        });
        setBlockchainSummary(blockchainResponse.data.summary || {});
      } catch (blockchainError) {
        console.log("Không thể tải dữ liệu blockchain:", blockchainError);
        setBlockchainSummary({});
      }

    } catch (error) {
      console.error("Lỗi lấy dữ liệu dashboard:", error);
      setError("Không thể tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="mt-3">Đang tải dữ liệu...</p>
        </div>
      </Layout>
    );
  }

  // Tính toán thống kê
  const totalSubmissions = submissions.length;
  const submittedCount = submissions.filter(s => s.submitted).length;
  const averageScore = submittedCount > 0 ? 
    (submissions.filter(s => s.submitted).reduce((sum, s) => sum + s.score, 0) / submittedCount).toFixed(2) : 0;
  const onBlockchainCount = blockchainSummary.onBlockchain || 0;

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>🏠 Trang chủ học sinh</h2>
          <p className="text-muted mb-0">Chào mừng bạn đến với hệ thống thi blockchain</p>
        </div>
        <Button 
          variant="outline-primary" 
          onClick={() => navigate("/blockchain-verification")}
        >
          🔗 Xác minh Blockchain
        </Button>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center h-100 border-primary">
            <Card.Body>
              <div className="display-6 text-primary mb-2">📝</div>
              <h3 className="text-primary">{totalSubmissions}</h3>
              <Card.Text>Tổng bài thi</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-success">
            <Card.Body>
              <div className="display-6 text-success mb-2">✅</div>
              <h3 className="text-success">{submittedCount}</h3>
              <Card.Text>Đã hoàn thành</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-info">
            <Card.Body>
              <div className="display-6 text-info mb-2">📊</div>
              <h3 className="text-info">{averageScore}</h3>
              <Card.Text>Điểm trung bình</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-warning">
            <Card.Body>
              <div className="display-6 text-warning mb-2">🔗</div>
              <h3 className="text-warning">{onBlockchainCount}</h3>
              <Card.Text>Trên Blockchain</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Kỳ thi sắp diễn ra */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">📅 Kỳ thi sắp diễn ra</h5>
            </Card.Header>
            <Card.Body>
              {exams.length === 0 ? (
                <div className="text-center py-4">
                  <div className="display-1 text-muted">📝</div>
                  <p className="text-muted">Không có kỳ thi nào sắp diễn ra</p>
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {exams.slice(0, 3).map(exam => (
                    <Card key={exam._id} className="border-start border-primary border-3">
                      <Card.Body className="py-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{exam.title}</h6>
                            <p className="text-muted small mb-2">
                              {exam.description || "Không có mô tả"}
                            </p>
                            <div className="d-flex gap-3">
                              <small className="text-muted">
                                ⏱ {exam.duration} phút
                              </small>
                              <small className="text-muted">
                                📝 {exam.questions?.length || 0} câu
                              </small>
                            </div>
                          </div>
                          <Button 
                            size="sm"
                            variant="outline-primary"
                            onClick={() => navigate(`/exams/${exam._id}`)}
                          >
                            Làm bài
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                  {exams.length > 3 && (
                    <div className="text-center">
                      <Button 
                        variant="link" 
                        onClick={() => navigate("/exams")}
                        className="text-decoration-none"
                      >
                        Xem tất cả ({exams.length}) →
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Lịch sử bài thi */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">📈 Lịch sử bài thi gần đây</h5>
            </Card.Header>
            <Card.Body>
              {submissions.length === 0 ? (
                <div className="text-center py-4">
                  <div className="display-1 text-muted">📊</div>
                  <p className="text-muted">Chưa có bài thi nào</p>
                </div>
              ) : (
                <div>
                  {submissions.slice(0, 5).map((submission, index) => (
                    <div key={submission._id} className="d-flex justify-content-between align-items-center py-2">
                      <div className="flex-grow-1">
                        <div className="fw-medium">{submission.exam?.title || 'Kỳ thi'}</div>
                        <small className="text-muted">
                          {new Date(submission.createdAt).toLocaleDateString('vi-VN')}
                        </small>
                      </div>
                      <div className="text-end">
                        {submission.submitted ? (
                          <div>
                            <Badge bg="success" className="mb-1">
                              {submission.score}/10
                            </Badge>
                            {submission.blockchainTxId && (
                              <div>
                                <Badge bg="warning" size="sm">🔗 BC</Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge bg="secondary">Chưa nộp</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {submissions.length > 5 && (
                    <div className="text-center mt-3">
                      <Button 
                        variant="link" 
                        onClick={() => navigate("/blockchain-verification")}
                        className="text-decoration-none"
                      >
                        Xem tất cả & xác minh blockchain →
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card className="mt-4">
        <Card.Header>
          <h5 className="mb-0">🚀 Thao tác nhanh</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={3}>
              <div className="d-grid">
                <Button 
                  variant="primary" 
                  onClick={() => navigate("/exams")}
                  className="py-3"
                >
                  <div className="display-6 mb-2">📝</div>
                  Tham gia kỳ thi
                </Button>
              </div>
            </Col>
            <Col md={3}>
              <div className="d-grid">
                <Button 
                  variant="success" 
                  onClick={() => navigate("/blockchain-verification")}
                  className="py-3"
                >
                  <div className="display-6 mb-2">🔗</div>
                  Xác minh Blockchain
                </Button>
              </div>
            </Col>
            <Col md={3}>
              <div className="d-grid">
                <Button 
                  variant="info" 
                  onClick={fetchDashboardData}
                  className="py-3"
                >
                  <div className="display-6 mb-2">🔄</div>
                  Làm mới dữ liệu
                </Button>
              </div>
            </Col>
            <Col md={3}>
              <div className="d-grid">
                <Button 
                  variant="warning" 
                  onClick={() => {
                    const user = JSON.parse(localStorage.getItem("user") || "{}");
                    alert(`Thông tin tài khoản:\n\nTên: ${user.name}\nMã SV: ${user.studentId}\nVai trò: ${user.role}`);
                  }}
                  className="py-3"
                >
                  <div className="display-6 mb-2">👤</div>
                  Thông tin tài khoản
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Blockchain Status */}
      {Object.keys(blockchainSummary).length > 0 && (
        <Alert variant="info" className="mt-4">
          <div className="d-flex align-items-center">
            <span className="me-2">🔗</span>
            <div>
              <strong>Trạng thái Blockchain:</strong> {blockchainSummary.onBlockchain}/{blockchainSummary.totalSubmissions} bài thi đã được xác thực trên blockchain 
              {blockchainSummary.averageScore && (
                <span> • Điểm TB: {blockchainSummary.averageScore}</span>
              )}
            </div>
          </div>
        </Alert>
      )}
    </Layout>
  );
};

export default Dashboard;