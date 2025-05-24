// src/pages/ExamResult.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Alert, Card, Badge, Button, Row, Col } from "react-bootstrap";
import Layout from "../components/Layout";

const ExamResult = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/exams/${examId}/result`, {
          withCredentials: true
        });
        setResult(response.data.submission);
      } catch (error) {
        console.error("Lỗi lấy kết quả bài thi:", error);
        setError(error.response?.data?.message || "Không thể tải kết quả bài thi");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [examId]);

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
        <Link to="/dashboard" className="btn btn-primary mt-3">
          Về trang chủ
        </Link>
      </Layout>
    );
  }

  if (!result) {
    return (
      <Layout>
        <Alert variant="warning">Không tìm thấy kết quả bài thi</Alert>
        <Link to="/dashboard" className="btn btn-primary mt-3">
          Về trang chủ
        </Link>
      </Layout>
    );
  }

  // Sửa: Tính toán chính xác số câu đúng/tổng số câu
  const correctAnswers = result.answers.filter(answer => answer.isCorrect).length;
  const totalQuestions = result.exam.questions.length;
  
  // Sửa: Tính điểm đúng theo thang 10
  const calculatedScore = Math.round((correctAnswers / totalQuestions) * 10 * 10) / 10; // Làm tròn đến 1 chữ số thập phân
  
  // Sửa: Tính phần trăm đúng
  const percentage = Math.round((correctAnswers / totalQuestions) * 100 * 10) / 10; // Làm tròn đến 1 chữ số thập phân

  return (
    <Layout>
      <h2 className="mb-4">Kết quả bài thi: {result.exam.title}</h2>

      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4} className="text-center mb-3 mb-md-0">
              <h3 className="mb-0">{calculatedScore}</h3>
              <p className="text-muted mb-0">Điểm số</p>
            </Col>
            <Col md={4} className="text-center mb-3 mb-md-0">
              <h3 className="mb-0">{correctAnswers}/{totalQuestions}</h3>
              <p className="text-muted mb-0">Câu đúng</p>
            </Col>
            <Col md={4} className="text-center">
              <h3 className="mb-0">
                <Badge bg={percentage >= 50 ? "success" : "danger"}>
                  {percentage.toFixed(1)}%
                </Badge>
              </h3>
              <p className="text-muted mb-0">Tỷ lệ đúng</p>
            </Col>
          </Row>
          
          <hr />
          
          <div className="mb-3">
            <strong>Thời gian nộp bài:</strong> {result.endTime ? new Date(result.endTime).toLocaleString() : "N/A"}
          </div>
          
          <div className="mb-3">
            <strong>Mã xác thực blockchain:</strong>
            <small className="d-block text-muted">{result.blockchainTxId || "Chưa có"}</small>
          </div>
        </Card.Body>
      </Card>

      <h4>Chi tiết bài làm</h4>
      
      {result.exam.questions.map((question, index) => {
        // Tìm câu trả lời của người dùng cho câu hỏi này
        const userAnswer = result.answers.find(a => a.questionIndex === index);
        
        // Nếu không tìm thấy câu trả lời, coi như sai
        const isCorrect = userAnswer ? userAnswer.isCorrect : false;
        const selectedOption = userAnswer ? userAnswer.selectedOption : -1;
        
        return (
          <Card key={index} className={`mb-3 ${isCorrect ? 'border-success' : 'border-danger'}`}>
            <Card.Body>
              <h5 className="mb-3">Câu {index + 1}: {question.content}</h5>
              
              <div className="mb-3">
                {question.options.map((option, optionIndex) => (
                  <div 
                    key={optionIndex}
                    className={`mb-2 p-2 rounded ${
                      optionIndex === selectedOption 
                        ? (isCorrect ? 'bg-success text-white' : 'bg-danger text-white')
                        : optionIndex === question.correctAnswer 
                          ? 'bg-success text-white'
                          : ''
                    }`}
                  >
                    {optionIndex === 0 ? 'A' : optionIndex === 1 ? 'B' : optionIndex === 2 ? 'C' : 'D'}: {option}
                  </div>
                ))}
              </div>
              
              <div>
                {isCorrect ? (
                  <Badge bg="success">Đáp án đúng</Badge>
                ) : (
                  <Badge bg="danger">
                    Đáp án sai (Đáp án đúng: {
                      question.correctAnswer === 0 ? 'A' : 
                      question.correctAnswer === 1 ? 'B' : 
                      question.correctAnswer === 2 ? 'C' : 'D'
                    })
                  </Badge>
                )}
              </div>
            </Card.Body>
          </Card>
        );
      })}
      
      <div className="text-center mt-4">
        <Link to="/dashboard" className="btn btn-primary">
          Về trang chủ
        </Link>
      </div>
    </Layout>
  );
};

export default ExamResult;