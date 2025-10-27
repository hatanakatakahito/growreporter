import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './config/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import { SiteProvider } from './contexts/SiteContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/GrowReporter/Login';
import Register from './components/GrowReporter/Register';
import CompleteProfile from './components/GrowReporter/CompleteProfile';
import SiteRegistration from './components/GrowReporter/SiteRegistration';
import Complete from './components/GrowReporter/SiteRegistration/Complete';
import SiteList from './pages/SiteList';
import Dashboard from './pages/Dashboard';
import AnalysisSummary from './pages/Analysis/AnalysisSummary';
import Day from './pages/Analysis/Day';
import Week from './pages/Analysis/Week';
import Hour from './pages/Analysis/Hour';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
            
            {/* 分析 */}
            <Route 
              path="/analysis/summary" 
              element={
                <ProtectedRoute>
                  <AnalysisSummary />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analysis/day" 
              element={
                <ProtectedRoute>
                  <Day />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analysis/week" 
              element={
                <ProtectedRoute>
                  <Week />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analysis/hour" 
              element={
                <ProtectedRoute>
                  <Hour />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
        </Router>
      </SiteProvider>
    </AuthProvider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
  );
}

export default App;