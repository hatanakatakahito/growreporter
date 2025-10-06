/**
 * TailGrids Button Components
 * 完全にTailGridsデモと同じスタイル
 */

import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'dark' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  className = '',
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2.5 rounded-[7px] font-medium transition-all hover:bg-opacity-90 disabled:cursor-not-allowed disabled:bg-opacity-50';
  
  const variantClasses = {
    primary: 'bg-primary text-white',
    secondary: 'bg-secondary text-white',
    success: 'bg-[#13C296] text-white',
    warning: 'bg-yellow text-white',
    danger: 'bg-red text-white',
    dark: 'bg-dark text-white',
    outline: 'border border-stroke bg-transparent text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
    >
      {loading ? (
        <>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          <span>処理中...</span>
        </>
      ) : (
        <>
          {icon && <span>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}

interface IconButtonProps {
  onClick?: () => void;
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export function IconButton({
  onClick,
  icon,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  className = '',
}: IconButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-full transition-all hover:bg-opacity-90 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-primary/10 text-primary hover:bg-primary/20',
    secondary: 'bg-secondary/10 text-secondary hover:bg-secondary/20',
    success: 'bg-[#13C296]/10 text-[#13C296] hover:bg-[#13C296]/20',
    warning: 'bg-yellow/10 text-yellow hover:bg-yellow/20',
    danger: 'bg-red/10 text-red hover:bg-red/20',
    ghost: 'bg-transparent hover:bg-gray-2 dark:hover:bg-dark-3',
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {icon}
    </button>
  );
}

interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function ButtonGroup({ children, className = '' }: ButtonGroupProps) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {children}
    </div>
  );
}



