// src/pages/admin/AdminBlockchainDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Card, Button, Table, Modal, Form, Row, Col, Badge, Spinner } from 'react-bootstrap';
import Layout from '../../components/Layout';
import axios from 'axios';

const AdminBlockchainDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Dashboard stats
  const [stats, setStats] = useState({});
  const [blockchainStats, setBlockchainStats] = useState({});
  const [verification, setVerification] = useState({});
  
  // Search functionality
  const [searchResults, setSearchResults] = useState([]);
  const [searchCriteria, setSearchCriteria] = useState({
    studentId: '',
    examId: '',
    minScore: '',
    maxScore: '',
    fromDate: '',
    toDate: '',
    sortBy: 'time_desc'
  });
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // System report
  const [systemReport, setSystemReport] = useState({});
  const [showSystemModal, setShowSystemModal] = useState(false);
  
  // Comparison results
  const [comparisonResults, setComparisonResults] = useState({});
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  useEffect(() => {
    // Kiểm tra quyền admin
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user || !user._id || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Lấy thống kê dashboard
      const dashboardResponse = await axios.get('http://localhost:5000/api/admin/dashboard', {
        withCredentials: true
      });
      
      setStats(dashboardResponse.data.stats);
      setBlockchainStats(dashboardResponse.data.blockchain || {});
      
      // Xác minh blockchain
      const verificationResponse = await axios.get('http://localhost:5000/api/admin/blockchain/verify-integrity', {
        withCredentials: true
      });
      
      setVerification(verificationResponse.data.verification);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/blockchain-analytics/search', 
        searchCriteria, 
        { withCredentials: true }
      );
      
      setSearchResults(response.data.results);
      setShowSearchModal(true);
    } catch (error) {
      console.error('Error searching blockchain:', error);
      setError('Không thể tìm kiếm dữ liệu blockchain');
    }
  };

  const handleSystemReport = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/blockchain-analytics/system-report', {
        withCredentials: true
      });
      
      setSystemReport(response.data);
      setShowSystemModal(true);
    } catch (error) {
      console.error('Error getting system report:', error);
      setError('Không thể tạo báo cáo hệ thống');
    }
  };

  const handleCompareAll = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/blockchain/compare-all', {
        withCredentials: true
      });
      
      setComparisonResults(response.data);
      setShowComparisonModal(true);
    } catch (error) {
      console.error('Error comparing all data:', error);
      setError('Không thể so sánh dữ liệu');
    }
  };

  const handleExport = async (format = 'json') => {
    try {
      const response = await axios.get(`http://localhost:5000/api/blockchain-analytics/export?format=${format}`, {
        withCredentials: true,
        responseType: format === 'csv' ? 'blob' : 'json'
      });
      
      if (format === 'csv') {
        // Download CSV file
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `blockchain-export-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Download JSON file
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `blockchain-export-${Date.now()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      
      setMessage('Xuất dữ liệu thành công');
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Không thể xuất dữ liệu');
    }
  };

  const handleMaintenanceTask = async (task) => {
    try {
      const response = await axios.post(`http://localhost:5000/api/maintenance/${task}`, {}, {
        withCredentials: true
      });
      
      setMessage(response.data.message);
    } catch (error) {
      console.error(`Error running ${task}:`, error);
      setError(`Không thể thực hiện tác vụ ${task}`);
    }
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
        <h2>Quản Lý Blockchain</h2>
        <Button variant="outline-primary" onClick={() => navigate('/admin')}>
          Về dashboard
        </Button>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {message && (
        <Alert variant="success" dismissible onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="text-primary">{blockchainStats.totalBlocks || 0}</h3>
              <Card.Text>Tổng Blocks</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="text-success">{blockchainStats.totalSubmissions || 0}</h3>
              <Card.Text>Bài nộp trên BC</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="text-info">{blockchainStats.uniqueStudents || 0}</h3>
              <Card.Text>Học sinh unique</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <Badge bg={verification.valid ? 'success' : 'danger'} className="fs-6">
                {verification.valid ? '✓ Hợp lệ' : '✗ Có lỗi'}
              </Badge>
              <Card.Text className="mt-2">Tính toàn vẹn</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Action Cards */}
      <Row className="mb-4">
        {/* Search Card */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">🔍 Tìm kiếm Blockchain</h5>
            </Card.Header>
            <Card.Body>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Mã học sinh</Form.Label>
                      <Form.Control
                        type="text"
                        value={searchCriteria.studentId}
                        onChange={(e) => setSearchCriteria({...searchCriteria, studentId: e.target.value})}
                        placeholder="21IT123"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Điểm tối thiểu</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        max="10"
                        value={searchCriteria.minScore}
                        onChange={(e) => setSearchCriteria({...searchCriteria, minScore: e.target.value})}
                        placeholder="0"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Button variant="primary" onClick={handleSearch} className="w-100">
                  Tìm kiếm
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Analytics Card */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">📊 Phân tích & Báo cáo</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button variant="info" onClick={handleSystemReport}>
                  📈 Báo cáo hệ thống
                </Button>
                <Button variant="warning" onClick={handleCompareAll}>
                  🔄 So sánh toàn bộ dữ liệu
                </Button>
                <div className="d-flex gap-2">
                  <Button variant="success" onClick={() => handleExport('json')} className="flex-fill">
                    💾 Xuất JSON
                  </Button>
                  <Button variant="outline-success" onClick={() => handleExport('csv')} className="flex-fill">
                    📄 Xuất CSV
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Maintenance Card */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">🔧 Bảo trì hệ thống</h5>
        </Card.Header>
        <Card.Body>
          <div className="row">
            <div className="col-md-3">
              <Button 
                variant="outline-primary" 
                className="w-100 mb-2"
                onClick={() => handleMaintenanceTask('auto-submit')}
              >
                ⏱ Tự động nộp bài
              </Button>
            </div>
            <div className="col-md-3">
              <Button 
                variant="outline-secondary" 
                className="w-100 mb-2"
                onClick={() => handleMaintenanceTask('backup-blockchain')}
              >
                💾 Backup Blockchain
              </Button>
            </div>
            <div className="col-md-3">
              <Button 
                variant="outline-warning" 
                className="w-100 mb-2"
                onClick={() => handleMaintenanceTask('check-consistency')}
              >
                🔍 Kiểm tra nhất quán
              </Button>
            </div>
            <div className="col-md-3">
              <Button 
                variant="outline-info" 
                className="w-100 mb-2"
                onClick={fetchDashboardData}
              >
                🔄 Làm mới
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Blockchain Status */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">🔗 Trạng thái Blockchain</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h6>Thông tin chung</h6>
              <ul className="list-unstyled">
                <li><strong>Tổng blocks:</strong> {verification.blockCount || 0}</li>
                <li><strong>Điểm TB:</strong> {blockchainStats.averageScore || 0}</li>
                <li><strong>Điểm cao nhất:</strong> {blockchainStats.highestScore || 0}</li>
                <li><strong>Điểm thấp nhất:</strong> {blockchainStats.lowestScore || 0}</li>
              </ul>
            </Col>
            <Col md={6}>
              <h6>Tính toàn vẹn</h6>
              <div className={`p-3 rounded ${verification.valid ? 'bg-success' : 'bg-danger'} text-white`}>
                <div className="d-flex align-items-center">
                  <span className="me-2">
                    {verification.valid ? '✓' : '✗'}
                  </span>
                  {verification.message || 'Đang kiểm tra...'}
                </div>
              </div>
              {verification.lastUpdated && (
                <small className="text-muted">
                  Cập nhật lần cuối: {new Date(verification.lastUpdated).toLocaleString('vi-VN')}
                </small>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Search Results Modal */}
      <Modal show={showSearchModal} onHide={() => setShowSearchModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Kết quả tìm kiếm</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {searchResults.length === 0 ? (
            <p className="text-muted">Không tìm thấy kết quả nào</p>
          ) : (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Mã học sinh</th>
                  <th>Kỳ thi</th>
                  <th>Điểm</th>
                  <th>Thời gian</th>
                  <th>Block Index</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((result, index) => (
                  <tr key={index}>
                    <td>{result.studentId}</td>
                    <td>{result.examInfo?.title || 'N/A'}</td>
                    <td>{result.score}</td>
                    <td>{new Date(result.timestamp).toLocaleString('vi-VN')}</td>
                    <td>#{result.blockIndex}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSearchModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      {/* System Report Modal */}
      <Modal show={showSystemModal} onHide={() => setShowSystemModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Báo cáo hệ thống</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {Object.keys(systemReport).length > 0 && (
            <div>
              <h6>Blockchain</h6>
              <pre className="bg-light p-3 rounded">
                {JSON.stringify(systemReport.blockchain, null, 2)}
              </pre>
              
              <h6>Database</h6>
              <pre className="bg-light p-3 rounded">
                {JSON.stringify(systemReport.database, null, 2)}
              </pre>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSystemModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Comparison Results Modal */}
      <Modal show={showComparisonModal} onHide={() => setShowComparisonModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>So sánh toàn bộ dữ liệu</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {Object.keys(comparisonResults).length > 0 && (
            <div>
              {/* Summary */}
              <div className="mb-4 p-3 bg-light rounded">
                <h6>Tóm tắt</h6>
                <Row className="text-center">
                  <Col md={3}>
                    <div className="h4 text-primary mb-0">{comparisonResults.summary?.total || 0}</div>
                    <small>Tổng bài nộp</small>
                  </Col>
                  <Col md={3}>
                    <div className="h4 text-success mb-0">{comparisonResults.summary?.consistent || 0}</div>
                    <small>Nhất quán</small>
                  </Col>
                  <Col md={3}>
                    <div className="h4 text-danger mb-0">{comparisonResults.summary?.inconsistent || 0}</div>
                    <small>Không nhất quán</small>
                  </Col>
                  <Col md={3}>
                    <div className="h4 text-warning mb-0">{comparisonResults.summary?.consistencyRate || 0}%</div>
                    <small>Tỷ lệ nhất quán</small>
                  </Col>
                </Row>
              </div>

              {/* Detailed Results */}
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>Học sinh</th>
                    <th>Kỳ thi</th>
                    <th>Điểm</th>
                    <th>Blockchain TX</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonResults.comparisons?.map((comp, index) => (
                    <tr key={index}>
                      <td>
                        <div>
                          <div className="fw-medium">{comp.student?.name}</div>
                          <small className="text-muted">{comp.student?.studentId}</small>
                        </div>
                      </td>
                      <td>{comp.exam}</td>
                      <td className="fw-bold">{comp.score}</td>
                      <td>
                        <small className="text-break">{comp.blockchainTxId}</small>
                      </td>
                      <td>
                        <Badge bg={comp.verification?.status === 'consistent' ? 'success' : 'danger'}>
                          {comp.verification?.status === 'consistent' ? '✓ Nhất quán' : '✗ Có vấn đề'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowComparisonModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default AdminBlockchainDashboard;