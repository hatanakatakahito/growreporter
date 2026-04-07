'use client';

import {
  Buildings11,
  ExpandArrow6,
  Home,
  MenuKebab1,
  Minus,
  Plus,
} from '@tailgrids/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { useEffect, useState } from 'react';

// Custom Marker Icon Creator
const createCustomIcon = (
  icon: React.ReactNode,
  label: string,
  colorClass: string = 'text-primary-600',
  bgClass: string = 'bg-primary-50',
) => {
  const iconHtml = renderToStaticMarkup(
    <div className="relative flex flex-col items-center">
      <div
        className={`border-primary-200 flex h-10 w-10 items-center justify-center rounded-full border ${bgClass} ${colorClass}`}
      >
        {icon}
      </div>
      <div className="text-title-50 bg-background-50 mt-2 rounded-full px-3 py-1 text-xs font-medium shadow-xl">
        {label}
      </div>
    </div>,
  );

  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker-icon',
    iconSize: [60, 90],
    iconAnchor: [30, 45],
  });
};

// Custom Zoom Control Component
const CustomZoomControl = () => {
  const map = useMap();

  return (
    <div className="leaflet-bottom leaflet-right !top-3 !right-0">
      <div className="leaflet-control bg-background-50 border-base-100 flex flex-col overflow-hidden rounded-lg border">
        <button
          className="bg-background-50 border-base-50 hover:bg-background-soft-50 text-text-50 hover:text-title-50 flex h-9 w-9 items-center justify-center border-b"
          onClick={() => map.zoomIn()}
          aria-label="Zoom in"
        >
          <Plus size={20} />
        </button>
        <button
          className="bg-background-50 hover:bg-background-soft-50 text-text-50 hover:text-title-50 flex h-9 w-9 items-center justify-center"
          onClick={() => map.zoomOut()}
          aria-label="Zoom out"
        >
          <Minus size={20} />
        </button>
      </div>
    </div>
  );
};

// Custom Expand Control Component
const ExpandControl = ({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const map = useMap();

  // Invalidate map size when expanded state changes to ensure tiles render correctly
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 300); // Wait for transition
  }, [isExpanded, map]);

  return (
    <div className="leaflet-bottom leaflet-right !right-0 !bottom-0">
      <div className="leaflet-control">
        <button
          className="bg-background-50 border-base-100 hover:bg-background-soft-50 text-text-50 hover:text-title-50 flex h-10 w-10 items-center justify-center rounded-lg border"
          aria-label={isExpanded ? 'Collapse map' : 'Expand map'}
          onClick={onToggle}
        >
          <ExpandArrow6 size={20} />
        </button>
      </div>
    </div>
  );
};

export default function Map3() {
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const homePosition: [number, number] = [40.765, -74.45]; // Approx Harding Township based on image text?
  const officePosition: [number, number] = [40.78, -74.41]; // Nearby

  const homeIcon = createCustomIcon(<Home size={20} />, 'Home');
  const officeIcon = createCustomIcon(<Buildings11 size={20} />, 'Office');

  if (!isMounted) {
    return (
      <div className="bg-background-50 border-base-100 rounded-2xl border p-5 sm:p-6">
        <div className="flex justify-between">
          <div>
            <h3 className="text-title-50 text-lg font-semibold">Map View</h3>
            <p className="text-theme-sm text-text-100 mt-1">
              Clear view of locations at a glance
            </p>
          </div>
        </div>
        <div className="border-base-100 mt-6 overflow-hidden rounded-2xl border px-4 py-6 sm:px-6">
          <div className="bg-background-soft-50"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center p-4 transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm' : 'h-screen'}`}
    >
      <div
        className={`bg-background-50 border-base-100 w-full rounded-2xl border p-5 transition-all duration-300 ${isExpanded ? 'h-[90vh] w-[90vw]' : 'sm:w-[500px] sm:p-6'}`}
      >
        <div className="flex justify-between">
          <div>
            <h3 className="text-title-50 text-lg font-semibold">Map View</h3>
            <p className="text-theme-sm text-text-100 mt-1">
              Clear view of locations at a glance
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

        <div
          className={`border-base-100 mt-6 overflow-hidden rounded-2xl border transition-all duration-300 ${isExpanded ? 'h-[calc(100%-80px)]' : ''}`}
        >
          <div
            className={`relative z-0 w-full transition-all duration-300 ${isExpanded ? 'h-full' : 'h-[246px]'}`}
          >
            <MapContainer
              center={[40.772, -74.43]}
              zoom={13}
              scrollWheelZoom={false}
              className="h-full w-full"
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                className="grayscale"
              />
              <Marker position={homePosition} icon={homeIcon} />
              <Marker position={officePosition} icon={officeIcon} />
              <CustomZoomControl />
              <ExpandControl
                isExpanded={isExpanded}
                onToggle={() => setIsExpanded(!isExpanded)}
              />
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
