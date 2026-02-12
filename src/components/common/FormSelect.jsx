import React from 'react';

export default function FormSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder = '選択してください',
  required,
  disabled,
  ...props 
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="w-full appearance-none rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-dark-3 dark:text-white dark:focus:border-primary"
        {...props}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </div>
  );
}

