'use client';

import React from 'react';

interface DataStatsCardProps {
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
  percent: number;
  uses: string | number;
  increment?: string;
  decrement?: string;
}

const DataStatsCard: React.FC<DataStatsCardProps> = ({
  icon,
  color,
  title,
  subtitle,
  percent,
  uses,
  increment,
  decrement,
}) => {
  return (
    <div className="w-full px-4 sm:w-1/2 lg:w-1/4">
      <div className="mb-8 rounded-[5px] bg-white p-5 shadow-1 dark:bg-dark-2 dark:shadow-box-dark lg:p-4 xl:p-5">
        <div className="mb-5 flex items-center">
          <div
            className={`relative mr-[14px] flex h-[50px] w-[50px] items-center justify-center`}
            style={{ color: color }}
          >
            {icon}
            <div
              className="absolute inset-0 h-full w-full opacity-[.08]"
              style={{ backgroundColor: color }}
            ></div>
          </div>
          <div>
            <h5 className="text-base font-medium text-dark dark:text-white">
              {title}
            </h5>
            <p className="text-sm text-body-color dark:text-dark-6">
              {subtitle}
            </p>
          </div>
        </div>
        <div>
          <div className="mb-5 flex items-end">
            <p className="mr-1 text-2xl font-bold leading-none text-dark dark:text-white">
              {uses}
            </p>
            <p
              className={`inline-flex items-center text-sm font-medium ${
                increment ? "text-green-500" : "text-red-500"
              }`}
            >
              {increment}
              {decrement}
              <span className="pl-1">
                {increment && (
                  <svg
                    width="10"
                    height="11"
                    viewBox="0 0 10 11"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4.35716 2.8925L0.908974 6.245L5.0443e-07 5.36125L5 0.499999L10 5.36125L9.09103 6.245L5.64284 2.8925L5.64284 10.5L4.35716 10.5L4.35716 2.8925Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
                {decrement && (
                  <svg
                    width="10"
                    height="11"
                    viewBox="0 0 10 11"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5.64284 8.1075L9.09102 4.755L10 5.63875L5 10.5L-8.98488e-07 5.63875L0.908973 4.755L4.35716 8.1075L4.35716 0.500001L5.64284 0.500001L5.64284 8.1075Z"
                      fill="currentColor"
                    ></path>
                  </svg>
                )}
              </span>
            </p>
          </div>
          <div className="relative h-2 w-full rounded-3xl bg-[#EFF2F7] dark:bg-dark-3">
            <div
              className={`absolute h-full rounded-3xl`}
              style={{ backgroundColor: color, width: `${percent}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DataStatsWrapperProps {
  stats: DataStatsCardProps[];
}

const DataStatsWrapper: React.FC<DataStatsWrapperProps> = ({ stats }) => {
  return (
    <div className="bg-gray-2 pb-12 pt-8 dark:bg-dark lg:pb-16 lg:pt-12">
      <div className="mx-auto px-4 md:container">
        <div className="-mx-4 flex flex-wrap">
          {stats.map((stat, index) => (
            <DataStatsCard key={index} {...stat} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataStatsWrapper;
export { DataStatsCard };
export type { DataStatsCardProps };



