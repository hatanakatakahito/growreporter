import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './config/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import { SiteProvider } from './contexts/SiteContext';
import { SidebarProvider } from './contexts/SidebarContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/GrowReporter/Login';
import Register from './components/GrowReporter/Register';
import CompleteProfile from './components/GrowReporter/CompleteProfile';
import SiteRegistration from './components/GrowReporter/SiteRegistration/index';
import Complete from './components/GrowReporter/SiteRegistration/Complete';
import MainLayout from './components/Layout/MainLayout';
import SiteList from './pages/SiteList';
import SiteDetail from './pages/SiteDetail';
import Dashboard from './pages/Dashboard';
import AnalysisSummary from './pages/Analysis/AnalysisSummary';
import Day from './pages/Analysis/Day';
import Week from './pages/Analysis/Week';
import Hour from './pages/Analysis/Hour';
import Users from './pages/Analysis/Users';
import AcquisitionChannels from './pages/Analysis/AcquisitionChannels';
import Keywords from './pages/Analysis/Keywords';
import Referrals from './pages/Analysis/Referrals';
import Pages from './pages/Analysis/Pages';
import PageCategories from './pages/Analysis/PageCategories';
import LandingPages from './pages/Analysis/LandingPages';
import FileDownloads from './pages/Analysis/FileDownloads';
import ExternalLinks from './pages/Analysis/ExternalLinks';
import PageFlow from './pages/Analysis/PageFlow';
import ConversionList from './pages/Analysis/ConversionList';
import ReverseFlow from './pages/Analysis/ReverseFlow';
import Month from './pages/Analysis/Month';
import ComprehensiveAI from './pages/Analysis/ComprehensiveAI';
import Improve from './pages/Improve';
import ImproveConsultationThanks from './pages/ImproveConsultationThanks';
import UpgradeThanks from './pages/UpgradeThanks';
import Reports from './pages/Reports';
import AccountSettings from './pages/AccountSettings';
import ProfileEdit from './pages/ProfileEdit';
import PlanInfo from './pages/PlanInfo';
import Members from './pages/Members';
import AcceptInvitation from './pages/AcceptInvitation';
import OAuthCallback from './components/OAuthCallback';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CommercialTransaction from './pages/CommercialTransaction';
import ForgotPassword from './pages/ForgotPassword';

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
import EmailNotifications from './pages/Admin/Settings/EmailNotifications';
import PlanList from './pages/Admin/PlanList';


function App() {
  // 正式ドメインへのリダイレクト
  useEffect(() => {
    const currentHostname = window.location.hostname;
    const officialDomain = 'grow-reporter.com';
    
    // ローカル開発環境（localhost）は除外
    if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
      return;
    }
    
    // 正式ドメイン以外からのアクセスの場合、リダイレクト
    if (currentHostname !== officialDomain) {
      const newUrl = `https://${officialDomain}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(newUrl);
    }
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <SiteProvider>
            <SidebarProvider>
              <div className="App">
                <Routes>
            {/* OAuth コールバック（認証不要） */}
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            
            {/* 認証関連 */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/commercial-transaction" element={<CommercialTransaction />} />
            <Route path="/reset-password" element={<ForgotPassword />} />
            {/* 招待承認（認証不要でもアクセス可能） */}
            <Route path="/accept-invitation" element={<AcceptInvitation />} />
            <Route 
              path="/register/complete" 
              element={
                <ProtectedRoute>
                  <CompleteProfile />
                </ProtectedRoute>
              } 
            />
            
            {/* サイト登録・完了（ワンカラムレイアウト） */}
            <Route path="/site-registration" element={<Navigate to="/sites/new" replace />} />
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
            
            {/* メインアプリケーション - MainLayoutでラップ */}
            <Route 
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* サイト管理 */}
              <Route path="/sites/list" element={<SiteList />} />
              <Route path="/sites/:siteId" element={<SiteDetail />} />
              
              {/* ダッシュボード */}
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* 分析 */}
              <Route path="/analysis/summary" element={<AnalysisSummary />} />
              <Route path="/analysis/users" element={<Users />} />
              <Route path="/analysis/month" element={<Month />} />
              <Route path="/analysis/day" element={<Day />} />
              <Route path="/analysis/week" element={<Week />} />
              <Route path="/analysis/hour" element={<Hour />} />
              <Route path="/analysis/channels" element={<AcquisitionChannels />} />
              <Route path="/analysis/keywords" element={<Keywords />} />
              <Route path="/analysis/referrals" element={<Referrals />} />
              <Route path="/analysis/pages" element={<Pages />} />
              <Route path="/analysis/page-categories" element={<PageCategories />} />
              <Route path="/analysis/landing-pages" element={<LandingPages />} />
              <Route path="/analysis/file-downloads" element={<FileDownloads />} />
              <Route path="/analysis/external-links" element={<ExternalLinks />} />
              <Route path="/analysis/page-flow" element={<PageFlow />} />
              <Route path="/analysis/conversions" element={<ConversionList />} />
              <Route path="/analysis/reverse-flow" element={<ReverseFlow />} />
              <Route path="/analysis/comprehensive" element={<ComprehensiveAI />} />
              {/* 改善する */}
              <Route path="/improve" element={<Improve />} />
              
              {/* 評価する */}
              <Route path="/reports" element={<Reports />} />
              
              {/* アカウント設定 */}
              <Route path="/account/settings" element={<AccountSettings />} />
              <Route path="/account/profile" element={<ProfileEdit />} />
              <Route path="/account/plan" element={<PlanInfo />} />
              
              {/* メンバー管理 */}
              <Route path="/members" element={<Members />} />
            </Route>
            
            {/* サイト改善相談サンクスページ（コンバージョン測定用） */}
            <Route
              path="/improve/consultation/thanks"
              element={
                <ProtectedRoute>
                  <ImproveConsultationThanks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/thanks"
              element={
                <ProtectedRoute>
                  <UpgradeThanks />
                </ProtectedRoute>
              }
            />

            {/* 管理画面 */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<UserList />} />
              <Route path="users/:uid" element={<UserDetail />} />
              <Route path="sites" element={<AdminSiteList />} />
              <Route path="sites/:siteId" element={<AdminSiteDetail />} />
              <Route path="plans" element={<PlanList />} />
              <Route path="logs" element={<ActivityLogs />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="mail" element={<EmailNotifications />} />
            </Route>

                </Routes>
              </div>
            </SidebarProvider>
          </SiteProvider>
        </Router>
      </AuthProvider>
      <Toaster position="bottom-right" toastOptions={{ duration: 5000 }} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;