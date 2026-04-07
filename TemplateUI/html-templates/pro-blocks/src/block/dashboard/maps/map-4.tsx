import { usAea } from '@react-jvectormap/unitedstates';
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
        map={usAea}
        backgroundColor="transparent"
        zoomOnScroll={false}
        zoomAnimate={true}
        className="h-full w-full"
        regionStyle={{
          initial: {
            fill: 'var(--color-primary-200)',
            fillOpacity: 1,
            stroke: 'var(--color-white-100)',
            strokeWidth: 2,
            strokeOpacity: 1,
          },
          hover: {
            fillOpacity: 0.8,
            cursor: 'pointer',
            fill: 'var(--color-primary-500)',
            stroke: 'none',
          },
          selected: {
            fill: 'var(--color-primary-500)',
          },
        }}
        markerStyle={{
          initial: {
            fill: 'var(--color-primary-400)',
            stroke: 'var(--color-white-100)',
            strokeWidth: 2,
            r: 6,
          } as any,
          hover: {
            fill: 'var(--color-primary-600)',
            strokeWidth: 2,
          },
        }}
        markers={[
          { latLng: [34.05, -118.24], name: 'Los Angeles' },
          { latLng: [40.71, -74.0], name: 'New York', style: { r: 8 } as any },
          { latLng: [41.87, -87.62], name: 'Chicago' },
          { latLng: [29.76, -95.36], name: 'Houston' },
          { latLng: [39.73, -104.99], name: 'Denver' },
          { latLng: [47.6, -122.33], name: 'Seattle' },
          { latLng: [25.76, -80.19], name: 'Miami' },
          { latLng: [33.74, -84.38], name: 'Atlanta' },
          { latLng: [39.95, -75.16], name: 'Philadelphia' },
          { latLng: [42.36, -71.05], name: 'Boston' },
          { latLng: [36.16, -86.78], name: 'Nashville' },
          { latLng: [32.77, -96.79], name: 'Dallas' },
          { latLng: [44.97, -93.26], name: 'Minneapolis' },
          {
            latLng: [38.9, -77.03],
            name: 'Washington D.C.',
            style: { r: 6 } as any,
          },
          { latLng: [37.77, -122.41], name: 'San Francisco' },
          { latLng: [36.1, -115.17], name: 'Las Vegas' },
          { latLng: [33.44, -112.07], name: 'Phoenix' },
          { latLng: [29.42, -98.49], name: 'San Antonio' },
        ]}
        series={{
          regions: [
            {
              values: {
                'US-CA': 'var(--color-primary-500)',
                'US-TX': 'var(--color-primary-400)',
                'US-NY': 'var(--color-primary-700)',
                'US-FL': 'var(--color-primary-700)',
                'US-IL': 'var(--color-primary-400)',
                'US-PA': 'var(--color-primary-400)',
                'US-OH': 'var(--color-primary-400)',
                'US-GA': 'var(--color-primary-400)',
                'US-NC': 'var(--color-primary-400)',
                'US-MI': 'var(--color-primary-700)',
                'US-WA': 'var(--color-primary-300)',
                'US-CO': 'var(--color-primary-300)',
                'US-NV': 'var(--color-primary-600)',
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

export default function Map4() {
  return (
    <div className="flex h-screen items-center justify-center px-4 py-10">
      <div className="bg-background-50 border-base-100 w-full rounded-2xl border p-5 sm:w-[500px] sm:p-6">
        <div className="flex justify-between">
          <div>
            <h3 className="text-title-50 text-lg font-semibold">
              Sellers by states
            </h3>
            <p className="text-theme-sm text-text-100 mt-1">
              View states statistics by hovering over the map
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
