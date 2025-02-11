// frontend/src/appRoutes.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "./components/common/PrivateRoute";
import Layout from "./components/common/Layout";
import Login from "./pages/loginPage";
import Dashboard from "./pages/dashboardPage";
import Visualization from "./pages/visualizationPage";

const AppRoutes = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* 공개 경로 */}
        <Route path="/login" element={<Login />} />

        {/* 보호된 경로 */}
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/visualization" element={<Visualization />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
};

export default AppRoutes;