import { worldMill } from '@react-jvectormap/world';
import { VectorMap } from '@react-jvectormap/core';
import { MenuKebab1, Plus, Minus } from '@tailgrids/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';
import { useRef } from 'react';

const CountryMap = () => {
  const mapRef = useRef<any>(null);

  const handleZoomIn = () => {
    const map = mapRef.current;
    if (map) {
      map.setScale(map.scale * 1.5, 0.5, 0.5, true, 500);
    }
  };

  const handleZoomOut = () => {
    const map = mapRef.current;
    if (map) {
      map.setScale(map.scale / 1.5, 0.5, 0.5, true, 500);
    }
  };

  return (
    <div className="relative h-full w-full">
      <style>
        {`
          .jvectormap-zoomin, .jvectormap-zoomout {
            display: none !important;
          }
        `}
      </style>
      <VectorMap
        mapRef={mapRef as any}
        map={worldMill}
        backgroundColor="transparent"
        markerStyle={{
          initial: {
            fill: 'var(--color-primary-500)',
          },
        }}
        markersSelectable={true}
        markers={[
          {
            latLng: [37.2580397, -104.657039],
            name: 'United States',
            style: {
              fill: 'var(--color-primary-500)',
              borderWidth: 1,
              borderColor: 'var(--color-white-100)',
              stroke: 'var(--color-text-50)',
            },
          },
          {
            latLng: [20.7504374, 73.7276105],
            name: 'India',
            style: {
              fill: 'var(--color-primary-500)',
              borderWidth: 1,
              borderColor: 'var(--color-white-100)',
            },
          },
          {
            latLng: [53.613, -11.6368],
            name: 'United Kingdom',
            style: {
              fill: 'var(--color-primary-500)',
              borderWidth: 1,
              borderColor: 'var(--color-white-100)',
            },
          },
          {
            latLng: [-25.0304388, 115.2092761],
            name: 'Sweden',
            style: {
              fill: 'var(--color-primary-500)',
              borderWidth: 1,
              borderColor: 'var(--color-white-100)',
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
            fill: 'var(--color-map-fill)',
            fillOpacity: 1,
            fontFamily: 'DM Sans',
            stroke: 'none',
            strokeWidth: 0,
            strokeOpacity: 0,
          },
          hover: {
            fillOpacity: 0.7,
            cursor: 'pointer',
            fill: 'var(--color-primary-500)',
            stroke: 'none',
          },
          selected: {
            fill: 'var(--color-primary-500)',
          },
          selectedHover: {},
        }}
        regionLabelStyle={{
          initial: {
            fill: 'var(--color-text-50)',
            fontWeight: 500,
            fontSize: '13px',
            stroke: 'none',
          },
          hover: {},
          selected: {},
          selectedHover: {},
        }}
      />
      <div className="absolute top-3 right-3 z-10">
        <div className="bg-background-50 border-base-100 flex flex-col overflow-hidden rounded-lg border">
          <button
            className="bg-background-50 border-base-50 hover:bg-background-soft-50 text-text-50 hover:text-title-50 flex h-9 w-9 items-center justify-center border-b"
            onClick={handleZoomIn}
            aria-label="Zoom in"
          >
            <Plus size={20} />
          </button>
          <button
            className="bg-background-50 hover:bg-background-soft-50 text-text-50 hover:text-title-50 flex h-9 w-9 items-center justify-center"
            onClick={handleZoomOut}
            aria-label="Zoom out"
          >
            <Minus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Map1() {
  return (
    <div className="flex h-screen items-center justify-center px-4 py-10">
      <div className="bg-background-50 border-base-100 mx-auto max-w-md rounded-2xl border p-5 sm:p-6">
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

        <div className="border-base-100 my-6 overflow-hidden rounded-2xl border px-4 py-6 sm:px-6">
          <div
            id="mapOne"
            className="mapOne map-btn 2xsm:w-[307px] xsm:w-[358px] -mx-4 -my-6 h-[212px] w-[252px] sm:-mx-6 md:w-[668px] lg:w-[634px] xl:w-[393px] 2xl:w-[554px]"
          >
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
