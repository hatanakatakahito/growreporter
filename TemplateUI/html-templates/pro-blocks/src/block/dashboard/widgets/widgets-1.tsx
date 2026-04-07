import Chart from 'react-apexcharts';
import { useState } from 'react';
import type { ApexOptions } from 'apexcharts';

export default function Widgets1() {
  const [activeTab, setActiveTab] = useState('30 days');
  // Helper to get CSS variable value
  const getThemeColor = (variable: string) => {
    if (typeof window === 'undefined') return variable;
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue(variable).trim() || variable;
  };

  const options: ApexOptions = {
    colors: [getThemeColor('--color-primary-500')],
    chart: {
      fontFamily: 'DM Sans, sans-serif',
      type: 'bar',
      height: 350,
      toolbar: {
        show: false,
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
        columnWidth: '45%',
        borderRadius: 5,
        borderRadiusApplication: 'end',
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ['transparent'],
    },
    xaxis: {
      categories: [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '11',
        '12',
        '13',
        '14',
        '15',
        '16',
        '17',
        '18',
        '19',
        '20',
        '21',
        '22',
        '23',
        '24',
        '25',
        '26',
        '27',
        '28',
        '29',
        '30',
      ],
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
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: getThemeColor('--color-text-100'),
          fontSize: '12px',
        },
        formatter: (val) => {
          return val + 'K';
        },
      },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      fontFamily: 'DM Sans',
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
        formatter: (val: number) => `${val}K`,
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
      data: [
        168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112, 123, 212,
        270, 190, 310, 115, 90, 380, 112, 223, 292, 170, 290, 110, 115, 290,
        380, 312,
      ],
    },
  ];
  return (
    <div className="flex h-screen items-center justify-center px-4 py-10">
      <div className="bg-background-50 border-base-100 mx-auto w-full max-w-6xl rounded-2xl border px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h3 className="text-title-50 mb-1 text-lg font-semibold">
              Analytics
            </h3>
            <span className="text-text-100 block text-sm">
              Visitor analytics of last 30 days
            </span>
          </div>
          <div className="bg-tab-background flex h-11 items-center rounded-lg p-0.5">
            {['12 months', '30 days', '7 days', '24 hours'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`h-10 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === tab
                    ? 'text-title-50 bg-tab-active-background shadow-sm'
                    : 'hover:text-title-50 text-text-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="custom-scrollbar max-w-full overflow-x-auto">
          <div className="-ml-5 min-w-[1300px] pl-2 xl:min-w-full">
            <Chart options={options} series={series} type="bar" height={350} />
          </div>
        </div>
      </div>
    </div>
  );
}
