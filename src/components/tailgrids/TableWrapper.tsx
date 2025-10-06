'use client';

import React from 'react';

export interface TableHeader {
  name: string;
  styles?: string;
}

export interface TableWrapperProps {
  headers: TableHeader[];
  data: any[];
  renderRow: (row: any, index: number) => React.ReactNode;
  className?: string;
}

const TableWrapper: React.FC<TableWrapperProps> = ({
  headers,
  data,
  renderRow,
  className = '',
}) => {
  return (
    <div className={`max-w-full overflow-x-auto bg-white dark:bg-dark-2 shadow-[0px_3px_8px_0px_rgba(0,0,0,0.08)] rounded-xl ${className}`}>
      <table className='w-full table-auto'>
        <thead>
          <tr className='text-left bg-gray-2 dark:bg-dark-3'>
            {headers.map((header, index) => (
              <th
                className={`text-body-color dark:text-dark-7 py-4 px-4 first:pl-6 last:pr-6 text-sm font-medium ${header.styles || ''}`}
                key={index}
              >
                {header.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => renderRow(row, index))}
        </tbody>
      </table>
    </div>
  );
};

export default TableWrapper;

// テーブルセルのスタイルヘルパー
export const TableCell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <td className={`px-4 py-4 border-t border-stroke dark:border-dark-3 ${className}`}>
    {children}
  </td>
);



