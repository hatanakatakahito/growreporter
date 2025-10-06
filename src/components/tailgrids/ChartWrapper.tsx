'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// ReactApexChartを動的インポート（SSR対策）
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ChartWrapperProps {
  title: string;
  subtitle: string;
  series: {
    name: string;
    data: number[];
  }[];
  categories?: string[];
  colors?: string[];
  height?: number;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({
  title,
  subtitle,
  series,
  categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  colors = ['#3758F9', '#13C296'],
  height = 350,
}) => {
  const options: any = {
    legend: {
      show: false,
      position: 'top',
      horizontalAlign: 'left',
    },
    colors: colors,
    chart: {
      fontFamily: 'Inter, sans-serif',
      height: height,
      type: 'line',
      dropShadow: {
        enabled: true,
        color: '#623CEA14',
        top: 10,
        blur: 4,
        left: 0,
        opacity: 0.1,
      },
      toolbar: {
        show: false,
      },
    },
    responsive: [
      {
        breakpoint: 1024,
        options: {
          chart: {
            height: 300,
          },
        },
      },
      {
        breakpoint: 1366,
        options: {
          chart: {
            height: 350,
          },
        },
      },
    ],
    stroke: {
      width: [4, 4],
      curve: 'smooth',
    },
    markers: {
      size: 0,
    },
    labels: {
      show: false,
      position: 'top',
    },
    grid: {
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: false,
        },
      },
    },
    xaxis: {
      type: 'category',
      categories: categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      title: {
        style: {
          fontSize: '0px',
        },
      },
      min: 0,
      labels: {
        style: {
          colors: ['#8e8da4'],
        },
      },
    },
  };

  return (
    <div className="bg-gray-2 py-8 dark:bg-dark lg:py-12">
      <div className="mx-auto px-4 md:container">
        <div className="mx-auto w-full max-w-[1200px] rounded-lg border border-stroke bg-white px-5 pb-5 pt-[30px] dark:border-dark-3 dark:bg-dark-2 sm:px-[30px]">
          <div className="flex justify-between mb-4">
            <div>
              <h3 className="mb-1 text-xl font-bold leading-none text-dark dark:text-white sm:text-[28px] sm:leading-[35px]">
                {title}
              </h3>
              <p className="text-sm text-body-color dark:text-dark-6 sm:text-base">
                {subtitle}
              </p>
            </div>
          </div>
          <div id="chartOne" className="-mx-5">
            <ReactApexChart options={options} series={series} type="line" height={height} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartWrapper;



