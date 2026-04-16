/**
 * data-tour 属性値の定数集（タイポ防止）
 */
export const TOUR_TARGETS = {
  // Dashboard
  DASHBOARD_KPI: 'dashboard-kpi',
  DASHBOARD_ALERTS: 'dashboard-alerts',
  DASHBOARD_QUICK_ACTIONS: 'dashboard-quick-actions',
  DASHBOARD_TREND: 'dashboard-trend',
  DASHBOARD_IMPROVE: 'dashboard-improve',

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
  ANALYSIS_AI_TAB: 'analysis-ai-tab',
  ANALYSIS_NOTE: 'analysis-note',
  AI_SUMMARY: 'ai-summary',
  AI_SUMMARY_REGENERATE: 'ai-summary-regenerate',
  AI_SUMMARY_BODY: 'ai-summary-body',
  AI_SUMMARY_ACTIONS: 'ai-summary-actions',

  // Comprehensive AI
  COMP_AI_ROOT: 'comp-ai-root',
  COMP_AI_REGENERATE: 'comp-ai-regenerate',
  COMP_AI_SCORE: 'comp-ai-score',
  COMP_AI_HIGHLIGHTS: 'comp-ai-highlights',
  COMP_AI_KPIS: 'comp-ai-kpis',
  COMP_AI_SECTIONS: 'comp-ai-sections',

  // Account / Members
  ACCOUNT_TABS: 'account-tabs',
  ACCOUNT_EMAIL_TAB: 'account-email-tab',
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
  AI_CHAT_SIDEBAR: 'ai-chat-sidebar',
  AI_CHAT_NEW_SESSION: 'ai-chat-new-session',
  AI_CHAT_SUGGEST: 'ai-chat-suggest',
  AI_CHAT_INPUT_FIELD: 'ai-chat-input-field',
  AI_CHAT_EXPORT: 'ai-chat-export',

  // Improve
  IMPROVE_HEADER: 'improve-header',
  IMPROVE_AI_GENERATE: 'improve-ai-generate',
  IMPROVE_MANUAL_ADD: 'improve-manual-add',
  IMPROVE_AUTO_TOGGLE: 'improve-auto-toggle',
  IMPROVE_STATUS_FILTER: 'improve-status-filter',
  IMPROVE_TABLE: 'improve-table',

  // Reports
  REPORTS_HEADER: 'reports-header',
  REPORTS_SUMMARY: 'reports-summary',
  REPORTS_FILTER: 'reports-filter',
  REPORTS_LIST: 'reports-list',
};

export const sel = (key) => `[data-tour="${key}"]`;
