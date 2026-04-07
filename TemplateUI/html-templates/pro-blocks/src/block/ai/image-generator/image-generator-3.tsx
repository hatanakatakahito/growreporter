import { useState, type ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';
import {
  ChevronDown,
  ChevronRight,
  Globe2,
  Gallery,
  ColourPalette3,
  MenuHamburger1,
  Sparkle,
  StarFat,
  Xmark2x,
} from '@tailgrids/icons';

// Data constants
const MENU_ITEMS = [
  { id: 'style', label: 'Style', icon: 'star' },
  { id: 'orientation', label: 'Orientation', icon: 'globe' },
  { id: 'images', label: 'Images', icon: 'gallery' },
  { id: 'color', label: 'Color', icon: 'palette' },
  { id: 'effect', label: 'Effect', icon: 'effect' },
  { id: 'object', label: 'Object', icon: 'cursor' },
  { id: 'composition', label: 'Composition', icon: 'composition' },
] as const;

const MODEL_CARDS = [
  {
    id: 1,
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/md-1.jpg',
    title: 'AI art generator',
    description: 'Creates visuals from text using neural networks.',
  },
  {
    id: 2,
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/md-2.jpg',
    title: 'Style transfer software',
    description: 'Applies styles of artists to transform images.',
  },
  {
    id: 3,
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/md-3.jpg',
    title: 'Photo restoration tool',
    description: 'Restores old photos using machine learning.',
  },
];

const GALLERY_IMAGES = [
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-3-1.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-3-2.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-3-3.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-3-4.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-3-5.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-3-6.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-3-7.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/image-3-8.jpg',
];

const TABS = ['My Creation', 'Community'] as const;

// Icon components for menu items
function StarIcon() {
  return <StarFat className="text-text-50 size-6" />;
}

function GlobeIcon() {
  return <Globe2 className="text-text-50 size-6" />;
}

function GalleryIcon() {
  return <Gallery className="text-text-50 size-6" />;
}

function PaletteIcon() {
  return <ColourPalette3 className="text-text-50 size-5" />;
}

function EffectIcon() {
  return (
    <svg
      className="text-text-50 size-6"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M8.26 11.75C8.26 12.0261 8.03614 12.25 7.76 12.25C7.48386 12.25 7.26 12.0261 7.26 11.75C7.26 11.4739 7.48386 11.25 7.76 11.25C8.03614 11.25 8.26 11.4739 8.26 11.75Z"
        fill="currentColor"
      />
      <path
        d="M8 8H14.5C15.3284 8 16 8.67157 16 9.5V16M8 8V5.5C8 4.67157 8.67157 4 9.5 4H18.5C19.3284 4 20 4.67157 20 5.5V14.5C20 15.3284 19.3284 16 18.5 16H16M8 8H5.5C4.67157 8 4 8.67157 4 9.5V18.5C4 19.3284 4.67157 20 5.5 20H14.5C15.3284 20 16 19.3284 16 18.5V16M4 17.6752L10.7636 14.169C11.3258 13.8776 12.0105 13.9706 12.4746 14.4015L16 17.6752M8.26 11.75C8.26 12.0261 8.03614 12.25 7.76 12.25C7.48386 12.25 7.26 12.0261 7.26 11.75C7.26 11.4739 7.48386 11.25 7.76 11.25C8.03614 11.25 8.26 11.4739 8.26 11.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CursorIcon() {
  return (
    <svg
      className="text-text-50 size-6"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M4 13.625V10.375M10.375 4H13.625M20 11.6371V10.375M10.375 20H11.6367M4 7.12891V5.5C4 4.67157 4.67157 4 5.5 4H7.12891M4 16.871V18.5C4 19.3284 4.67157 20 5.5 20H7.12891M20 7.12891V5.5C20 4.67157 19.3284 4 18.5 4H16.8711M20.3823 14.9705L13.384 12.4227C12.7853 12.2048 12.2048 12.7853 12.4227 13.384L14.9705 20.3823C15.2059 21.029 16.1153 21.0436 16.3714 20.4047L17.4059 17.8231C17.4821 17.6329 17.6329 17.4821 17.8231 17.4059L20.4047 16.3714C21.0436 16.1153 21.029 15.2059 20.3823 14.9705Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CompositionIcon() {
  return (
    <svg
      className="text-text-50 size-6"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M2 12H5.25M18.75 12H22M12 2V5.25M12 18.75V22M9.5 12H14.5M12 9.5V14.5M18.75 17.25L18.75 6.75C18.75 5.92157 18.0784 5.25 17.25 5.25L6.75 5.25C5.92158 5.25 5.25 5.92157 5.25 6.75L5.25 17.25C5.25 18.0784 5.92157 18.75 6.75 18.75L17.25 18.75C18.0784 18.75 18.75 18.0784 18.75 17.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getMenuIcon(iconType: string): ReactNode {
  switch (iconType) {
    case 'star':
      return <StarIcon />;
    case 'globe':
      return <GlobeIcon />;
    case 'gallery':
      return <GalleryIcon />;
    case 'palette':
      return <PaletteIcon />;
    case 'effect':
      return <EffectIcon />;
    case 'cursor':
      return <CursorIcon />;
    case 'composition':
      return <CompositionIcon />;
    default:
      return null;
  }
}

// Reusable components
interface MenuItemProps {
  icon: string;
  label: string;
}

function MenuItem({ icon, label }: MenuItemProps) {
  return (
    <a
      href="javascript:void(0)"
      className="text-title-50 hover:bg-background-soft-100 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-normal"
    >
      {getMenuIcon(icon)}
      {label}
      <ChevronRight className="text-text-50 ml-auto size-5" />
    </a>
  );
}

interface ModelCardProps {
  image: string;
  title: string;
  description: string;
}

function ModelCard({ image, title, description }: ModelCardProps) {
  return (
    <article className="bg-background-50 flex items-center gap-4 overflow-hidden rounded-xl p-3">
      <div className="shrink-0">
        <img
          src={image}
          className="h-full w-full rounded-lg object-cover"
          alt={title}
        />
      </div>
      <div>
        <h3 className="text-title-50 mb-2 text-sm font-medium">{title}</h3>
        <p className="text-text-100 text-sm">{description}</p>
      </div>
    </article>
  );
}

interface GalleryImageProps {
  src: string;
}

function GalleryImage({ src }: GalleryImageProps) {
  return (
    <div>
      <img src={src} className="w-full rounded-2xl object-cover" alt="" />
    </div>
  );
}

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-md px-2.5 py-2.5 text-sm font-medium transition ${
        isActive
          ? 'text-title-50 bg-background-50'
          : 'hover:bg-background-soft-200 text-text-100 bg-transparent'
      }`}
    >
      {label}
    </button>
  );
}

function SidebarContent() {
  return (
    <>
      <div className="relative mb-3 h-24">
        <textarea
          placeholder="Describe your image"
          className="border-base-50 bg-input-background text-title-50 placeholder:text-text-200 h-full w-full resize-none rounded-lg border p-4 placeholder:text-sm"
        />
        <button className="border-base-50 text-text-50 absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full border">
          <Sparkle className="size-5" />
        </button>
      </div>

      <div className="bg-background-50 border-base-200 mb-4 flex items-center justify-between rounded-lg border p-3">
        <p className="text-title-50 text-sm font-medium">Model</p>
        <a
          href="javascript:void(0)"
          className="text-text-200 flex items-center gap-2 text-sm"
        >
          Flux 1.0 Fast
          <ChevronRight className="size-5" />
        </a>
      </div>

      <ul className="mb-7 space-y-1">
        {MENU_ITEMS.map((item) => (
          <li key={item.id}>
            <MenuItem icon={item.icon} label={item.label} />
          </li>
        ))}
      </ul>

      <button className="bg-primary-500 hover:bg-primary-600 text-white-100 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium">
        <Sparkle className="size-6" />
        Generate
      </button>
    </>
  );
}

export default function ImageGenerator3() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] =
    useState<(typeof TABS)[number]>('My Creation');

  return (
    <div
      className={`bg-background-soft-100 min-h-screen lg:flex ${
        mobileMenuOpen ? 'overflow-hidden' : ''
      }`}
    >
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/25 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Aside Menu */}
      {mobileMenuOpen && (
        <aside className="bg-background-50 fixed inset-y-0 left-0 z-30 w-80 px-4 py-6 shadow-lg lg:hidden">
          <div className="h-full overflow-y-auto">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <a href="javascript:void(0)" className="block">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                  alt="logo"
                />
              </a>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="bg-background-50 hover:bg-background-soft-100 hover:text-text-100 text-text-200 inline-flex items-center justify-center rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-inset"
              >
                <span className="sr-only">Close menu</span>
                <Xmark2x className="size-6" />
              </button>
            </div>

            <a href="javascript:void(0)" className="mb-10 hidden lg:block">
              <img
                src=" https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/logo.svg"
                alt="Logo"
              />
            </a>

            <SidebarContent />
          </div>
        </aside>
      )}

      {/* Desktop Aside Menu */}
      <aside className="bg-background-50 fixed inset-y-0 left-0 hidden w-75 overflow-y-auto px-4 py-8 lg:block">
        <div>
          <a href="javascript:void(0)" className="mb-10 block">
            <img
              src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
              alt="logo"
            />
          </a>
          <SidebarContent />
        </div>
      </aside>

      <div className="flex-1 p-7 lg:ml-75">
        <header className="mb-7 flex items-center justify-between gap-5">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="bg-background-50 hover:bg-background-soft-100 hover:text-text-100 text-text-200 inline-flex items-center justify-center rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-inset lg:hidden"
            aria-controls="mobile-menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className="sr-only">Open main menu</span>
            {!mobileMenuOpen ? (
              <MenuHamburger1 className="size-6" />
            ) : (
              <Xmark2x className="size-6" />
            )}
          </button>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger className="text-text-100 flex cursor-pointer items-center gap-3 text-base outline-none">
                Explore Model
                <ChevronDown className="hidden size-5 lg:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                placement="bottom end"
                className="bg-dropdown-background border-base-50 min-w-[200px] rounded-lg border p-1.5 shadow-lg"
              >
                <DropdownMenuItem className="text-text-50 hover:bg-background-soft-100 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-hidden">
                  Flux 1.0 Fast
                </DropdownMenuItem>
                <DropdownMenuItem className="text-text-50 hover:bg-background-soft-100 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-hidden">
                  Midjourney 6.0
                </DropdownMenuItem>
                <DropdownMenuItem className="text-text-50 hover:bg-background-soft-100 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-hidden">
                  Stable Diffusion XL
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="mt-6">
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODEL_CARDS.map((card) => (
              <ModelCard
                key={card.id}
                image={card.image}
                title={card.title}
                description={card.description}
              />
            ))}
          </div>

          <div className="bg-background-50 rounded-2xl p-3">
            <nav className="bg-background-soft-100 mb-5 inline-flex gap-2 rounded-lg p-1">
              {TABS.map((tab) => (
                <TabButton
                  key={tab}
                  label={tab}
                  isActive={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                />
              ))}
            </nav>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {GALLERY_IMAGES.map((src) => (
                <GalleryImage key={src} src={src} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
