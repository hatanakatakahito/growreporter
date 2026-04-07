import { useState } from 'react';
import {
  Download1,
  MenuKebab1,
  Paperclip2,
  Rectangle,
  RectangleVertical,
  Sparkle,
  SparkleFill,
  ThumbsDown2,
  ThumbsUp2,
} from '@tailgrids/icons';
import { Toggle } from '@/components/core/toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';

// Data constants
const DURATION_OPTIONS = ['4s', '8s', '12s'] as const;
const STYLE_OPTIONS = [
  'Realistic',
  'Animated',
  'Cinematic',
  'Minimalist',
] as const;

const ASPECT_RATIOS = [
  { id: 'landscape', label: 'Landscape', Icon: Rectangle },
  { id: 'portrait', label: 'Portrait', Icon: RectangleVertical },
];

const QUALITY_OPTIONS = [
  { id: 'standard', label: 'Standard', isPro: false },
  { id: 'hd', label: 'HD', isPro: true },
  { id: '4k', label: '4K', isPro: true },
];

const CHAT_MESSAGES = [
  {
    id: 1,
    type: 'user' as const,
    content:
      'Create an Instagram Reel for a travel vlog with smooth transitions and uplifting background music',
  },
  {
    id: 2,
    type: 'assistant' as const,
    content:
      "Great choice! Let's craft a cinematic travel reel with smooth transitions and an uplifting soundtrack.",
  },
  {
    id: 3,
    type: 'user' as const,
    content:
      'Make a professional product promo video for an e-commerce store, including text overlays and logo animation',
  },
  {
    id: 4,
    type: 'assistant' as const,
    content:
      "Got it! I'll design a sleek e-commerce promo with text highlights and call-to-action banners.",
  },
];

// Reusable components
interface RadioOptionProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

function RadioOption({
  selected,
  onClick,
  label,
  icon,
  badge,
}: RadioOptionProps) {
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer justify-between px-4 py-3"
    >
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-title-50 text-sm font-medium">
          {label}
          {badge && (
            <span className="bg-primary-50 text-primary-500 ml-1.5 inline-block h-5 rounded-2xl px-2 py-1 text-xs font-medium">
              {badge}
            </span>
          )}
        </p>
      </div>
      <div
        className={`mr-3 flex h-5 w-5 items-center justify-center rounded-full border-[1.25px] transition ${
          selected
            ? 'border-primary-500 bg-primary-500'
            : 'border-base-200 bg-transparent'
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            selected ? 'bg-background-50' : 'bg-transparent'
          }`}
        />
      </div>
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div className="relative">
      <label className="text-text-100 mb-2 text-sm font-medium">{label}</label>
      <select
        className="bg-background-50 border-base-200 w-full rounded-lg border py-2.5 pr-9 pl-4 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option.toLowerCase()}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function VideoGenerator2() {
  const [soundEffect, setSoundEffect] = useState(true);
  const [aspectRatio, setAspectRatio] = useState('landscape');
  const [quality, setQuality] = useState('standard');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState('4s');
  const [style, setStyle] = useState('realistic');

  return (
    <section className="bg-background-50 min-h-screen p-2.5">
      <div className="mx-auto max-w-[1432px] p-2.5">
        <div className="flex flex-col gap-2.5 lg:flex-row">
          {/* <!-- Settings Sidebar --> */}
          <aside className="bg-background-soft-100 order-2 flex flex-col justify-between rounded-2xl lg:order-1 lg:w-92.5">
            <div className="flex-1 space-y-5 p-5">
              <div className="mb-5">
                <h3 className="text-title-50 text-lg font-medium">
                  AI Video Generator
                </h3>
                <p className="text-text-100 text-sm">
                  Turn your ideas into videos instantly
                </p>
              </div>
              <ul className="space-y-6 overflow-y-auto">
                {CHAT_MESSAGES.map((message) =>
                  message.type === 'user' ? (
                    <li
                      key={message.id}
                      className="text-title-50 bg-background-50 rounded-3xl rounded-tr-lg px-5 py-3 text-base leading-6"
                    >
                      {message.content}
                    </li>
                  ) : (
                    <li key={message.id} className="relative flex items-start">
                      <p className="text-title-50 relative mr-2 text-base leading-6">
                        {message.content}
                      </p>
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="hover:bg-background-soft-200 data-pressed:bg-background-soft-200 text-text-100 flex items-center justify-center rounded-lg p-1 outline-hidden transition-colors">
                            <MenuKebab1 className="size-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            placement="bottom end"
                            className="bg-dropdown-background border-base-50 min-w-[140px] rounded-lg border p-1.5 shadow-lg"
                          >
                            <DropdownMenuItem className="text-text-50 hover:bg-background-soft-100 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-hidden">
                              Copy
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-text-50 hover:bg-background-soft-100 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-hidden">
                              Regenerate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-error-500 hover:bg-error-50 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-hidden">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </div>
            <div className="space-y-2.5 p-3">
              <div className="relative h-30">
                <textarea
                  name="prompt"
                  id="prompt"
                  placeholder="Describe your video project"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="text-dark placeholder-dark-6 bg-background-50 border-base-200 placeholder:text-text-200 h-full w-full resize-none rounded-lg border p-3 text-sm outline-none"
                ></textarea>
                <div className="text-text-100 absolute bottom-3.5 left-3.5 flex items-center gap-2">
                  <button className="text-body-color hover:text-dark flex h-8 w-8 cursor-pointer items-center justify-center rounded">
                    <Sparkle className="size-[18px]" />
                  </button>
                  <span>|</span>
                  <button className="text-body-color hover:text-dark flex h-8 w-8 cursor-pointer items-center justify-center rounded">
                    <Paperclip2 className="size-[18px]" />
                  </button>
                </div>
              </div>
              {/* <!-- Generate Button --> */}
              <button className="bg-primary-500 hover:bg-primary/90 text-white-100 flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-base font-medium duration-200">
                <SparkleFill className="size-5" />
                Generate
              </button>
            </div>
          </aside>

          {/* <!-- Main Content Area --> */}
          <div className="order-1 flex-1 lg:order-2">
            <div className="border-base-50 rounded-t-2xl border border-b-0 px-5 py-3">
              <p className="text-text-50 text-center text-sm font-medium">
                Preview video
              </p>
            </div>
            <div className="border-base-50 flex items-center justify-center rounded-b-2xl border">
              <div className="p-20">
                <div>
                  <div className="border-base-50 overflow-hidden rounded-3xl border">
                    <video
                      className="h-auto w-full rounded-3xl"
                      poster="https://cdn-tailgrids.b-cdn.net/3.0/ai-components/video-generators/video-generator-02/poster.jpg"
                      controls
                    >
                      <source
                        src="https://www.w3schools.com/html/mov_bbb.mp4"
                        type="video/mp4"
                      />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="mt-5 flex gap-1.5">
                    <button className="hover:bg-background-soft-100 border-base-50 text-text-100 flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors">
                      <Download1 className="size-[18px]" />
                      Download
                    </button>
                    <div className="divide-base-100 border-base-50 flex divide-x rounded-full border">
                      <button className="hover:bg-background-soft-100 text-text-100 cursor-pointer rounded-l-full px-3 py-1.5 transition-colors">
                        <ThumbsUp2 className="size-[18px]" />
                      </button>
                      <button className="hover:bg-background-soft-100 text-text-100 cursor-pointer rounded-r-full px-3 py-1.5 transition-colors">
                        <ThumbsDown2 className="size-[18px]" />
                      </button>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="hover:bg-background-soft-100 data-pressed:bg-background-soft-100 border-base-50 text-text-100 flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border py-1.5 text-xs font-medium outline-hidden transition-colors">
                        <MenuKebab1 />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        placement="bottom end"
                        className="bg-dropdown-background border-base-50 min-w-[140px] rounded-lg border p-1.5 shadow-lg"
                      >
                        <DropdownMenuItem className="text-text-50 hover:bg-background-soft-100 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-hidden">
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-text-50 hover:bg-background-soft-100 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-hidden">
                          Report
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-error-500 hover:bg-error-50 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-hidden">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* <!-- Right Sidebar Placeholder --> */}
          <aside className="bg-background-soft-100 order-3 rounded-2xl px-3 py-5 lg:order-3 lg:w-70">
            {/* <!-- Settings Section --> */}

            <div className="px-3">
              <h3 className="text-text-100 mb-4 text-sm font-medium">
                Settings
              </h3>
              <div className="space-y-5">
                {/* <!-- Sound Effect Toggle --> */}
                <div className="bg-background-50 mb-3 flex items-center justify-between rounded-xl px-4 py-3">
                  <span className="text-title-50 text-base font-medium">
                    Sound Effect
                  </span>
                  <Toggle
                    checked={soundEffect}
                    onChange={() => setSoundEffect(!soundEffect)}
                  />
                </div>
                {/* <!-- Aspect Ratio --> */}
                <div>
                  <h3 className="text-text-100 mb-4 text-sm font-medium">
                    Aspect ratio
                  </h3>
                  <div className="bg-background-50 divide-base-50 divide-y rounded-xl">
                    {ASPECT_RATIOS.map((ratio) => (
                      <RadioOption
                        key={ratio.id}
                        selected={aspectRatio === ratio.id}
                        onClick={() => setAspectRatio(ratio.id)}
                        label={ratio.label}
                        icon={<ratio.Icon className="text-text-100 h-5 w-5" />}
                      />
                    ))}
                  </div>
                </div>
                {/* <!-- Quality --> */}
                <div>
                  <h3 className="text-text-100 mb-4 text-sm font-medium">
                    Quality
                  </h3>
                  <div className="bg-background-50 divide-base-50 divide-y rounded-xl">
                    {QUALITY_OPTIONS.map((option) => (
                      <RadioOption
                        key={option.id}
                        selected={quality === option.id}
                        onClick={() => setQuality(option.id)}
                        label={option.label}
                        badge={option.isPro ? 'Pro' : undefined}
                      />
                    ))}
                  </div>
                </div>
                {/* <!-- Duration and Style --> */}
                <div>
                  <div className="space-y-3">
                    <SelectField
                      label="Duration"
                      value={duration}
                      onChange={setDuration}
                      options={DURATION_OPTIONS}
                    />
                    <SelectField
                      label="Style"
                      value={style}
                      onChange={setStyle}
                      options={STYLE_OPTIONS}
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
