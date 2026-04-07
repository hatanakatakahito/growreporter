import Chart from 'react-apexcharts';
import { useState } from 'react';
import type { ApexOptions } from 'apexcharts';
import { Button } from '@/components/core/button';
import { MenuMeatballs1 } from '@tailgrids/icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/core/dropdown';

export default function Widgets3() {
  const series = [
    {
      name: 'Direct',
      data: [44, 55, 41, 67, 22, 43, 55, 41],
    },
    {
      name: 'Referral',
      data: [13, 23, 20, 8, 13, 27, 13, 23],
    },
    {
      name: 'Organic Search',
      data: [11, 17, 15, 15, 21, 14, 18, 20],
    },
    {
      name: 'Social',
      data: [21, 7, 25, 13, 22, 8, 18, 20],
    },
  ];
  // Helper to get CSS variable value
  const getThemeColor = (variable: string) => {
    if (typeof window === 'undefined') return variable;
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue(variable).trim() || variable;
  };

  const options: ApexOptions = {
    colors: [
      getThemeColor('--color-primary-700'),
      getThemeColor('--color-primary-500'),
      getThemeColor('--color-primary-400'),
      getThemeColor('--color-primary-200'),
    ],
    chart: {
      fontFamily: 'DM Sans, sans-serif',
      type: 'bar',
      stacked: true,
      height: 315,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      events: {
        mounted: (chart) => {
          chart.windowResizeHandler();
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '39%',
        borderRadius: 10,
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'last',
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: getThemeColor('--color-text-100'),
          fontSize: '12px',
          fontFamily: 'DM Sans',
        },
      },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '14px',
      fontWeight: 400,
      labels: {
        colors: getThemeColor('--color-text-100'),
      },
      markers: {
        size: 5,
        shape: 'circle',
        strokeWidth: 0,
        offsetX: -4,
      },
      itemMargin: {
        horizontal: 10,
        vertical: 0,
      },
    },
    yaxis: {
      title: {
        text: undefined, // Hide the title by setting text to undefined
      },
      labels: {
        style: {
          colors: getThemeColor('--color-text-100'),
          fontSize: '12px',
          fontFamily: 'DM Sans',
        },
      },
    },
    grid: {
      borderColor: 'var(--color-chart-line)',
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      x: {
        show: false,
      },
      y: {
        formatter: (val: number) => val.toString(), // Simplified formatter
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

  return (
    <div className="flex h-screen items-center justify-center px-4 py-10">
      <div className="bg-background-50 border-base-100 mx-auto w-full max-w-3xl rounded-2xl border px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-title-50 text-lg font-semibold">
            Acquisition Channels
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button iconOnly size="sm" variant="ghost">
                <MenuMeatballs1 />
              </Button>
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
        <div className="custom-scrollbar max-w-full overflow-x-auto">
          <div className="-ml-5 min-w-[700px] pl-2 xl:min-w-full">
            <Chart options={options} series={series} type="bar" height={315} />
          </div>
        </div>
      </div>
    </div>
  );
}
