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
        zoomOnScroll={false}
        zoomAnimate={true}
        className="h-full w-full"
        regionStyle={{
          initial: {
            fill: 'var(--color-map-fill)',
            fillOpacity: 1,
            stroke: 'none',
            strokeWidth: 0,
            strokeOpacity: 0,
          },
          hover: {
            fillOpacity: 0.8,
            cursor: 'pointer',
            fill: 'var(--color-primary-500)',
          },
          selected: {
            fill: 'var(--color-primary-600)',
          },
        }}
        series={{
          regions: [
            {
              values: {
                US: 'var(--color-primary-600)',
                FR: 'var(--color-primary-400)',
                AU: 'var(--color-primary-200)',
                CN: 'var(--color-primary-300)',
                BR: 'var(--color-primary-300)',
                RU: 'var(--color-primary-100)',
                CA: 'var(--color-primary-200)',
              } as any,
              attribute: 'fill',
            },
          ],
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

export default function Map2() {
  return (
    <div className="mx-auto flex h-screen items-center justify-center px-4 py-10">
      <div className="bg-background-50 border-base-100 w-full rounded-2xl border p-5 sm:w-[500px] sm:p-6">
        <div className="flex justify-between">
          <div>
            <h3 className="text-title-50 text-lg font-semibold">
              Sellers by states
            </h3>
            <p className="text-theme-sm text-text-100 mt-1">
              See seller counts categorized by state
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

        <div className="border-base-100 bg-background-soft-50 mt-6 overflow-hidden rounded-2xl border">
          <div className="h-[250px] w-full">
            <CountryMap />
          </div>
        </div>

        <ul className="mt-6 flex flex-col gap-4">
          <li className="flex items-center justify-between">
            <div>
              <p className="text-title-50 text-sm font-semibold">USA</p>
              <span className="text-text-100 block text-xs">
                2,379 Customers
              </span>
            </div>
            <div>
              <p className="text-title-50 text-sm font-medium">75%</p>
            </div>
          </li>
          <div className="bg-background-soft-100 h-px"></div>
          <li className="flex items-center justify-between">
            <div>
              <p className="text-title-50 text-sm font-semibold">France</p>
              <span className="text-text-100 block text-xs">589 Customers</span>
            </div>
            <div>
              <p className="text-title-50 text-sm font-medium">20%</p>
            </div>
          </li>
          <div className="bg-background-soft-100 h-px"></div>
          <li className="flex items-center justify-between">
            <div>
              <p className="text-title-50 text-sm font-semibold">France</p>
              <span className="text-text-100 block text-xs">589 Customers</span>
            </div>
            <div>
              <p className="text-title-50 text-sm font-medium">05%</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
