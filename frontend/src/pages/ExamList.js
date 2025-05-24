import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Row, Col, Card, Button, Alert } from "react-bootstrap";
import Layout from "../components/Layout";

const ExamList = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/exams", {
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
    
    fetchExams();
  }, []);

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
      <h2 className="mb-4">Danh sách kỳ thi</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {exams.length === 0 ? (
        <p>Không có kỳ thi nào sắp diễn ra</p>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {exams.map(exam => (
            <Col key={exam._id}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>{exam.title}</Card.Title>
                  <Card.Text>
                    {exam.description || "Không có mô tả"}
                  </Card.Text>
                  <div>
                    <small className="text-muted">
                      Thời gian: {exam.duration} phút
                    </small>
                  </div>
                </Card.Body>
                <Card.Footer>
                  <Button 
                    variant="primary" 
                    className="w-100"
                    onClick={() => navigate(`/exams/${exam._id}`)}
                  >
                    Xem chi tiết
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Layout>
  );
};

export default ExamList;