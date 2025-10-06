/**
 * TailGrids Form Components
 * 完全にTailGridsデモと同じスタイル
 */

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  icon,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            {icon}
          </div>
        )}
        <input
          className={`w-full rounded-[7px] border border-stroke bg-transparent px-5.5 py-3 text-dark outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary ${
            error ? 'border-red focus:border-red' : ''
          } ${icon ? 'pl-12' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-body-color dark:text-dark-6">{helperText}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Textarea({
  label,
  error,
  helperText,
  className = '',
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
          {label}
        </label>
      )}
      <textarea
        className={`w-full rounded-[7px] border border-stroke bg-transparent px-5.5 py-3 text-dark outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary ${
          error ? 'border-red focus:border-red' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-body-color dark:text-dark-6">{helperText}</p>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  helperText,
  options,
  className = '',
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`w-full appearance-none rounded-[7px] border border-stroke bg-transparent px-5.5 py-3 text-dark outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary ${
            error ? 'border-red focus:border-red' : ''
          } ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="fill-current"
          >
            <path d="M10 14.25L3.75 8L5.1625 6.5875L10 11.4375L14.8375 6.5875L16.25 8L10 14.25Z" />
          </svg>
        </span>
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-body-color dark:text-dark-6">{helperText}</p>
      )}
    </div>
  );
}

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        className={`h-5 w-5 rounded border-stroke text-primary focus:ring-2 focus:ring-primary dark:border-dark-3 ${className}`}
        {...props}
      />
      <span className="text-base text-dark dark:text-white">{label}</span>
    </label>
  );
}

interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Radio({ label, className = '', ...props }: RadioProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="radio"
        className={`h-4 w-4 accent-primary ${className}`}
        {...props}
      />
      <span className="text-base font-medium text-dark dark:text-white">{label}</span>
    </label>
  );
}

interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function FormGroup({ children, className = '' }: FormGroupProps) {
  return <div className={`space-y-5 ${className}`}>{children}</div>;
}



