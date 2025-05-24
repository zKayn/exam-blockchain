import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Table, Button, Alert, Modal } from "react-bootstrap";
import Layout from "../../components/Layout";

const AdminExamList = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [examToDelete, setExamToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchExams();
    
    // Kiểm tra thông báo từ navigate
    if (location.state?.message) {
      setMessage(location.state.message);
      // Xóa thông báo sau khi đã hiển thị
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const fetchExams = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/admin/exams", {
        withCredentials: true
      });
      setExams(response.data.exams || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách kỳ thi:", error);
      setError("Không thể tải danh sách kỳ thi");
    } finally {
      setLoading(false);
    }
  };

  const toggleExamStatus = async (examId, isActive) => {
    try {
      await axios.put(`http://localhost:5000/api/admin/exams/${examId}/toggle-status`, 
        { isActive: !isActive },
        { withCredentials: true }
      );
      
      // Cập nhật danh sách
      setExams(exams.map(exam => 
        exam._id === examId ? { ...exam, isActive: !isActive } : exam
      ));
      
      setMessage(`Kỳ thi đã được ${!isActive ? 'kích hoạt' : 'hủy kích hoạt'} thành công`);
    } catch (error) {
      console.error("Lỗi thay đổi trạng thái kỳ thi:", error);
      setError("Không thể thay đổi trạng thái kỳ thi");
    }
  };

  const confirmDelete = (exam) => {
    setExamToDelete(exam);
    setShowDeleteModal(true);
    setDeleteError("");
  };

  const handleDelete = async () => {
    if (!examToDelete) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/admin/exams/${examToDelete._id}`, {
        withCredentials: true
      });
      
      // Cập nhật danh sách sau khi xóa
      setExams(exams.filter(exam => exam._id !== examToDelete._id));
      setMessage(`Đã xóa kỳ thi "${examToDelete.title}" thành công`);
      setShowDeleteModal(false);
      setExamToDelete(null);
    } catch (error) {
      console.error("Lỗi xóa kỳ thi:", error);
      setDeleteError(error.response?.data?.message || "Không thể xóa kỳ thi");
    }
  };

  const handleCloseModal = () => {
    setShowDeleteModal(false);
    setExamToDelete(null);
    setDeleteError("");
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

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Quản lý kỳ thi</h2>
        <Button 
          variant="primary"
          onClick={() => navigate("/admin/exams/create")}
        >
          Tạo kỳ thi mới
        </Button>
      </div>
      
      {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
      {message && <Alert variant="success" dismissible onClose={() => setMessage("")}>{message}</Alert>}
      
      {exams.length === 0 ? (
        <p>Chưa có kỳ thi nào</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Tên kỳ thi</th>
              <th>Thời gian</th>
              <th>Số câu hỏi</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {exams.map(exam => (
              <tr key={exam._id}>
                <td>{exam.title}</td>
                <td>{exam.duration} phút</td>
                <td>{exam.questions?.length || 0}</td>
                <td>
                  <span className={`badge ${exam.isActive ? "bg-success" : "bg-secondary"}`}>
                    {exam.isActive ? "Đang diễn ra" : "Chưa diễn ra"}
                  </span>
                </td>
                <td>
                  <Button 
                    variant="info" 
                    size="sm" 
                    className="me-2"
                    onClick={() => navigate(`/admin/exams/${exam._id}`)}
                  >
                    Xem
                  </Button>
                  <Button 
                    variant="warning" 
                    size="sm" 
                    className="me-2"
                    onClick={() => navigate(`/admin/exams/${exam._id}/edit`)}
                  >
                    Sửa
                  </Button>
                  <Button 
                    variant={exam.isActive ? "secondary" : "success"} 
                    size="sm"
                    className="me-2"
                    onClick={() => toggleExamStatus(exam._id, exam.isActive)}
                  >
                    {exam.isActive ? "Dừng" : "Kích hoạt"}
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm"
                    onClick={() => confirmDelete(exam)}
                  >
                    Xóa
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Modal xác nhận xóa kỳ thi */}
      <Modal show={showDeleteModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận xóa kỳ thi</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteError ? (
            <Alert variant="danger">{deleteError}</Alert>
          ) : (
            <>
              <p>Bạn có chắc chắn muốn xóa kỳ thi <strong>{examToDelete?.title}</strong>?</p>
              <p>Hành động này không thể hoàn tác.</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Hủy
          </Button>
          {!deleteError && (
            <Button variant="danger" onClick={handleDelete}>
              Xóa kỳ thi
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default AdminExamList;