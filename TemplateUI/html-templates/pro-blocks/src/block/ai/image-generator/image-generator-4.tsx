import { useState } from 'react';
import {
  ChevronRight,
  Gallery,
  MultipleImages,
  Sparkle,
} from '@tailgrids/icons';

// Data constants
const STYLE_TABS = ['Cinematic', 'HDR', 'Film', 'Portrait'] as const;

const NAV_ITEMS = [
  { id: 'generator', label: 'Generator', icon: 'gallery' },
  { id: 'editor', label: 'Editor', icon: 'CropImageIcon' },
  { id: 'upscale', label: 'Upscale', icon: 'UpscalerIcon' },
  { id: 'reimagine', label: 'Reimagine', icon: 'scaleSquare' },
  { id: 'assistant', label: 'Assistant', icon: 'assistant' },
] as const;

const THUMBNAIL_IMAGES = [
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-generator-04/img-1.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-generator-04/img-2.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-generator-04/img-3.jpg',
];

const GALLERY_IMAGES = [
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-generator-04/img-md-1.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-generator-04/img-md-2.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-generator-04/img-md-3.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-generator-04/img-md-4.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-generator-04/img-md-5.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-generator-04/img-md-6.jpg',
];

// Inline SVG icons for those not available in @tailgrids/icons
function AssistantIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="19"
      height="18"
      viewBox="0 0 19 18"
      fill="none"
    >
      <path
        d="M17.5 1.19995H3C2.17157 1.19995 1.5 1.87152 1.5 2.69995V17.2M17.0063 11.2945L10.008 8.7467C9.40937 8.52875 8.8288 9.10932 9.04675 9.70798L11.5945 16.7062C11.83 17.353 12.7394 17.3675 12.9954 16.7287L14.0299 14.1471C14.1062 13.9569 14.2569 13.8061 14.4471 13.7299L17.0287 12.6953C17.6676 12.4393 17.653 11.5299 17.0063 11.2945Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.25 4.94995H5.2501"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReimagineIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M14.043 14.045h.005"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.826 19.326h-4.902a1.5 1.5 0 01-1.489-1.312l1.594-.926a1.5 1.5 0 011.49.02l.794.469a2.5 2.5 0 002.97-.318l1.043-.966v1.533a1.5 1.5 0 01-1.5 1.5z"
        fill="currentColor"
      />
      <path
        d="M13.25 7.752V5.5a1.5 1.5 0 00-1.5-1.5H5.5A1.5 1.5 0 004 5.5v6.25a1.5 1.5 0 001.5 1.5h2.25M16.25 4h2.25A1.5 1.5 0 0120 5.5v2.25m0 0l-1.5-1.499M20 7.75l1.5-1.499M7.75 20H5.5A1.5 1.5 0 014 18.5v-2.25m0 0l1.5 1.499M4 16.25l-1.5 1.499m10.424 1.577h4.902a1.5 1.5 0 001.5-1.5v-1.533m-6.402 3.033a1.5 1.5 0 01-1.5-1.5v-4.902a1.5 1.5 0 011.5-1.5h4.902a1.5 1.5 0 011.5 1.5v3.37m-6.402 3.032a1.5 1.5 0 01-1.489-1.312l1.594-.926a1.5 1.5 0 011.49.02l.794.469a2.5 2.5 0 002.97-.318l1.043-.966"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UpscalerIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M14.733 20H18.5a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0018.5 4H5.502a1.5 1.5 0 00-1.5 1.5v3.758m13-2.258v3m0-3h-3m3 0l-5 5m0 0v6.5a1.5 1.5 0 01-1.5 1.5h-5a1.5 1.5 0 01-1.5-1.5v-5a1.5 1.5 0 011.5-1.5h6.5z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CropImageIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M18.75 18.75v-12a1.5 1.5 0 00-1.5-1.5h-12m13.5 13.5v2.5m0-2.5h-12a1.5 1.5 0 01-1.5-1.5v-12m13.5 13.5h2.5M2.75 5.25h2.5m0 0v-2.5m0 11.21l2.245-3.194a1.5 1.5 0 012.56.173l2.245 4.338 1.713-2.086a1.5 1.5 0 012.3-.021l2.437 2.857"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashboardSidebarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 5.5C4 4.67157 4.67157 4 5.5 4H9C9.82843 4 10.5 4.67157 10.5 5.5V18.5C10.5 19.3284 9.82843 20 9 20H5.5C4.67157 20 4 19.3284 4 18.5V5.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 5.5C13.5 4.67157 14.1716 4 15 4H18.5C19.3284 4 20 4.67157 20 5.5V9C20 9.82843 19.3284 10.5 18.5 10.5H15C14.1716 10.5 13.5 9.82843 13.5 9V5.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 15C13.5 14.1716 14.1716 13.5 15 13.5H18.5C19.3284 13.5 20 14.1716 20 15V18.5C20 19.3284 19.3284 20 18.5 20H15C14.1716 20 13.5 19.3284 13.5 18.5V15Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getNavIcon(iconType: string) {
  const iconClass = 'size-6';
  switch (iconType) {
    case 'gallery':
      return <Gallery className={iconClass} />;
    case 'multipleImages':
      return <MultipleImages className={iconClass} />;
    case 'scaleSquare':
      return <ReimagineIcon className={iconClass} />;
    case 'UpscalerIcon':
      return <UpscalerIcon className={iconClass} />;
    case 'CropImageIcon':
      return <CropImageIcon className={iconClass} />;
    case 'assistant':
      return <AssistantIcon className={iconClass} />;
    default:
      return null;
  }
}

// Reusable components
interface NavItemProps {
  icon: string;
  label: string;
}

function NavItem({ icon, label }: NavItemProps) {
  return (
    <a
      href="javascript:void(0)"
      className="text-text-100 flex flex-col items-center gap-2 text-sm font-medium"
    >
      {getNavIcon(icon)}
      {label}
    </a>
  );
}

export default function ImageGenerator4() {
  const [mobileMenuOpen] = useState(false);
  const [active, setActive] = useState('Cinematic');

  return (
    <div className="bg-background-soft-400 min-h-screen px-4 py-14 xl:px-0">
      <div
        className={`lg:flex lg:py-28 ${
          mobileMenuOpen ? 'overflow-hidden' : ''
        }`}
      >
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 xl:flex-row">
          <div className="order-2 flex flex-col-reverse gap-2 xl:order-1 xl:flex-row">
            <aside className="bg-background-50 flex flex-row items-center justify-center rounded-2xl px-3 xl:w-22.5 xl:flex-col xl:justify-normal xl:py-8">
              <a
                href="javascript:void(0)"
                className="hidden h-9.5 w-9.5 xl:block"
              >
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/taigrids-logo-icon.svg"
                  alt="Logo"
                  className="mx-auto flex justify-center"
                />
              </a>
              <nav className="flex flex-row justify-center gap-10 overflow-x-auto py-8 xl:flex-col xl:items-center">
                {NAV_ITEMS.map((item) => (
                  <NavItem key={item.id} icon={item.icon} label={item.label} />
                ))}
              </nav>
            </aside>
            <div className="bg-background-soft-100 rounded-2xl px-4 py-6 xl:w-77">
              <div className="bg-background-50 mb-6 flex items-center justify-between rounded-xl p-3">
                <p className="text-title-50 text-sm font-medium">Model</p>
                <a
                  href="javascript:void(0)"
                  className="text-text-200 flex items-center gap-2 text-sm"
                >
                  Flux 1.0 Fast
                  <ChevronRight className="text-text-100 size-5" />
                </a>
              </div>
              <div className="mb-8">
                <span className="text-text-100 mb-4 inline-block text-sm">
                  Prompt
                </span>
                <div>
                  <textarea className="bg-background-50 text-title-50 h-25 w-full resize-none rounded-xl border-0 px-3 py-4"></textarea>
                </div>
              </div>
              <div className="mb-8">
                <nav className="bg-background-50 flex gap-1 rounded-xl p-1">
                  {STYLE_TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActive(tab)}
                      className={`w-full cursor-pointer rounded-lg p-2 text-sm font-medium transition ${
                        active === tab
                          ? 'text-white-100 bg-gray-900'
                          : 'hover:bg-background-soft-100 text-text-100'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="mb-8 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-100 mb-2 block text-sm">
                    Images
                  </label>
                  <select className="bg-input-background text-title-50 h-12 w-full cursor-pointer rounded-xl border border-transparent py-2.5 pr-10">
                    <option value="1">1</option>
                    <option value="1">2</option>
                    <option value="1">3</option>
                    <option value="1">4</option>
                  </select>
                </div>
                <div>
                  <label className="text-text-100 mb-2 block text-sm">
                    Aspect Ratio
                  </label>
                  <select className="bg-input-background text-title-50 h-12 w-full cursor-pointer rounded-xl border border-transparent py-2.5 pr-10">
                    <option value="1">1:1</option>
                    <option value="1">1:4</option>
                    <option value="1">4:3</option>
                    <option value="1">4:5</option>
                  </select>
                </div>
              </div>
              <button className="bg-primary-500 hover:bg-primary-600 text-white-100 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium">
                <Sparkle className="size-6" />
                Generate
              </button>
            </div>
            <div className="bg-background-soft-50 rounded-2xl xl:w-71">
              <div className="bg-background-50 rounded-t-2xl px-6 py-4">
                <button>
                  <DashboardSidebarIcon className="text-text-100 size-6" />
                </button>
              </div>
              <div className="grid grid-cols-3 flex-row gap-4 px-4 py-6 xl:flex xl:flex-col">
                {THUMBNAIL_IMAGES.map((src, index) => (
                  <img
                    key={index}
                    src={src}
                    className="w-full rounded-md"
                    alt=""
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="order-1 grid grid-cols-1 gap-2 sm:grid-cols-3 xl:order-2 xl:grid-cols-2">
            {GALLERY_IMAGES.map((src, index) => (
              <img
                key={index}
                src={src}
                className="h-auto w-full rounded-md object-cover"
                alt="genrated assets"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
