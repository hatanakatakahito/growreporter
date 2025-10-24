import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SiteProvider } from './contexts/SiteContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/GrowReporter/Login';
import Register from './components/GrowReporter/Register';
import CompleteProfile from './components/GrowReporter/CompleteProfile';
import SiteRegistration from './components/GrowReporter/SiteRegistration';
import Complete from './components/GrowReporter/SiteRegistration/Complete';
import SiteList from './pages/SiteList';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <AuthProvider>
      <SiteProvider>
        <Router>
        <div className="App">
          <Routes>
            {/* 認証関連 */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/register/complete" 
              element={
                <ProtectedRoute>
                  <CompleteProfile />
                </ProtectedRoute>
              } 
            />
            
            {/* サイト管理 */}
            <Route 
              path="/sites/list" 
              element={
                <ProtectedRoute>
                  <SiteList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sites/new" 
              element={
                <ProtectedRoute>
                  <SiteRegistration mode="new" />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sites/:siteId/edit" 
              element={
                <ProtectedRoute>
                  <SiteRegistration mode="edit" />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sites/complete" 
              element={
                <ProtectedRoute>
                  <Complete />
                </ProtectedRoute>
              } 
            />
            
            {/* ダッシュボード */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
        </Router>
      </SiteProvider>
    </AuthProvider>
  );
}

export default App;