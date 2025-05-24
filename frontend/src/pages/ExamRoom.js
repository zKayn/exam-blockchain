// src/pages/ExamRoom.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Form, Button, Alert, ProgressBar, Card } from "react-bootstrap";
import Layout from "../components/Layout";

const ExamRoom = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);

  useEffect(() => {
    // Kiểm tra đăng nhập
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user || !user._id) {
      navigate("/login");
      return;
    }

    // Lấy thông tin bài thi và trạng thái làm bài
    const fetchExamAndStatus = async () => {
      try {
        const [examResponse, statusResponse] = await Promise.all([
          axios.get(`http://localhost:5000/api/exams/${examId}`, {
            withCredentials: true
          }),
          axios.get(`http://localhost:5000/api/exams/${examId}/status`, {
            withCredentials: true
          })
        ]);

        setExam(examResponse.data.exam);

        // Khởi tạo mảng đáp án
        const initialAnswers = examResponse.data.exam.questions.map(
          (_, index) => ({
            questionIndex: index,
            selectedOption: -1
          })
        );

        // Kiểm tra trạng thái làm bài
        const { status } = statusResponse.data;

        if (status === "submitted") {
          // Đã nộp bài, chuyển đến trang kết quả
          navigate(`/exams/${examId}/result`);
          return;
        } else if (status === "in_progress") {
          // Đang làm bài
          setSubmission(statusResponse.data.submission);
          setTimeLeft(statusResponse.data.timeLeft);

          // Nếu đã có đáp án, cập nhật
          if (statusResponse.data.submission.answers.length > 0) {
            setAnswers(statusResponse.data.submission.answers);
          } else {
            setAnswers(initialAnswers);
          }
        } else {
          // Bắt đầu làm bài
          try {
            const startResponse = await axios.post(
              `http://localhost:5000/api/exams/${examId}/start`,
              {},
              { withCredentials: true }
            );
            setSubmission(startResponse.data.submission);
            setAnswers(initialAnswers);
            setTimeLeft(examResponse.data.exam.duration * 60 * 1000); // Convert to milliseconds
          } catch (error) {
            console.error("Lỗi bắt đầu bài thi:", error);
            setError(error.response?.data?.message || "Không thể bắt đầu bài thi");
            setTimeout(() => navigate(`/exams/${examId}`), 3000);
            return;
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Lỗi tải thông tin bài thi:", error);
        setError(error.response?.data?.message || "Không thể tải thông tin bài thi");
        setLoading(false);
      }
    };

    fetchExamAndStatus();

    // Đếm ngược thời gian
    const timerInterval = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1000) {
          clearInterval(timerInterval);
          handleSubmit();
          return 0;
        }
        return prevTime - 1000;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [examId, navigate]);

  const handleSelectAnswer = (questionIndex, optionIndex) => {
    setAnswers(
      answers.map(answer =>
        answer.questionIndex === questionIndex
          ? { ...answer, selectedOption: optionIndex }
          : answer
      )
    );
  };

  const handleSubmit = async () => {
    if (submitting) return;
    
    setSubmitting(true);
    setError("");

    try {
      await axios.post(
        `http://localhost:5000/api/exams/${examId}/submit`,
        { answers },
        { withCredentials: true }
      );
      
      navigate(`/exams/${examId}/result`);
    } catch (error) {
      console.error("Lỗi nộp bài:", error);
      setError(error.response?.data?.message || "Không thể nộp bài");
      setSubmitting(false);
    }
  };

  const formatTime = (ms) => {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const nextQuestion = () => {
    if (currentQuestion < exam.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
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

  const question = exam.questions[currentQuestion];
  const answer = answers.find(a => a.questionIndex === currentQuestion);

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{exam.title}</h2>
        <div className="d-flex align-items-center">
          <div className="me-3">
            <strong>Thời gian còn lại: </strong>
            <span className={timeLeft < 300000 ? "text-danger" : ""}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Đang nộp bài..." : "Nộp bài"}
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="mb-3">
        <ProgressBar now={(currentQuestion + 1) / exam.questions.length * 100} />
        <div className="text-end mt-1">
          <small>
            Câu hỏi {currentQuestion + 1}/{exam.questions.length}
          </small>
        </div>
      </div>

      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">Câu {currentQuestion + 1}: {question.content}</h5>
          
          <Form>
            {question.options.map((option, optionIndex) => (
              <Form.Check
                key={optionIndex}
                type="radio"
                id={`question-${currentQuestion}-option-${optionIndex}`}
                label={`${optionIndex === 0 ? 'A' : optionIndex === 1 ? 'B' : optionIndex === 2 ? 'C' : 'D'}: ${option}`}
                name={`question-${currentQuestion}`}
                checked={answer.selectedOption === optionIndex}
                onChange={() => handleSelectAnswer(currentQuestion, optionIndex)}
                className="mb-2"
              />
            ))}
          </Form>
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-between">
        <Button
          variant="secondary"
          onClick={prevQuestion}
          disabled={currentQuestion === 0}
        >
          Câu trước
        </Button>
        <div>
          <span className="me-2">
            {answers.filter(a => a.selectedOption !== -1).length}/{exam.questions.length} câu đã trả lời
          </span>
        </div>
        <Button
          variant="primary"
          onClick={nextQuestion}
          disabled={currentQuestion === exam.questions.length - 1}
        >
          Câu tiếp theo
        </Button>
      </div>
    </Layout>
  );
};

export default ExamRoom;