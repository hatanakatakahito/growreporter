'use client';

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'dark' | 'white';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  outline?: boolean;
  rounded?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  outline = false,
  rounded = false,
  fullWidth = false,
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const variantClasses = {
    primary: outline
      ? 'border-primary text-primary hover:bg-primary hover:text-white'
      : 'bg-primary text-white hover:bg-opacity-90',
    secondary: outline
      ? 'border-secondary text-secondary hover:bg-secondary hover:text-white'
      : 'bg-secondary text-white hover:bg-opacity-90',
    success: outline
      ? 'border-[#13C296] text-[#13C296] hover:bg-[#13C296] hover:text-white'
      : 'bg-[#13C296] text-white hover:bg-opacity-90',
    danger: outline
      ? 'border-[#FF5630] text-[#FF5630] hover:bg-[#FF5630] hover:text-white'
      : 'bg-[#FF5630] text-white hover:bg-opacity-90',
    warning: outline
      ? 'border-[#F2994A] text-[#F2994A] hover:bg-[#F2994A] hover:text-white'
      : 'bg-[#F2994A] text-white hover:bg-opacity-90',
    dark: outline
      ? 'border-dark text-dark hover:bg-dark hover:text-white'
      : 'bg-dark text-white hover:bg-opacity-90',
    white: outline
      ? 'border-white text-white hover:bg-white hover:text-dark'
      : 'bg-white text-dark hover:bg-opacity-90',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const baseClasses = `
    inline-flex items-center justify-center
    font-medium transition duration-300
    border
    ${outline ? 'border-2' : 'border-transparent'}
    ${rounded ? 'rounded-full' : 'rounded-md'}
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `;

  return (
    <button
      className={baseClasses.replace(/\s+/g, ' ').trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;

// アイコンボタン用のコンポーネント
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  rounded?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'primary',
  size = 'md',
  rounded = true,
  className = '',
  ...props
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      rounded={rounded}
      className={`!px-3 ${className}`}
      {...props}
    >
      {icon}
    </Button>
  );
};



