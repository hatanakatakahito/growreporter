'use client';

import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = true,
}) => {
  return (
    <div
      className={`overflow-hidden rounded-lg bg-white shadow-1 dark:bg-dark-2 dark:shadow-card ${
        hover ? 'duration-300 hover:shadow-3 dark:hover:shadow-3' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between border-b border-stroke dark:border-dark-3 px-6 py-4 ${className}`}>
      <div className="flex items-center">
        {icon && <div className="mr-3">{icon}</div>}
        <div>
          <h3 className="text-lg font-semibold text-dark dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-body-color dark:text-dark-6">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className = '',
}) => {
  return <div className={`p-6 ${className}`}>{children}</div>;
};

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`border-t border-stroke dark:border-dark-3 px-6 py-4 ${className}`}>
      {children}
    </div>
  );
};

// グリッドレイアウト用のラッパー
export interface CardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: number;
  className?: string;
}

export const CardGrid: React.FC<CardGridProps> = ({
  children,
  columns = 3,
  gap = 6,
  className = '',
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-${gap} ${className}`}>
      {children}
    </div>
  );
};



