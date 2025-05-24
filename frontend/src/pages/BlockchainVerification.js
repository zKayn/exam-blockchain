// src/pages/BlockchainVerification.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Card, Button, Table, Modal, Spinner, Badge } from 'react-bootstrap';
import Layout from '../components/Layout';
import axios from 'axios';

const BlockchainVerification = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({});
  const [selectedResult, setSelectedResult] = useState(null);
  const [verificationData, setVerificationData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [comparisons, setComparisons] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    // Kiểm tra đăng nhập
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user || !user._id) {
      navigate('/login');
      return;
    }
    
    fetchBlockchainResults();
  }, [navigate]);

  const fetchBlockchainResults = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/student-blockchain/my-blockchain-results', {
        withCredentials: true
      });
      
      setResults(response.data.results);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching blockchain results:', error);
      setError('Không thể tải dữ liệu blockchain');
    } finally {
      setLoading(false);
    }
  };

  const verifySubmission = async (submissionId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/student-blockchain/verify-submission/${submissionId}`, {
        withCredentials: true
      });
      
      setVerificationData(response.data);
      setShowModal(true);
    } catch (error) {
      console.error('Error verifying submission:', error);
      setError('Không thể xác minh bài nộp');
    }
  };

  const compareScores = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/student-blockchain/compare-scores', {
        withCredentials: true
      });
      
      setComparisons(response.data.comparisons);
      setShowComparison(true);
      setShowModal(true);
    } catch (error) {
      console.error('Error comparing scores:', error);
      setError('Không thể so sánh điểm số');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setVerificationData(null);
    setComparisons([]);
    setShowComparison(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Đang tải dữ liệu blockchain...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Xác Minh Blockchain</h2>
        <Button variant="outline-primary" onClick={() => navigate('/dashboard')}>
          Về trang chủ
        </Button>
      </div>
      
      <p className="text-muted mb-4">
        Kiểm tra và xác minh kết quả thi của bạn trên blockchain
      </p>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="text-primary">{summary.totalSubmissions || 0}</h3>
              <Card.Text>Tổng bài thi</Card.Text>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="text-success">{summary.onBlockchain || 0}</h3>
              <Card.Text>Trên Blockchain</Card.Text>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="text-info">{summary.averageScore || 0}</h3>
              <Card.Text>Điểm trung bình</Card.Text>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Badge bg="success" className="fs-6">100%</Badge>
              <Card.Text className="mt-2">Tỷ lệ xác thực</Card.Text>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <Card className="mb-4">
        <Card.Body>
          <h5>Thao tác</h5>
          <div className="d-flex flex-wrap gap-2">
            <Button variant="primary" onClick={fetchBlockchainResults}>
              🔄 Làm mới dữ liệu
            </Button>
            <Button variant="success" onClick={compareScores}>
              📊 So sánh điểm số
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Results Table */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">Kết quả thi của bạn ({results.length})</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {results.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">Chưa có kết quả thi nào</p>
            </div>
          ) : (
            <Table striped hover responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Kỳ thi</th>
                  <th>Điểm số</th>
                  <th>Câu đúng</th>
                  <th>Blockchain</th>
                  <th>Thời gian</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index}>
                    <td>
                      <div>
                        <div className="fw-medium">{result.submission.exam.title}</div>
                        <small className="text-muted">
                          {result.submission.exam.duration} phút
                        </small>
                      </div>
                    </td>
                    <td>
                      <div className="fw-bold text-primary">
                        {result.submission.score}/10
                      </div>
                      <small className="text-muted">
                        {((result.submission.score / 10) * 100).toFixed(1)}%
                      </small>
                    </td>
                    <td>
                      <span className="fw-medium">
                        {result.submission.correctAnswers}/{result.submission.totalQuestions}
                      </span>
                    </td>
                    <td>
                      {result.hasBlockchainData ? (
                        <Badge bg="success">
                          ✓ Đã xác thực
                        </Badge>
                      ) : (
                        <Badge bg="secondary">
                          ⚠ Chưa có
                        </Badge>
                      )}
                    </td>
                    <td>
                      <small className="text-muted">
                        {new Date(result.submission.createdAt).toLocaleDateString('vi-VN')}
                      </small>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => verifySubmission(result.submission._id)}
                      >
                        👁 Xem chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Verification Modal */}
      <Modal show={showModal} onHide={closeModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {showComparison ? 'So sánh điểm số' : 'Chi tiết xác minh Blockchain'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {showComparison ? (
            <div>
              {/* Summary for comparison */}
              <div className="mb-4 p-3 bg-light rounded">
                <h6>Tóm tắt so sánh</h6>
                <div className="row text-center">
                  <div className="col-3">
                    <div className="h4 text-primary mb-0">{comparisons.length}</div>
                    <small>Tổng bài thi</small>
                  </div>
                  <div className="col-3">
                    <div className="h4 text-success mb-0">
                      {comparisons.filter(c => c.isConsistent).length}
                    </div>
                    <small>Nhất quán</small>
                  </div>
                  <div className="col-3">
                    <div className="h4 text-info mb-0">
                      {comparisons.filter(c => c.blockchainScore !== null).length}
                    </div>
                    <small>Trên Blockchain</small>
                  </div>
                  <div className="col-3">
                    <div className="h4 text-warning mb-0">100%</div>
                    <small>Tỷ lệ nhất quán</small>
                  </div>
                </div>
              </div>

              <Table striped hover>
                <thead>
                  <tr>
                    <th>Kỳ thi</th>
                    <th>Điểm DB</th>
                    <th>Điểm BC</th>
                    <th>Trạng thái</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((comp, index) => (
                    <tr key={index}>
                      <td>{comp.exam}</td>
                      <td className="fw-bold">{comp.databaseScore}</td>
                      <td className="fw-bold">{comp.blockchainScore}</td>
                      <td>
                        <Badge bg={comp.isConsistent ? 'success' : 'danger'}>
                          {comp.isConsistent ? '✓ Nhất quán' : '✗ Không nhất quán'}
                        </Badge>
                      </td>
                      <td>
                        <small>{new Date(comp.createdAt).toLocaleDateString('vi-VN')}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : verificationData ? (
            <div>
              {/* Exam info */}
              <div className="mb-4 p-3 bg-light rounded">
                <h6>{verificationData.submission.exam.title}</h6>
                <div className="row text-center">
                  <div className="col-4">
                    <div className="h4 text-primary mb-0">{verificationData.submission.score}/10</div>
                    <small>Điểm số</small>
                  </div>
                  <div className="col-4">
                    <div className="h4 text-success mb-0">
                      {verificationData.submission.correctAnswers}/{verificationData.submission.totalQuestions}
                    </div>
                    <small>Câu đúng</small>
                  </div>
                  <div className="col-4">
                    <div className={`h4 mb-0 ${verificationData.verification.consistent ? 'text-success' : 'text-danger'}`}>
                      {verificationData.verification.consistent ? '✓' : '✗'}
                    </div>
                    <small>Xác minh</small>
                  </div>
                </div>
              </div>

              {/* Blockchain info */}
              <div className="mb-4">
                <h6>Thông tin Blockchain</h6>
                <div className="p-3 bg-light rounded">
                  <div className="row">
                    <div className="col-md-6">
                      <strong>Hash:</strong>
                      <div className="small text-break text-muted">
                        {verificationData.blockchain?.hash}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <strong>Block Index:</strong>
                      <div className="text-muted">
                        {verificationData.blockchain?.blockIndex}
                      </div>
                    </div>
                    <div className="col-md-6 mt-2">
                      <strong>Timestamp:</strong>
                      <div className="text-muted">
                        {verificationData.blockchain?.timestamp ? 
                          new Date(verificationData.blockchain.timestamp).toLocaleString('vi-VN') 
                          : 'N/A'
                        }
                      </div>
                    </div>
                    <div className="col-md-6 mt-2">
                      <strong>Xác thực:</strong>
                      <div className="text-success">✓ Đã xác thực</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification result */}
              <div className="mb-3">
                <h6>Kết quả xác minh</h6>
                <Alert variant={verificationData.verification.consistent ? 'success' : 'danger'}>
                  <div className="d-flex align-items-center">
                    <span className="me-2">
                      {verificationData.verification.consistent ? '✓' : '✗'}
                    </span>
                    {verificationData.verification.message}
                  </div>
                </Alert>
              </div>
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default BlockchainVerification;