import React, { useState, useEffect } from "react"; // ← Đã thêm dòng này
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, Button, Alert } from "react-bootstrap";
import Layout from "../components/Layout";

const ExamDetails = () => {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/exams/${examId}`, {
          withCredentials: true
        });
        setExam(response.data.exam);
      } catch (error) {
        console.error("Lỗi lấy thông tin kỳ thi:", error);
        setError("Không thể tải thông tin kỳ thi");
      } finally {
        setLoading(false);
      }
    };
    
    fetchExam();
  }, [examId]);

  const startExam = async () => {
    try {
      const response = await axios.post(`http://localhost:5000/api/exams/${examId}/start`, {}, {
        withCredentials: true
      });
      
      if (response.data.submission) {
        navigate(`/exams/${examId}/room`);
      }
    } catch (error) {
      console.error("Lỗi bắt đầu kỳ thi:", error);
      setError(error.response?.data?.message || "Không thể bắt đầu kỳ thi");
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

  if (!exam) {
    return (
      <Layout>
        <Alert variant="danger">Không tìm thấy kỳ thi</Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <h2 className="mb-4">Chi tiết kỳ thi</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Card>
        <Card.Body>
          <Card.Title>{exam.title}</Card.Title>
          <Card.Text>{exam.description || "Không có mô tả"}</Card.Text>
          
          <div className="mb-3">
            <strong>Thời gian làm bài:</strong> {exam.duration} phút
          </div>
          
          <div className="mb-3">
            <strong>Thời gian bắt đầu:</strong> {new Date(exam.startTime).toLocaleString()}
          </div>
          
          <div className="mb-3">
            <strong>Thời gian kết thúc:</strong> {new Date(exam.endTime).toLocaleString()}
          </div>
          
          <div className="mb-3">
            <strong>Số câu hỏi:</strong> {exam.questions?.length || 0}
          </div>
          
          <Button 
            variant="primary" 
            onClick={startExam}
            disabled={!exam.isActive}
          >
            {exam.isActive ? "Bắt đầu làm bài" : "Kỳ thi chưa bắt đầu"}
          </Button>
        </Card.Body>
      </Card>
    </Layout>
  );
};

export default ExamDetails;
