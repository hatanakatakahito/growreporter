import React from 'react';

export default function FormLabel({ children, required, htmlFor }) {
  return (
    <label 
      htmlFor={htmlFor}
      className="mb-2.5 block text-sm font-medium text-dark dark:text-white"
    >
      {children}
      {required && <span className="ml-1 text-red">*</span>}
    </label>
  );
}

