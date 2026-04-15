/**
 * data-tour 属性値の定数集（タイポ防止）
 */
export const TOUR_TARGETS = {
  // Dashboard
  DASHBOARD_KPI: 'dashboard-kpi',
  DASHBOARD_ALERTS: 'dashboard-alerts',
  DASHBOARD_CHECKLIST: 'dashboard-checklist',

  // Sidebar
  SIDEBAR_ANALYSIS: 'sidebar-analysis',
  SIDEBAR_RESTART_TOUR: 'sidebar-restart-tour',

  // Analysis
  ANALYSIS_PERIOD: 'analysis-period',
  ANALYSIS_EXPORT: 'analysis-export',
  ANALYSIS_KPI_CARD: 'analysis-kpi-card',
  AI_SUMMARY: 'ai-summary',

  // Account / Members
  ACCOUNT_NOTIFICATIONS: 'account-notifications',
  MEMBERS_INVITE: 'members-invite',

  // Site list
  SITE_EDIT_BUTTON: 'site-edit-button',

  // AI Chat
  AI_CHAT_INPUT: 'ai-chat-input',

  // Improve
  IMPROVE_HEADER: 'improve-header',

  // Reports
  REPORTS_HEADER: 'reports-header',
};

export const sel = (key) => `[data-tour="${key}"]`;
