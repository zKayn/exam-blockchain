import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Table, Button, Modal, Form, Alert } from "react-bootstrap";
import Layout from "../../components/Layout";

const AdminStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  
  // State cho modal thêm học sinh
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    studentId: "",
    name: "",
    password: ""
  });
  
  // State cho modal đặt lại mật khẩu
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/admin/students", {
        withCredentials: true
      });
      setStudents(response.data.students || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách học sinh:", error);
      setError("Không thể tải danh sách học sinh");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewStudent({ ...newStudent, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:5000/api/admin/students",
        newStudent,
        { withCredentials: true }
      );
      
      setStudents([...students, response.data.student]);
      setMessage("Thêm học sinh thành công");
      setShowAddModal(false);
      setNewStudent({
        studentId: "",
        name: "",
        password: ""
      });
    } catch (error) {
      console.error("Lỗi thêm học sinh:", error);
      setError(error.response?.data?.message || "Không thể thêm học sinh");
    }
  };
  
  // Hàm xử lý khi nhấn nút "Xem bài thi"
  const handleViewSubmissions = (studentId) => {
    // Điều hướng đến trang danh sách bài thi của học sinh
    navigate(`/admin/students/${studentId}/submissions`);
  };
  
  // Hàm xử lý khi nhấn nút "Đặt lại mật khẩu"
  const handleResetPassword = (student) => {
    setSelectedStudent(student);
    setNewPassword("");
    setShowPasswordModal(true);
  };
  
  // Hàm xử lý khi xác nhận đặt lại mật khẩu
  const confirmResetPassword = async () => {
    if (!selectedStudent || !newPassword) return;
    
    try {
      await axios.put(
        `http://localhost:5000/api/admin/students/${selectedStudent._id}/reset-password`,
        { password: newPassword },
        { withCredentials: true }
      );
      
      setMessage(`Đặt lại mật khẩu cho ${selectedStudent.name} thành công`);
      setShowPasswordModal(false);
      setSelectedStudent(null);
      setNewPassword("");
    } catch (error) {
      console.error("Lỗi đặt lại mật khẩu:", error);
      setError(error.response?.data?.message || "Không thể đặt lại mật khẩu");
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

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Quản lý học sinh</h2>
        <Button 
          variant="primary"
          onClick={() => setShowAddModal(true)}
        >
          Thêm học sinh
        </Button>
      </div>
      
      {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
      {message && <Alert variant="success" dismissible onClose={() => setMessage("")}>{message}</Alert>}
      
      {students.length === 0 ? (
        <p>Chưa có học sinh nào</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Mã học sinh</th>
              <th>Họ tên</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student._id}>
                <td>{student.studentId}</td>
                <td>{student.name}</td>
                <td>{new Date(student.createdAt).toLocaleString()}</td>
                <td>
                  <Button 
                    variant="info" 
                    size="sm" 
                    className="me-2"
                    onClick={() => handleViewSubmissions(student.studentId)}
                  >
                    Xem bài thi
                  </Button>
                  <Button 
                    variant="warning" 
                    size="sm"
                    onClick={() => handleResetPassword(student)}
                  >
                    Đặt lại mật khẩu
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      
      {/* Modal thêm học sinh */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Thêm học sinh mới</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Mã học sinh</Form.Label>
              <Form.Control
                type="text"
                name="studentId"
                value={newStudent.studentId}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Họ tên</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={newStudent.name}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Mật khẩu</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={newStudent.password}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            
            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={() => setShowAddModal(false)}>
                Hủy
              </Button>
              <Button variant="primary" type="submit">
                Thêm học sinh
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      
      {/* Modal đặt lại mật khẩu */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Đặt lại mật khẩu</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStudent && (
            <>
              <p>Đặt lại mật khẩu cho học sinh: <strong>{selectedStudent.name}</strong></p>
              <Form.Group className="mb-3">
                <Form.Label>Mật khẩu mới</Form.Label>
                <Form.Control
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
            Hủy
          </Button>
          <Button 
            variant="primary" 
            onClick={confirmResetPassword}
            disabled={!newPassword}
          >
            Xác nhận
          </Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default AdminStudents;