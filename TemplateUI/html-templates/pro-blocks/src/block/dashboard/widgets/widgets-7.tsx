import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/core/dropdown';

import { useState } from 'react';
// ... (keep imports)

export default function Widgets7() {
  // Helper to get CSS variable value
  const getThemeColor = (variable: string) => {
    if (typeof window === 'undefined') return variable;
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue(variable).trim() || variable;
  };

  const options: ApexOptions = {
    legend: {
      show: false,
      position: 'top',
      horizontalAlign: 'left',
    },
    colors: [getThemeColor('--color-primary-500')],
    chart: {
      fontFamily: 'DM Sans, sans-serif',
      height: 140,
      type: 'area',
      toolbar: {
        show: false,
      },
      events: {
        mounted: (chart) => {
          chart.windowResizeHandler();
        },
      },
    },
    fill: {
      type: 'gradient', // Ensures gradient fill is explicitly defined
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
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
            height: 320,
          },
        },
      },
    ],
    stroke: {
      curve: 'smooth',
      width: 2, // Changed from ["2"] to match type expectations
    },
    markers: {
      size: 0,
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: false,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      x: {
        format: 'dd MMM yyyy',
      },
    },
    xaxis: {
      type: 'category',
      categories: [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        show: false, // Hides x-axis labels
      },
    },
    yaxis: {
      labels: {
        show: false, // Hides y-axis labels
      },
      title: {
        text: undefined, // Removed font size styling; unnecessary with hidden labels
      },
    },
  };

  // Update chart colors on mount/theme change
  useState(() => {
    // Force re-render slightly after mount to ensure CSS variables are loaded
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  });

  const series = [
    {
      name: 'Sales',
      data: [180, 181, 182, 184, 183, 182, 181, 182, 183, 185, 186, 183],
    },
  ];

  return (
    <div className="flex h-screen items-center justify-center px-4 py-10">
      <div className="bg-background-50 border-base-100 mx-auto max-w-md rounded-2xl border p-5 md:p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-title-50 text-lg font-semibold">Active Users</h3>
          <div className="relative inline-block">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <svg
                  className="text-text-200 hover:text-text-50 size-6"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                </svg>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                placement="bottom end"
                className="bg-background-50 border-base-100 w-40 rounded-xl border p-1"
              >
                <DropdownMenuItem className="text-text-100 hover:bg-background-soft-100 hover:text-text-50 flex w-full cursor-pointer rounded-lg text-left text-sm font-normal">
                  View More
                </DropdownMenuItem>
                <DropdownMenuItem className="text-text-100 hover:bg-background-soft-100 hover:text-text-50 flex w-full cursor-pointer rounded-lg text-left text-sm font-normal">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-6 flex items-end gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="ripple bg-error-500/10 flex h-5 w-5 items-center justify-center rounded-full">
              <div className="bg-error-500 h-1.5 w-1.5 rounded-full"></div>
            </div>
            <span className="activeUsers text-title-sm text-title-50 font-semibold">
              364
            </span>
          </div>
          <span className="text-theme-sm text-text-100 mb-1 block">
            Live visitors
          </span>
        </div>

        <div className="bg-background-soft-50 my-5 min-h-[155px] rounded-xl">
          <div className="-mr-2.5 -ml-[22px] h-full">
            <Chart options={options} series={series} type="area" height={140} />
          </div>
        </div>

        <div className="flex items-center justify-center gap-6">
          <div>
            <p className="text-title-50 text-center text-lg font-semibold">
              224
            </p>
            <p className="text-theme-xs text-text-100 mt-0.5 text-center">
              Avg, Daily
            </p>
          </div>

          <div className="bg-background-soft-200 h-11 w-px"></div>

          <div>
            <p className="text-title-50 text-center text-lg font-semibold">
              1.4K
            </p>
            <p className="text-theme-xs text-text-100 mt-0.5 text-center">
              Avg, Weekly
            </p>
          </div>

          <div className="bg-background-soft-200 h-11 w-px"></div>

          <div>
            <p className="text-title-50 text-center text-lg font-semibold">
              22.1K
            </p>
            <p className="text-theme-xs text-text-100 mt-0.5 text-center">
              Avg, Monthly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
