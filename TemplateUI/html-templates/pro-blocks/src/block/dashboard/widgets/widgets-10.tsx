import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';
import { MenuKebab1 } from '@tailgrids/icons';
import type { ApexOptions } from 'apexcharts';
import Chart from 'react-apexcharts';

import { useState } from 'react';
// ... import statements

export default function Widgets10() {
  // Helper to get CSS variable value
  const getThemeColor = (variable: string) => {
    if (typeof window === 'undefined') return variable;
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue(variable).trim() || variable;
  };

  // ApexCharts configuration
  const options: ApexOptions = {
    colors: [
      getThemeColor('--color-primary-600'),
      getThemeColor('--color-primary-400'),
      getThemeColor('--color-primary-100'),
    ],
    labels: ['Affiliate', 'Direct', 'Adsense'],
    chart: {
      fontFamily: 'DM Sans, sans-serif',
      type: 'donut',
      width: 280,
      height: 280,
      events: {
        mounted: (chart) => {
          chart.windowResizeHandler();
        },
      },
    },
    stroke: {
      show: false,
      width: 4, // Creates a gap between the series
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          background: 'transparent',
          labels: {
            show: true,
            name: {
              show: true,
              offsetY: 0,
              color: getThemeColor('--color-title-50'),
              fontSize: '12px',
              fontWeight: 'normal',
              // text: "",
              formatter: () => 'Total 3.5K',
            },
            value: {
              show: true,
              offsetY: 10,
              color: getThemeColor('--color-text-200'),
              fontSize: '14px',
              formatter: () => 'Used of 1.1K',
            },
            total: {
              show: true,
              label: 'Total',
              color: getThemeColor('--color-title-50'),
              fontSize: '20px',
              fontWeight: 'bold',
            },
          },
        },
      },
    },
    states: {
      hover: {
        filter: {
          type: 'none',
        },
      },
      active: {
        allowMultipleDataPointsSelection: false,
        filter: {
          type: 'darken',
        },
      },
    },
    dataLabels: {
      enabled: false,
    },

    tooltip: {
      enabled: false,
    },

    legend: {
      show: false,
    },

    responsive: [
      {
        breakpoint: 640,
        options: {
          chart: {
            width: 280,
            height: 280,
          },
        },
      },
      {
        breakpoint: 2600,
        options: {
          chart: {
            width: 240,
            height: 240,
          },
        },
      },
    ],
  };

  // Update chart colors on mount/theme change
  useState(() => {
    // Force re-render slightly after mount to ensure CSS variables are loaded
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  });

  const series = [900, 700, 850];

  return (
    <div className="flex h-screen items-center justify-center px-4 py-10">
      <div className="bg-background-50 border-base-100 mx-auto w-full max-w-xl rounded-2xl border p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-title-50 text-lg font-semibold">
            Sales Category
          </h3>
          <div className="relative inline-block">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <MenuKebab1 />
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
        <div className="flex flex-col items-center gap-8 xl:flex-row">
          <div id="chartDarkStyle">
            <Chart
              options={options}
              series={series}
              type="donut"
              height={280}
            />
          </div>
          <div className="flex flex-col items-start gap-6 sm:flex-row xl:flex-col">
            <div className="flex items-start gap-2.5">
              <div className="bg-brand-500 mt-1.5 h-2 w-2 rounded-full"></div>
              <div>
                <h5 className="text-theme-sm text-title-50 mb-1 font-medium">
                  Affiliate Program
                </h5>
                <div className="flex items-center gap-2">
                  <p className="text-theme-sm text-text-50 font-medium">48%</p>
                  <div className="bg-background-soft-400 h-1 w-1 rounded-full"></div>
                  <p className="text-theme-sm text-text-100">2,040 Products</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="bg-brand-500 mt-1.5 h-2 w-2 rounded-full"></div>
              <div>
                <h5 className="text-theme-sm text-title-50 mb-1 font-medium">
                  Direct Buy
                </h5>
                <div className="flex items-center gap-2">
                  <p className="text-theme-sm text-text-50 font-medium">33%</p>
                  <div className="bg-background-soft-400 h-1 w-1 rounded-full"></div>
                  <p className="text-theme-sm text-text-200">1,402 Products</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="bg-brand-300 mt-1.5 h-2 w-2 rounded-full"></div>
              <div>
                <h5 className="text-theme-sm text-title-50 mb-1 font-medium">
                  Adsense
                </h5>
                <div className="flex items-center gap-2">
                  <p className="text-theme-sm text-text-50 font-medium">19%</p>
                  <div className="bg-background-soft-400 h-1 w-1 rounded-full"></div>
                  <p className="text-theme-sm text-text-100">510 Products</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
