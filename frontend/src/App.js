// src/App.js - Cập nhật với routes blockchain
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ExamList from "./pages/ExamList";
import ExamDetails from "./pages/ExamDetails";
import ExamRoom from "./pages/ExamRoom";
import ExamResult from "./pages/ExamResult";

// Student blockchain pages
import BlockchainVerification from "./pages/BlockchainVerification";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminExamList from "./pages/admin/AdminExamList";
import AdminExamDetail from "./pages/admin/AdminExamDetail";
import AdminExamEdit from "./pages/admin/AdminExamEdit";
import AdminCreateExam from "./pages/admin/AdminCreateExam";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminSubmissionDetail from "./pages/admin/AdminSubmissionDetail";
import AdminStudentSubmissions from "./pages/admin/AdminStudentSubmissions";
import AdminBlockchainDashboard from "./pages/admin/AdminBlockchainDashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Student routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/exams" element={<ExamList />} />
        <Route path="/exams/:examId" element={<ExamDetails />} />
        <Route path="/exams/:examId/room" element={<ExamRoom />} />
        <Route path="/exams/:examId/result" element={<ExamResult />} />
        
        {/* Student blockchain routes */}
        <Route path="/blockchain-verification" element={<BlockchainVerification />} />
        
        {/* Admin routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/exams" element={<AdminExamList />} />
        <Route path="/admin/exams/create" element={<AdminCreateExam />} />
        <Route path="/admin/exams/:examId" element={<AdminExamDetail />} />
        <Route path="/admin/exams/:examId/edit" element={<AdminExamEdit />} />
        <Route path="/admin/students" element={<AdminStudents />} />
        <Route path="/admin/submissions/:submissionId" element={<AdminSubmissionDetail />} />
        <Route path="/admin/students/:studentId/submissions" element={<AdminStudentSubmissions />} />
        
        {/* Admin blockchain routes */}
        <Route path="/admin/blockchain" element={<AdminBlockchainDashboard />} />
        
        {/* Default route */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;