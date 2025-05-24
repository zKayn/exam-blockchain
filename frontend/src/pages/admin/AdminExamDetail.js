// Thêm vào AdminExamDetail.js

import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Card, Alert, Badge, Button, Table, Modal } from "react-bootstrap";
import Layout from "../../components/Layout";

const AdminExamDetail = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  
  // Thêm state cho modal xác nhận xóa
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchExamAndSubmissions();
  }, [examId]);

  const fetchExamAndSubmissions = async () => {
    try {
      const examResponse = await axios.get(`http://localhost:5000/api/admin/exams/${examId}`, {
        withCredentials: true
      });
      
      const submissionsResponse = await axios.get(`http://localhost:5000/api/admin/exams/${examId}/submissions`, {
        withCredentials: true
      });
      
      setExam(examResponse.data.exam);
      setSubmissions(submissionsResponse.data.submissions);
    } catch (error) {
      console.error("Lỗi lấy thông tin kỳ thi:", error);
      setError(error.response?.data?.message || "Không thể tải thông tin kỳ thi");
    } finally {
      setLoading(false);
    }
  };

  const toggleExamStatus = async () => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/admin/exams/${examId}/toggle-status`,
        { isActive: !exam.isActive },
        { withCredentials: true }
      );
      
      setExam(response.data.exam);
      setStatusMessage(`Kỳ thi đã được ${response.data.exam.isActive ? 'kích hoạt' : 'hủy kích hoạt'}`);
    } catch (error) {
      console.error("Lỗi chuyển trạng thái kỳ thi:", error);
      setError(error.response?.data?.message || "Không thể cập nhật trạng thái kỳ thi");
    }
  };
  
  // Thêm hàm xóa kỳ thi
  const deleteExam = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/admin/exams/${examId}`, {
        withCredentials: true
      });
      
      // Đóng modal và chuyển hướng về trang danh sách kỳ thi
      setShowDeleteModal(false);
      navigate("/admin/exams", { state: { message: "Đã xóa kỳ thi thành công" } });
    } catch (error) {
      console.error("Lỗi xóa kỳ thi:", error);
      setError(error.response?.data?.message || "Không thể xóa kỳ thi");
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center">
          <p>Đang tải...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Alert variant="danger">{error}</Alert>
        <Link to="/admin/exams" className="btn btn-primary mt-3">
          Quay lại danh sách
        </Link>
      </Layout>
    );
  }

  if (!exam) {
    return (
      <Layout>
        <Alert variant="warning">Không tìm thấy kỳ thi</Alert>
        <Link to="/admin/exams" className="btn btn-primary mt-3">
          Quay lại danh sách
        </Link>
      </Layout>
    );
  }

  return (
    <Layout>
      {statusMessage && (
        <Alert 
          variant="success" 
          dismissible 
          onClose={() => setStatusMessage("")}
        >
          {statusMessage}
        </Alert>
      )}
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Chi tiết kỳ thi</h2>
        <div>
          <Link to={`/admin/exams/${examId}/edit`} className="btn btn-primary me-2">
            Chỉnh sửa
          </Link>
          <Button 
            variant={exam.isActive ? "warning" : "success"}
            onClick={toggleExamStatus}
            className="me-2"
          >
            {exam.isActive ? "Hủy kích hoạt" : "Kích hoạt"}
          </Button>
          
          {/* Thêm nút xóa kỳ thi */}
          <Button 
            variant="danger" 
            onClick={() => setShowDeleteModal(true)}
          >
            Xóa kỳ thi
          </Button>
        </div>
      </div>
      
      <Card className="mb-4">
        <Card.Body>
          <h3>{exam.title}</h3>
          <p>{exam.description}</p>
          
          <div className="row mt-4">
            <div className="col-md-3">
              <strong>Trạng thái:</strong>
              <Badge bg={exam.isActive ? "success" : "secondary"} className="ms-2">
                {exam.isActive ? "Đang kích hoạt" : "Chưa kích hoạt"}
              </Badge>
            </div>
            
            <div className="col-md-3">
              <strong>Thời gian làm bài:</strong> {exam.duration} phút
            </div>
            
            <div className="col-md-3">
              <strong>Bắt đầu:</strong> {new Date(exam.startTime).toLocaleString()}
            </div>
            
            <div className="col-md-3">
              <strong>Kết thúc:</strong> {new Date(exam.endTime).toLocaleString()}
            </div>
          </div>
        </Card.Body>
      </Card>
      
      <h4 className="mb-3">Danh sách câu hỏi ({exam.questions.length})</h4>
      
      {exam.questions.map((question, index) => (
        <Card key={index} className="mb-3">
          <Card.Body>
            <h5>Câu {index + 1}: {question.content}</h5>
            
            <ul className="list-group mt-3">
              {question.options.map((option, optIndex) => (
                <li 
                  key={optIndex}
                  className={`list-group-item ${optIndex === question.correctAnswer ? 'list-group-item-success' : ''}`}
                >
                  {optIndex === 0 ? 'A' : optIndex === 1 ? 'B' : optIndex === 2 ? 'C' : 'D'}: {option}
                  {optIndex === question.correctAnswer && (
                    <Badge bg="success" className="ms-2">Đáp án đúng</Badge>
                  )}
                </li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      ))}
      
      <h4 className="mb-3 mt-4">Bài nộp ({submissions.length})</h4>
      
      {submissions.length > 0 ? (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Mã học sinh</th>
              <th>Tên học sinh</th>
              <th>Thời gian nộp</th>
              <th>Điểm số</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr key={submission._id}>
                <td>{submission.student.studentId}</td>
                <td>{submission.student.name}</td>
                <td>{submission.endTime ? new Date(submission.endTime).toLocaleString() : "Chưa nộp"}</td>
                <td>{submission.score}</td>
                <td>
                  <Link 
                    to={`/admin/submissions/${submission._id}`}
                    className="btn btn-sm btn-primary"
                  >
                    Xem chi tiết
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Alert variant="info">Chưa có bài nộp</Alert>
      )}
      
      {/* Modal xác nhận xóa kỳ thi */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận xóa kỳ thi</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {submissions.length > 0 ? (
            <Alert variant="warning">
              Không thể xóa kỳ thi này vì đã có {submissions.length} bài nộp.
            </Alert>
          ) : (
            <>
              <p>Bạn có chắc chắn muốn xóa kỳ thi <strong>{exam.title}</strong>?</p>
              <p>Hành động này không thể hoàn tác.</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Hủy
          </Button>
          {submissions.length === 0 && (
            <Button variant="danger" onClick={deleteExam}>
              Xóa kỳ thi
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default AdminExamDetail;