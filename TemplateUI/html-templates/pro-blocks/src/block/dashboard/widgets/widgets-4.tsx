import type { ApexOptions } from 'apexcharts';
import Chart from 'react-apexcharts';

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/core/dropdown';
import { Progress } from '@/components/core/progress';

import { useState } from 'react';
// ... (keep imports)

export default function Widgets4() {
  // Helper to get CSS variable value
  const getThemeColor = (variable: string) => {
    if (typeof window === 'undefined') return variable;
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue(variable).trim() || variable;
  };

  // ApexCharts configuration
  const options: ApexOptions = {
    colors: [getThemeColor('--color-primary-500')],
    chart: {
      fontFamily: 'DM Sans, sans-serif',
      type: 'radialBar',
      height: 360,
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
            offsetY: -25,
            color: getThemeColor('--color-title-50'),
            formatter: function (val) {
              return '$' + val;
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
    labels: ['June Goals'],
  };

  // Update chart colors on mount/theme change
  useState(() => {
    // Force re-render slightly after mount to ensure CSS variables are loaded
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  });
  const series = [90];
  return (
    <div className="flex h-screen items-center justify-center px-4 py-10">
      <div className="bg-background-50 border-base-100 mx-auto w-full max-w-sm rounded-2xl border p-5 sm:p-6">
        <div className="flex justify-between">
          <div>
            <h3 className="text-title-50 text-lg font-semibold">
              Estimated Revenue
            </h3>
            <p className="text-theme-sm text-text-100 mt-1">
              Target you’ve set for each month
            </p>
          </div>

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

        <div className="relative">
          <div id="chartDarkStyle">
            <Chart
              options={options}
              series={series}
              type="radialBar"
              height={360}
            />
          </div>
          <span className="text-text-100 absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-[60%] text-xs font-normal">
            June Goals
          </span>
        </div>

        <div className="border-base-100 mt-6 space-y-5 border-t pt-6">
          <div>
            <p className="text-theme-sm text-text-100 mb-2">Marketing</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-title-50 text-base font-semibold">
                    $30,569.00
                  </p>
                </div>
              </div>

              <Progress
                progress={85}
                withLabel
                className="w-full max-w-[140px]"
                barColor="var(--color-primary-500)"
              />
            </div>
          </div>

          <div>
            <p className="text-theme-sm text-text-100 mb-2">Sales</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-title-50 text-base font-semibold">
                    $20,486.00
                  </p>
                </div>
              </div>

              <Progress
                progress={55}
                withLabel
                className="w-full max-w-[140px]"
                barColor="var(--color-primary-500)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
