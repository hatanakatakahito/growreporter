import React from 'react';

export default function FormError({ message }) {
  if (!message) return null;
  
  return (
    <p className="mt-1.5 text-xs text-red">
      {message}
    </p>
  );
}

