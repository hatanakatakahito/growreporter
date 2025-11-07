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
import AnalysisNavigation from './pages/Analysis/AnalysisNavigation';
import AnalysisSummary from './pages/Analysis/AnalysisSummary';
import Day from './pages/Analysis/Day';
import Week from './pages/Analysis/Week';
import Hour from './pages/Analysis/Hour';
import Users from './pages/Users';
import AcquisitionChannels from './pages/AcquisitionChannels';
import Keywords from './pages/Keywords';
import Referrals from './pages/Referrals';
import Pages from './pages/Pages';
import PageCategories from './pages/PageCategories';
import LandingPages from './pages/LandingPages';
import FileDownloads from './pages/FileDownloads';
import ExternalLinks from './pages/ExternalLinks';
import ConversionList from './pages/ConversionList';
import ReverseFlow from './pages/ReverseFlow';
import Improve from './pages/Improve';
import Reports from './pages/Reports';
import AccountSettings from './pages/AccountSettings';
import OAuthCallback from './components/OAuthCallback';

// Admin
import AdminRoute from './components/Admin/AdminRoute';
import AdminLayout from './components/Admin/AdminLayout';
import AdminDashboard from './pages/Admin/Dashboard';
import UserList from './pages/Admin/Users/UserList';
import UserDetail from './pages/Admin/Users/UserDetail';
import AdminSiteList from './pages/Admin/Sites/SiteList';
import AdminSiteDetail from './pages/Admin/Sites/SiteDetail';
import ActivityLogs from './pages/Admin/Logs/ActivityLogs';
import AdminSettings from './pages/Admin/Settings/AdminSettings';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SiteProvider>
          <Router>
          <div className="App">
          <Routes>
            {/* OAuth コールバック（認証不要） */}
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            
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
              path="/analysis" 
              element={
                <ProtectedRoute>
                  <AnalysisNavigation />
                </ProtectedRoute>
              } 
            />
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
            
            {/* 集客 */}
            <Route 
              path="/acquisition/channels" 
              element={
                <ProtectedRoute>
                  <AcquisitionChannels />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/acquisition/keywords" 
              element={
                <ProtectedRoute>
                  <Keywords />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/acquisition/referrals" 
              element={
                <ProtectedRoute>
                  <Referrals />
                </ProtectedRoute>
              } 
            />
            
            {/* エンゲージメント */}
            <Route 
              path="/engagement/pages" 
              element={
                <ProtectedRoute>
                  <Pages />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/engagement/page-categories" 
              element={
                <ProtectedRoute>
                  <PageCategories />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/engagement/landing-pages" 
              element={
                <ProtectedRoute>
                  <LandingPages />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/engagement/file-downloads" 
              element={
                <ProtectedRoute>
                  <FileDownloads />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/engagement/external-links" 
              element={
                <ProtectedRoute>
                  <ExternalLinks />
                </ProtectedRoute>
              } 
            />
            
            {/* コンバージョン */}
            <Route 
              path="/conversion/list" 
              element={
                <ProtectedRoute>
                  <ConversionList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/conversion/reverse-flow" 
              element={
                <ProtectedRoute>
                  <ReverseFlow />
                </ProtectedRoute>
              } 
            />
            
            {/* 改善する */}
            <Route 
              path="/improve" 
              element={
                <ProtectedRoute>
                  <Improve />
                </ProtectedRoute>
              } 
            />
            
            {/* 評価する */}
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              } 
            />
            
            {/* ユーザー管理 */}
            <Route 
              path="/users" 
              element={
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              } 
            />
            
            {/* アカウント設定 */}
            <Route 
              path="/account/settings" 
              element={
                <ProtectedRoute>
                  <AccountSettings />
                </ProtectedRoute>
              } 
            />
            
            {/* 管理画面 */}
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<UserList />} />
              <Route path="users/:uid" element={<UserDetail />} />
              <Route path="sites" element={<AdminSiteList />} />
              <Route path="sites/:siteId" element={<AdminSiteDetail />} />
              <Route path="logs" element={<ActivityLogs />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
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