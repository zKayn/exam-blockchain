// src/pages/admin/AdminExamEdit.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Form, Button, Alert, Row, Col, Card } from "react-bootstrap";
import Layout from "../../components/Layout";

const AdminExamEdit = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [exam, setExam] = useState({
    title: "",
    description: "",
    duration: 60,
    startTime: "",
    endTime: "",
    questions: []
  });

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/admin/exams/${examId}`, {
          withCredentials: true
        });
        
        const examData = response.data.exam;
        
        // Định dạng ngày giờ cho input datetime-local
        const formatDate = (dateString) => {
          const date = new Date(dateString);
          return date.toISOString().slice(0, 16);
        };
        
        setExam({
          ...examData,
          startTime: formatDate(examData.startTime),
          endTime: formatDate(examData.endTime)
        });
      } catch (error) {
        console.error("Lỗi lấy thông tin kỳ thi:", error);
        setError(error.response?.data?.message || "Không thể tải thông tin kỳ thi");
      } finally {
        setLoading(false);
      }
    };
    
    fetchExam();
  }, [examId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setExam({ ...exam, [name]: value });
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...exam.questions];
    updatedQuestions[index][field] = value;
    setExam({ ...exam, questions: updatedQuestions });
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...exam.questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setExam({ ...exam, questions: updatedQuestions });
  };

  const handleCorrectAnswerChange = (questionIndex, value) => {
    const updatedQuestions = [...exam.questions];
    updatedQuestions[questionIndex].correctAnswer = parseInt(value);
    setExam({ ...exam, questions: updatedQuestions });
  };

  const addQuestion = () => {
    setExam({
      ...exam,
      questions: [
        ...exam.questions,
        {
          content: "",
          options: ["", "", "", ""],
          correctAnswer: 0
        }
      ]
    });
  };

  const removeQuestion = (index) => {
    if (exam.questions.length <= 1) return;
    
    const updatedQuestions = [...exam.questions];
    updatedQuestions.splice(index, 1);
    setExam({ ...exam, questions: updatedQuestions });
  };

  // src/pages/admin/AdminExamEdit.js - Hàm handleSubmit
const handleSubmit = async (e) => {
  e.preventDefault();
  setSaving(true);
  setError("");

  try {
    // Log để kiểm tra
    console.log("Dữ liệu gửi đi:", {
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      startTime: exam.startTime,
      endTime: exam.endTime,
      isActive: exam.isActive,
      questions: exam.questions
    });

    const response = await axios.put(
      `http://localhost:5000/api/admin/exams/${examId}`,
      {
        title: exam.title,
        description: exam.description,
        duration: Number(exam.duration),
        startTime: exam.startTime,
        endTime: exam.endTime,
        isActive: exam.isActive, // Đảm bảo truyền trạng thái kích hoạt
        questions: exam.questions.map(q => ({
          content: q.content,
          options: q.options,
          correctAnswer: Number(q.correctAnswer)
        }))
      },
      { withCredentials: true }
    );
    
    navigate(`/admin/exams/${examId}`);
  } catch (error) {
    console.error("Lỗi cập nhật kỳ thi:", error);
    console.log("Response data:", error.response?.data);
    setError(error.response?.data?.message || "Không thể cập nhật kỳ thi");
    setSaving(false);
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
      <h2 className="mb-4">Chỉnh sửa kỳ thi</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <Card.Body>
            <h4>Thông tin kỳ thi</h4>
            
            <Form.Group className="mb-3">
              <Form.Label>Tên kỳ thi</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={exam.title}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Mô tả</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={exam.description}
                onChange={handleInputChange}
              />
            </Form.Group>
            
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Thời gian làm bài (phút)</Form.Label>
                  <Form.Control
                    type="number"
                    name="duration"
                    value={exam.duration}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Thời gian bắt đầu</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="startTime"
                    value={exam.startTime}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Thời gian kết thúc</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="endTime"
                    value={exam.endTime}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        <h4 className="mb-3">Câu hỏi ({exam.questions.length})</h4>
        
        {exam.questions.map((question, questionIndex) => (
          <Card key={questionIndex} className="mb-4 question-card">
            <Card.Body>
              <div className="d-flex justify-content-between mb-3">
                <h5>Câu hỏi {questionIndex + 1}</h5>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeQuestion(questionIndex)}
                  disabled={exam.questions.length <= 1}
                >
                  Xóa
                </Button>
              </div>
              
              <Form.Group className="mb-3">
                <Form.Label>Nội dung câu hỏi</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={question.content}
                  onChange={(e) => handleQuestionChange(questionIndex, "content", e.target.value)}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Đáp án đúng</Form.Label>
                <Form.Select
                  value={question.correctAnswer}
                  onChange={(e) => handleCorrectAnswerChange(questionIndex, e.target.value)}
                  required
                >
                  <option value={0}>A</option>
                  <option value={1}>B</option>
                  <option value={2}>C</option>
                  <option value={3}>D</option>
                </Form.Select>
              </Form.Group>
              
              <div className="options-container">
                {question.options.map((option, optionIndex) => (
                  <Form.Group key={optionIndex} className="mb-3">
                    <Form.Label>
                      {optionIndex === 0 ? "A" : optionIndex === 1 ? "B" : optionIndex === 2 ? "C" : "D"}
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                      required
                    />
                  </Form.Group>
                ))}
              </div>
            </Card.Body>
          </Card>
        ))}
        
        <div className="d-flex justify-content-between mb-4">
          <Button variant="success" type="button" onClick={addQuestion}>
            Thêm câu hỏi
          </Button>
          
          <div>
            <Button variant="secondary" className="me-2" onClick={() => navigate(`/admin/exams/${examId}`)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu kỳ thi"}
            </Button>
          </div>
        </div>
      </Form>
    </Layout>
  );
};

export default AdminExamEdit;