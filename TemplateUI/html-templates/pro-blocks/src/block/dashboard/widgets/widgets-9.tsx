import { worldMill } from '@react-jvectormap/world';
import { VectorMap } from '@react-jvectormap/core';
import { MenuKebab1 } from '@tailgrids/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';

import { useState } from 'react';

const CountryMap = () => {
  // Helper to get CSS variable value
  const getThemeColor = (variable: string) => {
    if (typeof window === 'undefined') return variable;
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue(variable).trim() || variable;
  };

  const [colors, setColors] = useState({
    primary: '#465FFF',
    base300: '#D0D5DD',
    title50: '#35373e',
    stroke: '#383f47',
  });

  useState(() => {
    // Force re-render slightly after mount to ensure CSS variables are loaded
    setTimeout(() => {
      setColors({
        primary: getThemeColor('--color-primary-500'),
        base300: getThemeColor('--color-map-fill'),
        title50: getThemeColor('--color-title-50'),
        stroke: getThemeColor('--color-title-50'), // mapping stroke to title-50 for consistency
      });
      window.dispatchEvent(new Event('resize'));
    }, 100);
  });

  return (
    <VectorMap
      map={worldMill}
      backgroundColor="transparent"
      markerStyle={{
        initial: {
          fill: colors.primary,
        },
      }}
      markersSelectable={true}
      markers={[
        {
          latLng: [37.2580397, -104.657039],
          name: 'United States',
          style: {
            fill: colors.primary,
            borderWidth: 1,
            borderColor: 'white',
            stroke: colors.stroke,
          },
        },
        {
          latLng: [20.7504374, 73.7276105],
          name: 'India',
          style: { fill: colors.primary, borderWidth: 1, borderColor: 'white' },
        },
        {
          latLng: [53.613, -11.6368],
          name: 'United Kingdom',
          style: { fill: colors.primary, borderWidth: 1, borderColor: 'white' },
        },
        {
          latLng: [-25.0304388, 115.2092761],
          name: 'Sweden',
          style: {
            fill: colors.primary,
            borderWidth: 1,
            borderColor: 'white',
            strokeOpacity: 0,
          },
        },
      ]}
      zoomOnScroll={false}
      zoomMax={12}
      zoomMin={1}
      zoomAnimate={true}
      zoomStep={1.5}
      regionStyle={{
        initial: {
          fill: colors.base300,
          fillOpacity: 1,
          fontFamily: 'DM Sans',
          stroke: 'none',
          strokeWidth: 0,
          strokeOpacity: 0,
        },
        hover: {
          fillOpacity: 0.7,
          cursor: 'pointer',
          fill: colors.primary,
          stroke: 'none',
        },
        selected: {
          fill: colors.primary,
        },
        selectedHover: {},
      }}
      regionLabelStyle={{
        initial: {
          fill: colors.title50,
          fontWeight: 500,
          fontSize: '13px',
          stroke: 'none',
        },
        hover: {},
        selected: {},
        selectedHover: {},
      }}
    />
  );
};

export default function Widgets9() {
  return (
    <div className="flex h-screen items-center justify-center px-4 py-10">
      <div className="bg-background-50 border-base-100 w-full max-w-xl rounded-2xl border p-5 sm:p-6">
        <div className="flex justify-between">
          <div>
            <h3 className="text-title-50 text-lg font-semibold">
              Customers Demographic
            </h3>
            <p className="text-theme-sm text-text-100 mt-1">
              Number of customer based on country
            </p>
          </div>
          <div className="relative inline-block">
            <DropdownMenu>
              <DropdownMenuTrigger className="dropdown-toggle">
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

        <div className="border-base-100 my-6 overflow-hidden rounded-2xl border">
          <div className="mapOne map-btn h-[212px] w-full">
            <CountryMap />
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-full max-w-8 items-center rounded-full">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/dashboard/map/map-01/c-1.png"
                  alt="usa"
                />
              </div>
              <div>
                <p className="text-theme-sm text-title-50 font-semibold">USA</p>
                <span className="text-theme-xs text-text-100 block">
                  2,379 Customers
                </span>
              </div>
            </div>

            <div className="flex w-full max-w-[140px] items-center gap-3">
              <div className="bg-background-soft-200 relative block h-2 w-full max-w-[100px] rounded-sm">
                <div className="bg-brand-500 text-white-100 absolute top-0 left-0 flex h-full w-[79%] items-center justify-center rounded-sm text-xs font-medium"></div>
              </div>
              <p className="text-theme-sm text-title-50 font-medium">79%</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-full max-w-8 items-center rounded-full">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/dashboard/map/map-01/c-2.png"
                  alt="france"
                />
              </div>
              <div>
                <p className="text-theme-sm text-title-50 font-semibold">
                  France
                </p>
                <span className="text-theme-xs text-text-100 block">
                  589 Customers
                </span>
              </div>
            </div>

            <div className="flex w-full max-w-[140px] items-center gap-3">
              <div className="bg-background-soft-200 relative block h-2 w-full max-w-[100px] rounded-sm">
                <div className="bg-brand-500 text-white-100 absolute top-0 left-0 flex h-full w-[23%] items-center justify-center rounded-sm text-xs font-medium"></div>
              </div>
              <p className="text-theme-sm text-title-50 font-medium">23%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
