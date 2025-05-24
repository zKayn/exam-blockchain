// src/pages/admin/AdminSubmissionDetail.js
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Card, Alert, Badge, Row, Col } from "react-bootstrap";
import Layout from "../../components/Layout";

const AdminSubmissionDetail = () => {
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  const [blockchainData, setBlockchainData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/admin/submissions/${submissionId}`, {
          withCredentials: true
        });
        
        setSubmission(response.data.submission);
        
        // Lấy dữ liệu blockchain nếu có
        if (response.data.submission.blockchainTxId) {
          try {
            const blockchainResponse = await axios.get(
              `http://localhost:5000/api/admin/blockchain/${response.data.submission.blockchainTxId}`,
              { withCredentials: true }
            );
            setBlockchainData(blockchainResponse.data.data);
          } catch (error) {
            console.error("Lỗi lấy dữ liệu blockchain:", error);
          }
        }
      } catch (error) {
        console.error("Lỗi lấy thông tin bài nộp:", error);
        setError(error.response?.data?.message || "Không thể tải thông tin bài nộp");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubmission();
  }, [submissionId]);

  // Tính lại số câu đúng và tổng số câu
  const calculateCorrectAnswers = (submission) => {
    if (!submission || !submission.answers) return { correctAnswers: 0, totalQuestions: 0 };
    
    const correctAnswers = submission.answers.filter(answer => answer.isCorrect).length;
    const totalQuestions = submission.exam.questions.length;
    
    return { correctAnswers, totalQuestions };
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

  if (!submission) {
    return (
      <Layout>
        <Alert variant="warning">Không tìm thấy bài nộp</Alert>
        <Link to="/admin/exams" className="btn btn-primary mt-3">
          Quay lại danh sách
        </Link>
      </Layout>
    );
  }

  // Tính lại số câu đúng
  const { correctAnswers, totalQuestions } = calculateCorrectAnswers(submission);
  
  // Tính lại điểm số
  const calculatedScore = Math.round((correctAnswers / totalQuestions) * 10 * 10) / 10;

  return (
    <Layout>
      <h2 className="mb-4">Chi tiết bài nộp</h2>
      
      <Card className="mb-4">
        <Card.Body>
          <h4 className="mb-3">{submission.exam.title}</h4>
          
          <Row className="mb-4">
            <Col md={4}>
              <strong>Học sinh:</strong> {submission.student.name} ({submission.student.studentId})
            </Col>
            <Col md={4}>
              <strong>Thời gian làm bài:</strong> {new Date(submission.startTime).toLocaleString()}
            </Col>
            <Col md={4}>
              <strong>Thời gian nộp bài:</strong> {submission.endTime ? new Date(submission.endTime).toLocaleString() : "Chưa nộp"}
            </Col>
          </Row>
          
          <Row className="mb-4">
            <Col md={4}>
              <h5>Điểm số</h5>
              <div className="display-4 mb-0">{calculatedScore}</div>
              <p className="text-muted">/ 10 điểm</p>
            </Col>
            <Col md={4}>
              <h5>Số câu đúng</h5>
              <div className="display-4 mb-0">
                {correctAnswers}
              </div>
              <p className="text-muted">/ {totalQuestions} câu</p>
            </Col>
            <Col md={4}>
              <h5>Blockchain</h5>
              <div className="mb-0">
                <Badge bg="success">Đã xác thực</Badge>
              </div>
              <small className="text-muted d-block mt-2 text-truncate">
                TxID: {submission.blockchainTxId}
              </small>
            </Col>
          </Row>
          
          {blockchainData && (
            <div className="mb-4">
              <h5>Dữ liệu Blockchain</h5>
              <pre className="bg-light p-3 border rounded">
                {JSON.stringify(blockchainData, null, 2)}
              </pre>
            </div>
          )}
        </Card.Body>
      </Card>
      
      <h4 className="mb-3">Chi tiết bài làm</h4>
      
      {submission.exam.questions.map((question, index) => {
        // Tìm câu trả lời của người dùng cho câu hỏi này
        const userAnswer = submission.answers.find(a => a.questionIndex === index);
        
        // Nếu không tìm thấy câu trả lời, coi như sai
        const isCorrect = userAnswer ? userAnswer.isCorrect : false;
        const selectedOption = userAnswer ? userAnswer.selectedOption : -1;
        
        return (
          <Card key={index} className={`mb-3 ${isCorrect ? 'border-success' : 'border-danger'}`}>
            <Card.Body>
              <h5 className="mb-3">
                Câu {index + 1}: {question.content}
              </h5>
              
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
      
      <div className="mt-4">
        <Link to={`/admin/exams/${submission.exam._id}`} className="btn btn-primary">
          Quay lại chi tiết kỳ thi
        </Link>
      </div>
    </Layout>
  );
};

export default AdminSubmissionDetail;