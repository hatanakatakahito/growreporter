/**
 * TailGrids Card Components
 * 完全にTailGridsデモと同じスタイル
 */

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-[10px] bg-white p-7.5 shadow-1 dark:bg-dark-2 dark:shadow-card ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="mb-5.5 flex items-center justify-between">
      <div>
        <h4 className="text-body-2xlg font-bold text-dark dark:text-white">
          {title}
        </h4>
        {subtitle && (
          <span className="text-sm font-medium text-body-color dark:text-dark-6">
            {subtitle}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const colorClasses = {
    success: 'bg-[#13C296]/10 text-[#13C296]',
    warning: 'bg-yellow/10 text-yellow',
    error: 'bg-red/10 text-red',
    info: 'bg-primary/10 text-primary',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${colorClasses[status]}`}>
      <span className={`h-2 w-2 rounded-full ${status === 'success' ? 'bg-[#13C296]' : status === 'warning' ? 'bg-yellow' : status === 'error' ? 'bg-red' : 'bg-primary'}`}></span>
      {children}
    </span>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="py-10 text-center">
      {icon || (
        <svg className="mx-auto mb-4 h-16 w-16 text-body-color dark:text-dark-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )}
      <h3 className="mb-2 text-xl font-bold text-dark dark:text-white">
        {title}
      </h3>
      <p className="mb-4 text-body-color dark:text-dark-6">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  value: string | number;
  badge?: React.ReactNode;
}

export function StatCard({ icon, iconColor, title, value, badge }: StatCardProps) {
  return (
    <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-dark-2 dark:shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-body-sm font-medium text-body-color dark:text-dark-6">{title}</span>
          <h4 className="mt-2 text-heading-6 font-bold text-dark dark:text-white">
            {value}
          </h4>
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-full`} style={{ backgroundColor: `${iconColor}10` }}>
          {icon}
        </div>
      </div>
      {badge && <div className="mt-4">{badge}</div>}
    </div>
  );
}

interface AlertProps {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  onClose?: () => void;
}

export function Alert({ type, title, message, onClose }: AlertProps) {
  const colors = {
    success: { bg: 'bg-[#13C296]/10', border: 'border-[#13C296]', text: 'text-[#13C296]', icon: '#13C296' },
    warning: { bg: 'bg-yellow/10', border: 'border-yellow', text: 'text-yellow', icon: '#F2994A' },
    error: { bg: 'bg-red/10', border: 'border-red', text: 'text-red', icon: '#DC3545' },
    info: { bg: 'bg-primary/10', border: 'border-primary', text: 'text-primary', icon: '#3758F9' },
  };

  const color = colors[type];

  return (
    <div className={`flex w-full rounded-[10px] border-l-6 ${color.border} ${color.bg} px-7 py-4 shadow-1 dark:border-${type} dark:bg-[#1B1B24] dark:shadow-card md:p-5`}>
      <div className={`mr-5 flex h-9 w-full max-w-[36px] items-center justify-center rounded-lg`} style={{ backgroundColor: color.icon }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          {type === 'success' && <path d="M6.66667 10.1147L12.7947 3.98603L13.7378 4.92916L6.66667 12L2.42603 7.75936L3.36916 6.81623L6.66667 10.1147Z" fill="white"/>}
          {type === 'error' && <path d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0ZM8.8 12H7.2V10.4H8.8V12ZM8.8 8.8H7.2V4H8.8V8.8Z" fill="white"/>}
          {type === 'warning' && <path d="M8 0L0 14H16L8 0ZM8.8 12H7.2V10.4H8.8V12ZM8.8 8.8H7.2V5.2H8.8V8.8Z" fill="white"/>}
          {type === 'info' && <path d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0ZM8.8 12H7.2V7.2H8.8V12ZM8.8 5.6H7.2V4H8.8V5.6Z" fill="white"/>}
        </svg>
      </div>
      <div className="w-full">
        <h5 className={`mb-2 font-bold leading-[22px] ${color.text}`}>
          {title}
        </h5>
        <p className="text-base leading-relaxed text-body-color dark:text-dark-6">
          {message}
        </p>
      </div>
      {onClose && (
        <button onClick={onClose} className="ml-auto">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.8 3.2L8 8L3.2 3.2L1.6 4.8L6.4 9.6L1.6 14.4L3.2 16L8 11.2L12.8 16L14.4 14.4L9.6 9.6L14.4 4.8L12.8 3.2Z" fill="currentColor"/>
          </svg>
        </button>
      )}
    </div>
  );
}



