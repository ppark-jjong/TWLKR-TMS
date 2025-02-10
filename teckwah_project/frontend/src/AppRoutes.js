// src/AppRoutes.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "./components/common/PrivateRoute";
import Layout from "./components/common/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Visualization from "./pages/Visualization";

/**
 * 앱의 라우팅을 처리하는 컴포넌트
 * @returns {JSX.Element} 라우팅 구성 요소
 */
function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        {/* 공개 경로 */}
        <Route path="/login" element={<Login />} />

        {/* 보호된 경로 */}
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/visualization" element={<Visualization />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          {/* 잘못된 경로는 대시보드로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default AppRoutes;
