import React from 'react';

export default function FormTextarea({ 
  value, 
  onChange, 
  placeholder, 
  rows = 4,
  required,
  disabled,
  ...props 
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      required={required}
      disabled={disabled}
      className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-dark-3 dark:text-white dark:focus:border-primary"
      {...props}
    />
  );
}

