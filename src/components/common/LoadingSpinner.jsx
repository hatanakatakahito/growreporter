import React from 'react';

export default function LoadingSpinner({ size = 'md', text }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-primary border-t-transparent`}></div>
      {text && <p className="mt-4 text-sm text-body-color">{text}</p>}
    </div>
  );
}

