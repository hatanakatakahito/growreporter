import Chart from 'react-apexcharts';
import { useState, useEffect } from 'react';
import type { ApexOptions } from 'apexcharts';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/core/dropdown';
import { MenuKebab1 } from '@tailgrids/icons';

export default function Widgets5() {
  const [activeTab, setActiveTab] = useState('Today');

  // Helper to get CSS variable value
  const getThemeColor = (variable: string) => {
    if (typeof window === 'undefined') return variable;
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue(variable).trim() || variable;
  };

  const [colors, setColors] = useState({
    success: '#22c55e',
    error: '#ef4444',
  });

  useEffect(() => {
    // Force re-render slightly after mount to ensure CSS variables are loaded
    const timeout = setTimeout(() => {
      setColors({
        success: getThemeColor('--color-input-success'),
        error: getThemeColor('--color-input-error'),
      });
      window.dispatchEvent(new Event('resize'));
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  const commonOptions: ApexOptions = {
    grid: {
      show: false,
    },
    fill: {
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    legend: {
      show: false,
    },
    chart: {
      fontFamily: 'DM Sans, sans-serif',
      height: 70,
      type: 'area',
      parentHeightOffset: 0,
      toolbar: {
        show: false,
      },
      events: {
        mounted: (chart) => {
          chart.windowResizeHandler();
        },
      },
    },
    tooltip: {
      enabled: false,
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth',
      width: 1,
    },
    xaxis: {
      type: 'datetime',
      categories: [
        '2018-09-19T00:00:00.000Z',
        '2018-09-19T01:30:00.000Z',
        '2018-09-19T02:30:00.000Z',
        '2018-09-19T03:30:00.000Z',
        '2018-09-19T04:30:00.000Z',
        '2018-09-19T05:30:00.000Z',
        '2018-09-19T06:30:00.000Z',
        '2018-09-19T07:30:00.000Z',
        '2018-09-19T08:30:00.000Z',
        '2018-09-19T09:30:00.000Z',
        '2018-09-19T10:30:00.000Z',
        '2018-09-19T11:30:00.000Z',
        '2018-09-19T12:30:00.000Z',
      ],
      labels: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    yaxis: {
      labels: {
        show: false,
      },
    },
  };

  const optionsSuccess: ApexOptions = {
    ...commonOptions,
    colors: [colors.success],
  };

  const optionsError: ApexOptions = {
    ...commonOptions,
    colors: [colors.error],
  };

  const series = [
    {
      name: 'New Sales',
      data: [300, 350, 310, 370, 248, 187, 295, 191, 269, 201, 185, 252, 151],
    },
  ];

  return (
    <div className="flex h-screen items-center justify-center px-4 py-10">
      <div className="bg-background-50 border-base-100 mx-auto w-full max-w-sm rounded-2xl border px-5 pt-5 pb-1 sm:px-6 sm:pt-6">
        <div className="mb-6 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-title-50 text-lg font-semibold">
              Traffic Stats
            </h3>
          </div>
          <div className="relative inline-block">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <MenuKebab1 className="text-text-100" />
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

        <div className="bg-tab-background mb-1 flex h-10 items-center rounded-lg p-0.5">
          {['Today', 'Week', 'Month'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-9 flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeTab === tab
                  ? 'text-title-50 bg-tab-active-background shadow-sm'
                  : 'hover:text-title-50 text-text-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Chart Tab should place here */}

        <div>
          {/* <!-- Stats item --> */}
          <div className="flex items-end justify-between py-5">
            <div>
              <p className="text-theme-sm text-text-100 mb-1">
                New Subscribers
              </p>
              <h4 className="text-title-50 mb-1 text-2xl font-semibold">
                567K
              </h4>
              <span className="flex items-center gap-1.5">
                <span className="text-success-500"> +3.85% </span>
                <span className="text-theme-xs text-text-100">
                  then last Week
                </span>
              </span>
            </div>
            <div className="w-full max-w-[150px]">
              <div className="chartNine chartNine-01">
                <Chart
                  options={optionsSuccess}
                  series={series}
                  type="area"
                  height={70}
                />
              </div>
            </div>
          </div>
          {/* <!-- Stats item --> */}
          <div className="border-base-50 flex items-end justify-between border-y py-5">
            <div>
              <p className="text-theme-sm text-text-100 mb-1">
                Conversion Rate
              </p>
              <h4 className="text-title-50 mb-1 text-2xl font-semibold">
                276K
              </h4>
              <span className="flex items-center gap-1.5">
                <span className="text-error-500"> -5.39% </span>
                <span className="text-theme-xs text-text-100">
                  then last Week
                </span>
              </span>
            </div>

            <div className="w-full max-w-[150px]">
              <div className="chartTen">
                <Chart
                  options={optionsError}
                  series={series}
                  type="area"
                  height={70}
                />
              </div>
            </div>
          </div>
          {/* <!-- Stats item --> */}
          <div className="flex items-end justify-between py-5">
            <div>
              <p className="text-theme-sm text-text-100 mb-1">
                Page Bounce Rate
              </p>
              <h4 className="text-title-50 mb-1 text-2xl font-semibold">285</h4>
              <span className="flex items-center gap-1.5">
                <span className="text-success-500"> +12.74% </span>
                <span className="text-theme-xs text-text-100">
                  then last Week
                </span>
              </span>
            </div>

            <div className="w-full max-w-[150px]">
              <div className="chartNine chartNine-02">
                <Chart
                  options={optionsSuccess}
                  series={series}
                  type="area"
                  height={70}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
