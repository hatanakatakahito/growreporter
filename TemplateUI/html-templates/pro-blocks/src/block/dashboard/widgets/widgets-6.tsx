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

export default function Widgets6() {
  // Helper to get CSS variable value
  const getThemeColor = (variable: string) => {
    if (typeof window === 'undefined') return variable;
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue(variable).trim() || variable;
  };

  const series = [75.55];
  const options: ApexOptions = {
    colors: [getThemeColor('--color-primary-500')],
    chart: {
      fontFamily: 'DM Sans, sans-serif',
      type: 'radialBar',
      height: 330,
      sparkline: {
        enabled: true,
      },
      events: {
        mounted: (chart) => {
          chart.windowResizeHandler();
        },
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: {
          size: '80%',
        },
        track: {
          background: getThemeColor('--border-color-base-200'),
          strokeWidth: '100%',
          margin: 5, // margin is in pixels
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            fontSize: '36px',
            fontWeight: '600',
            offsetY: -40,
            color: getThemeColor('--color-title-50'),
            formatter: function (val) {
              return val + '%';
            },
          },
        },
      },
    },
    fill: {
      type: 'solid',
      colors: [getThemeColor('--color-primary-500')],
    },
    stroke: {
      lineCap: 'round',
    },
    labels: ['Progress'],
  };

  // Update chart colors on mount/theme change
  useState(() => {
    // Force re-render slightly after mount to ensure CSS variables are loaded
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  });

  return (
    <div className="flex h-screen items-center justify-center px-4 py-10">
      <div className="bg-background-soft-100 border-base-100 mx-auto max-w-xl rounded-2xl border">
        <div className="shadow-default bg-background-50 rounded-2xl px-5 pt-5 pb-11 sm:px-6 sm:pt-6">
          <div className="flex justify-between">
            <div>
              <h3 className="text-title-50 text-lg font-semibold">
                Monthly Target
              </h3>
              <p className="text-theme-sm text-text-100 mt-1">
                Target you’ve set for each month
              </p>
            </div>
            <div className="relative inline-block">
              <DropdownMenu>
                <DropdownMenuTrigger className="dropdown-toggle">
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
          <div className="relative">
            <div className="max-h-[330px]" id="chartDarkStyle">
              <Chart
                options={options}
                series={series}
                type="radialBar"
                height={330}
              />
            </div>

            <span className="bg-success-50 text-success-600 absolute top-full left-1/2 -translate-x-1/2 -translate-y-[95%] rounded-full px-3 py-1 text-xs font-medium">
              +10%
            </span>
          </div>
          <p className="text-text-100 mx-auto mt-10 w-full max-w-[380px] text-center text-sm sm:text-base">
            You earn $3287 today, it's higher than last month. Keep up your good
            work!
          </p>
        </div>

        <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
          <div>
            <p className="text-theme-xs text-text-100 mb-1 text-center sm:text-sm">
              Target
            </p>
            <p className="text-title-50 flex items-center justify-center gap-1 text-base font-semibold sm:text-lg">
              $20K
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M7.26816 13.6632C7.4056 13.8192 7.60686 13.9176 7.8311 13.9176C7.83148 13.9176 7.83187 13.9176 7.83226 13.9176C8.02445 13.9178 8.21671 13.8447 8.36339 13.6981L12.3635 9.70076C12.6565 9.40797 12.6567 8.9331 12.3639 8.6401C12.0711 8.34711 11.5962 8.34694 11.3032 8.63973L8.5811 11.36L8.5811 2.5C8.5811 2.08579 8.24531 1.75 7.8311 1.75C7.41688 1.75 7.0811 2.08579 7.0811 2.5L7.0811 11.3556L4.36354 8.63975C4.07055 8.34695 3.59568 8.3471 3.30288 8.64009C3.01008 8.93307 3.01023 9.40794 3.30321 9.70075L7.26816 13.6632Z"
                  fill="#D92D20"
                />
              </svg>
            </p>
          </div>

          <div className="bg-background-soft-200 h-7 w-px"></div>

          <div>
            <p className="text-theme-xs text-text-100 mb-1 text-center sm:text-sm">
              Revenue
            </p>
            <p className="text-title-50 flex items-center justify-center gap-1 text-base font-semibold sm:text-lg">
              $20K
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M7.60141 2.33683C7.73885 2.18084 7.9401 2.08243 8.16435 2.08243C8.16475 2.08243 8.16516 2.08243 8.16556 2.08243C8.35773 2.08219 8.54998 2.15535 8.69664 2.30191L12.6968 6.29924C12.9898 6.59203 12.9899 7.0669 12.6971 7.3599C12.4044 7.6529 11.9295 7.65306 11.6365 7.36027L8.91435 4.64004L8.91435 13.5C8.91435 13.9142 8.57856 14.25 8.16435 14.25C7.75013 14.25 7.41435 13.9142 7.41435 13.5L7.41435 4.64442L4.69679 7.36025C4.4038 7.65305 3.92893 7.6529 3.63613 7.35992C3.34333 7.06693 3.34348 6.59206 3.63646 6.29926L7.60141 2.33683Z"
                  fill="#039855"
                />
              </svg>
            </p>
          </div>

          <div className="bg-background-soft-200 h-7 w-px"></div>

          <div>
            <p className="text-theme-xs text-text-100 mb-1 text-center sm:text-sm">
              Today
            </p>
            <p className="text-title-50 flex items-center justify-center gap-1 text-base font-semibold sm:text-lg">
              $20K
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M7.60141 2.33683C7.73885 2.18084 7.9401 2.08243 8.16435 2.08243C8.16475 2.08243 8.16516 2.08243 8.16556 2.08243C8.35773 2.08219 8.54998 2.15535 8.69664 2.30191L12.6968 6.29924C12.9898 6.59203 12.9899 7.0669 12.6971 7.3599C12.4044 7.6529 11.9295 7.65306 11.6365 7.36027L8.91435 4.64004L8.91435 13.5C8.91435 13.9142 8.57856 14.25 8.16435 14.25C7.75013 14.25 7.41435 13.9142 7.41435 13.5L7.41435 4.64442L4.69679 7.36025C4.4038 7.65305 3.92893 7.6529 3.63613 7.35992C3.34333 7.06693 3.34348 6.59206 3.63646 6.29926L7.60141 2.33683Z"
                  fill="#039855"
                />
              </svg>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
