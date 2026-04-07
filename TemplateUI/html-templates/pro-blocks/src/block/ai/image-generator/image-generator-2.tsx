import { useState } from 'react';
import {
  ChevronRight,
  Download1,
  MenuHamburger1,
  Plus,
  Sparkle,
  Xmark2x,
} from '@tailgrids/icons';

const IMAGE_STYLES = [
  {
    id: 0,
    name: 'Realistic',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/grid-img-1.jpg',
  },
  {
    id: 1,
    name: 'Cartoon',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/grid-img-2.jpg',
  },
  {
    id: 2,
    name: 'Abstract',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/grid-img-3.jpg',
  },
  {
    id: 3,
    name: 'Minimalist',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/grid-img-4.jpg',
  },
  {
    id: 4,
    name: 'Vintage',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/grid-img-5.jpg',
  },
  {
    id: 5,
    name: 'Surreal',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/grid-img-6.jpg',
  },
  {
    id: 6,
    name: 'Pop Art',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/grid-img-7.jpg',
  },
  {
    id: 7,
    name: 'Cyberpunk',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/grid-img-8.jpg',
  },
];

const GENERATION_MODES = [
  { id: 0, name: 'Fast' },
  { id: 1, name: 'Quality' },
  { id: 2, name: 'Ultra' },
];

const IMAGE_COUNT_OPTIONS = ['1', '2', '3', '4'];
const ASPECT_RATIO_OPTIONS = ['1:1', '1:4', '4:3', '4:5'];

const GENERATED_IMAGES = [
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/grid-lg-1.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/grid-lg-2.jpg',
  'https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/image-generator/grid-lg-3.jpg',
];

interface StyleItemProps {
  style: (typeof IMAGE_STYLES)[number];
  isSelected: boolean;
  onSelect: () => void;
}

function StyleItem({ style, isSelected, onSelect }: StyleItemProps) {
  return (
    <li className="cursor-pointer" onClick={onSelect}>
      <img
        src={style.image}
        className={`mb-1 block aspect-square size-16 w-full rounded-lg border ${
          isSelected ? 'border-primary-500' : 'border-transparent'
        }`}
        alt={style.name}
      />
      <p className="text-text-50 text-center text-xs">{style.name}</p>
    </li>
  );
}

interface ModeButtonProps {
  mode: (typeof GENERATION_MODES)[number];
  isSelected: boolean;
  onSelect: () => void;
}

function ModeButton({ mode, isSelected, onSelect }: ModeButtonProps) {
  return (
    <button
      onClick={onSelect}
      className={`text-title-50 bg-background-50 inline-flex h-12 cursor-pointer items-center justify-center rounded-lg border px-4 py-3.5 text-sm font-medium ${
        isSelected ? 'border-primary-500' : 'border-transparent'
      }`}
    >
      {mode.name}
    </button>
  );
}

interface GeneratedImageProps {
  src: string;
}

function GeneratedImage({ src }: GeneratedImageProps) {
  return (
    <div className="group relative">
      <img src={src} className="w-full rounded-2xl" alt="Generated" />
      <button className="bg-background-50 border-base-50 text-text-100 absolute right-5 bottom-5 inline-flex h-8 w-8 items-center justify-center rounded-full border opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100">
        <Download1 className="size-[18px]" />
      </button>
    </div>
  );
}

interface SidebarContentProps {
  selectedStyle: number;
  setSelectedStyle: (id: number) => void;
  generationMode: number;
  setGenerationMode: (id: number) => void;
  numImages: string;
  setNumImages: (value: string) => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
}

function SidebarContent({
  selectedStyle,
  setSelectedStyle,
  generationMode,
  setGenerationMode,
  numImages,
  setNumImages,
  aspectRatio,
  setAspectRatio,
}: SidebarContentProps) {
  return (
    <div>
      <h3 className="text-title-50 mb-4 text-base font-semibold">
        Select Model
      </h3>
      <div className="bg-background-50 mb-8 flex items-center justify-between rounded-xl p-3">
        <p className="text-title-50 text-sm font-medium">Model</p>
        <a
          href="javascript:void(0)"
          className="text-text-200 flex items-center gap-2 text-sm"
        >
          Flux 1.0 Fast
          <ChevronRight className="text-text-50 size-5" />
        </a>
      </div>

      <div className="mb-8">
        <span className="text-text-100 mb-2 block text-sm">Image style</span>
        <ul className="grid grid-cols-4 gap-1.5">
          {IMAGE_STYLES.map((style) => (
            <StyleItem
              key={style.id}
              style={style}
              isSelected={selectedStyle === style.id}
              onSelect={() => setSelectedStyle(style.id)}
            />
          ))}
        </ul>
      </div>

      <div className="mb-8">
        <span className="text-text-100 mb-2 block text-sm">
          Generation mode
        </span>
        <div className="flex gap-2">
          {GENERATION_MODES.map((mode) => (
            <ModeButton
              key={mode.id}
              mode={mode}
              isSelected={generationMode === mode.id}
              onSelect={() => setGenerationMode(mode.id)}
            />
          ))}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3">
        <div>
          <label className="text-text-100 mb-2 block text-sm">Images</label>
          <select
            value={numImages}
            onChange={(e) => setNumImages(e.target.value)}
            className="bg-input-background text-title-50 h-12 w-full cursor-pointer rounded-xl border border-transparent py-2.5 pr-10"
          >
            {IMAGE_COUNT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-text-100 mb-2 block text-sm">
            Aspect Ratio
          </label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="bg-input-background text-title-50 h-12 w-full cursor-pointer rounded-xl border border-transparent py-2.5 pr-10"
          >
            {ASPECT_RATIO_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default function ImageGenerator2() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(0);
  const [generationMode, setGenerationMode] = useState(1);
  const [numImages, setNumImages] = useState('1');
  const [aspectRatio, setAspectRatio] = useState('1:1');

  const sidebarProps = {
    selectedStyle,
    setSelectedStyle,
    generationMode,
    setGenerationMode,
    numImages,
    setNumImages,
    aspectRatio,
    setAspectRatio,
  };

  return (
    <div className="bg-background-soft-300 min-h-screen lg:flex">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="bg-foreground-soft-500/75 absolute inset-0" />
        </div>
      )}

      {/* Mobile slide-out menu */}
      {mobileMenuOpen && (
        <aside className="bg-background-soft-50 fixed inset-y-0 left-0 z-50 w-80 overflow-y-auto p-6 lg:hidden">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-title-50 text-lg font-semibold">Settings</h2>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="focus:ring-primary-500 hover:bg-background-soft-100 hover:text-text-100 text-text-200 rounded-md p-2 focus:ring-2 focus:outline-none focus:ring-inset"
            >
              <span className="sr-only">Close menu</span>
              <Xmark2x className="size-6" />
            </button>
          </div>
          <SidebarContent {...sidebarProps} />
        </aside>
      )}

      {/* Desktop sidebar */}
      <aside className="bg-background-soft-50 hidden w-81.5 p-6 lg:block">
        <SidebarContent {...sidebarProps} />
      </aside>

      <div className="flex-1 p-4 lg:p-7">
        <header className="sm:flow-row bg-background-50 flex flex-col justify-between gap-5 rounded-xl p-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="focus:ring-primary-500 hover:bg-background-soft-100 hover:text-text-100 text-text-200 rounded-md p-2 focus:ring-2 focus:outline-none focus:ring-inset lg:hidden"
            >
              <span className="sr-only">Open menu</span>
              <MenuHamburger1 className="size-6" />
            </button>

            <p className="text-text-100 flex items-center gap-3 text-base">
              <Plus className="size-6" />
              <span className="hidden sm:inline">
                Describe what you want to generate..
              </span>
              <span className="sm:hidden">Add prompt..</span>
            </p>
          </div>
          <button className="bg-primary-500 hover:bg-primary-600 text-white-100 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium">
            <Sparkle className="size-6" />
            Generate
          </button>
        </header>

        <div className="mt-6">
          <div className="mb-8">
            <span className="text-title-50 mb-2 block text-base font-medium">
              Prompt
            </span>
            <p className="text-text-100 text-base leading-6">
              Serene minimalist watercolor sky landscape, grainy and textured
              with soft pastel gradient from deep blue to light near horizon.
              Semi-transparent dreamy clouds, delicate painterly style, visible
              watercolor textures, soft edges, subtle noise for artistic effect.
              Includes distant hills and trees, no objects or ground in
              foreground. Calming, ethereal mood, 9:14 landscape format.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GENERATED_IMAGES.map((src) => (
              <GeneratedImage key={src} src={src} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
