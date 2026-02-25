import React from 'react';

export default function FormLabel({ children, required, htmlFor }) {
  return (
    <label 
      htmlFor={htmlFor}
      className="mb-2.5 flex items-center gap-2 text-sm font-medium text-dark dark:text-white"
    >
      {children}
      {required && <span className="text-red-500">*</span>}
    </label>
  );
}

