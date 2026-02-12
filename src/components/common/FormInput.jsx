import React from 'react';

export default function FormInput({ 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  required,
  disabled,
  icon,
  ...props 
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-dark-3 dark:text-white dark:focus:border-primary"
        {...props}
      />
      {icon && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2">
          {icon}
        </span>
      )}
    </div>
  );
}

