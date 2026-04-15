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
  ANALYSIS_DIMENSION_FILTERS: 'analysis-dimension-filters',
  ANALYSIS_VIEW_TABS: 'analysis-view-tabs',
  ANALYSIS_COLUMN_TOGGLE: 'analysis-column-toggle',
  ANALYSIS_NOTE: 'analysis-note',
  AI_SUMMARY: 'ai-summary',

  // Account / Members
  ACCOUNT_NOTIFICATIONS: 'account-notifications',
  NOTIFICATION_WEEKLY: 'notification-weekly',
  NOTIFICATION_MONTHLY: 'notification-monthly',
  NOTIFICATION_ALERT: 'notification-alert',
  MEMBERS_INVITE: 'members-invite',

  // Site list
  SITE_EDIT_BUTTON: 'site-edit-button',
  SITE_CV_BUTTON: 'site-cv-button',
  SITE_KPI_BUTTON: 'site-kpi-button',

  // AI Chat
  AI_CHAT_INPUT: 'ai-chat-input',

  // Improve
  IMPROVE_HEADER: 'improve-header',

  // Reports
  REPORTS_HEADER: 'reports-header',
};

export const sel = (key) => `[data-tour="${key}"]`;
