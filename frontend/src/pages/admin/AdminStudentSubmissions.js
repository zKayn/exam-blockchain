import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Table, Alert, Card } from "react-bootstrap";
import Layout from "../../components/Layout";

const AdminStudentSubmissions = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStudentSubmissions();
  }, [studentId]);

  const fetchStudentSubmissions = async () => {
    try {
      // Lấy thông tin học sinh
      const studentResponse = await axios.get(`http://localhost:5000/api/admin/students/${studentId}`, {
        withCredentials: true
      });
      
      setStudent(studentResponse.data.student);
      
      // Lấy danh sách bài nộp của học sinh
      const submissionsResponse = await axios.get(`http://localhost:5000/api/admin/students/${studentId}/submissions`, {
        withCredentials: true
      });
      
      // Lọc ra các bài nộp có đầy đủ thông tin
      const validSubmissions = (submissionsResponse.data.submissions || []).filter(
        submission => submission && submission.exam
      );
      
      setSubmissions(validSubmissions);
    } catch (error) {
      console.error("Lỗi lấy danh sách bài nộp:", error);
      setError(error.response?.data?.message || "Không thể tải danh sách bài nộp");
    } finally {
      setLoading(false);
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
        <Link to="/admin/students" className="btn btn-primary mt-3">
          Quay lại danh sách học sinh
        </Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Bài thi của học sinh</h2>
        <Link to="/admin/students" className="btn btn-primary">
          Quay lại danh sách học sinh
        </Link>
      </div>
      
      {student && (
        <Card className="mb-4">
          <Card.Body>
            <h5>Thông tin học sinh</h5>
            <p className="mb-1"><strong>Mã học sinh:</strong> {student.studentId}</p>
            <p className="mb-0"><strong>Họ tên:</strong> {student.name}</p>
          </Card.Body>
        </Card>
      )}
      
      {submissions.length === 0 ? (
        <Alert variant="info">Học sinh chưa có bài nộp nào</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Kỳ thi</th>
              <th>Thời gian nộp</th>
              <th>Điểm số</th>
              <th>Số câu đúng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map(submission => {
              // Kiểm tra exam có tồn tại không
              if (!submission || !submission.exam) {
                return null;
              }
              
              // Tính số câu đúng
              const correctAnswers = submission.correctAnswers !== undefined 
                ? submission.correctAnswers
                : (submission.answers || []).filter(a => a.isCorrect).length;
              
              // Tổng số câu
              const totalQuestions = submission.totalQuestions !== undefined
                ? submission.totalQuestions
                : (submission.exam.questions || []).length;
              
              return (
                <tr key={submission._id}>
                  <td>{submission.exam.title || "Không có tiêu đề"}</td>
                  <td>{submission.endTime ? new Date(submission.endTime).toLocaleString() : "Chưa nộp"}</td>
                  <td>{submission.score !== undefined ? submission.score : "N/A"}</td>
                  <td>{`${correctAnswers}/${totalQuestions}`}</td>
                  <td>
                    <Link 
                      to={`/admin/submissions/${submission._id}`}
                      className="btn btn-sm btn-primary"
                    >
                      Xem chi tiết
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Layout>
  );
};

export default AdminStudentSubmissions;