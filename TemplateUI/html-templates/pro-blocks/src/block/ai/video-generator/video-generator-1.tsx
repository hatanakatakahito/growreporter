import { useState } from 'react';
import {
  Download1,
  InfoCircle,
  Paperclip2,
  Plus,
  Sparkle,
  SparkleFill,
  ThumbsDown2,
  ThumbsUp2,
} from '@tailgrids/icons';
import { Toggle } from '@/components/core/toggle';

// Data constants
const DURATION_OPTIONS = ['4s', '8s', '12s'] as const;
const RESOLUTION_OPTIONS = ['1080p', '720p', '4K'] as const;
const ASPECT_RATIO_OPTIONS = ['16:9', '9:16', '1:1'] as const;
const STYLE_OPTIONS = ['Cinematic', 'Realistic', 'Animated'] as const;
const LANGUAGE_OPTIONS = ['English', 'Spanish', 'French'] as const;
const VOICE_OPTIONS = ['Male', 'Female'] as const;

// Reusable select component
interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div>
      <label className="text-dark text-text-100 mb-2 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-background-50 border-base-200 w-full rounded-lg border py-2.5 pr-9 pl-4 text-sm"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Three dots icon (not available in @tailgrids/icons)
function DotsVerticalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="none"
    >
      <path
        d="M9.00293 12.25C9.69314 12.2502 10.2539 12.8097 10.2539 13.5C10.2539 14.1901 9.69389 14.7496 9.00391 14.75H8.99609C8.30574 14.75 7.74512 14.1904 7.74512 13.5C7.74512 12.8098 8.30499 12.2503 8.99512 12.25H9.00293ZM9.00293 7.75C9.69314 7.75017 10.2539 8.30975 10.2539 9C10.2539 9.69009 9.69389 10.2496 9.00391 10.25H8.99609C8.30574 10.25 7.74512 9.69036 7.74512 9C7.74512 8.30981 8.30499 7.75026 8.99512 7.75H9.00293ZM9.00293 3.25C9.69314 3.25017 10.2539 3.80975 10.2539 4.5C10.2539 5.19009 9.69389 5.74957 9.00391 5.75H8.99609C8.30574 5.75 7.74512 5.19036 7.74512 4.5C7.74512 3.80981 8.30499 3.25026 8.99512 3.25H9.00293Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function VideoGenerator1() {
  const [prompt, setPrompt] = useState('');
  const [soundEffect, setSoundEffect] = useState(true);
  const [caption, setCaption] = useState(false);
  const [duration, setDuration] = useState('4s');
  const [resolution, setResolution] = useState('1080p');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [style, setStyle] = useState('Cinematic');
  const [language, setLanguage] = useState('English');
  const [voice, setVoice] = useState('Male');

  return (
    <section className="bg-background-50 p-2.5">
      <div className="mx-auto max-w-[1432px] p-2.5">
        <div className="flex min-h-screen flex-col-reverse gap-2.5 lg:flex-row">
          {/* Settings Sidebar */}
          <aside className="bg-background-soft-100 flex flex-col justify-between rounded-2xl p-5 lg:w-92.5">
            <div className="flex-1 space-y-5">
              {/* Prompt Section */}
              <div>
                <h3 className="text-text-100 mb-2 text-sm font-medium">
                  Prompt
                </h3>
                <div className="relative">
                  <textarea
                    name="prompt"
                    id="prompt"
                    rows={4}
                    placeholder="Describe your video project"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="text-dark placeholder-dark-6 bg-background-50 border-base-200 placeholder:text-text-200 h-30 w-full resize-none rounded-lg border p-3 text-sm outline-none"
                  />
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
              </div>

              {/* Settings Section */}
              <div>
                <h3 className="text-text-100 mb-4 text-sm font-medium">
                  Settings
                </h3>

                {/* Sound Effect Toggle */}
                <div className="bg-background-50 mb-3 flex items-center justify-between rounded-lg px-4 py-3">
                  <span className="text-title-50 text-base font-medium">
                    Sound Effect
                  </span>
                  <Toggle
                    size="md"
                    checked={soundEffect}
                    onChange={() => setSoundEffect(!soundEffect)}
                  />
                </div>

                {/* Caption Toggle */}
                <div className="bg-background-50 mb-3 flex items-center justify-between rounded-lg px-4 py-3">
                  <span className="text-title-50 text-base font-medium">
                    Caption
                  </span>
                  <Toggle
                    size="md"
                    checked={caption}
                    onChange={() => setCaption(!caption)}
                  />
                </div>

                {/* Duration and Resolution */}
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <SelectField
                    label="Duration"
                    value={duration}
                    onChange={setDuration}
                    options={DURATION_OPTIONS}
                  />
                  <SelectField
                    label="Resolution"
                    value={resolution}
                    onChange={setResolution}
                    options={RESOLUTION_OPTIONS}
                  />
                </div>

                {/* Aspect Ratio and Style */}
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <SelectField
                    label="Aspect ratio"
                    value={aspectRatio}
                    onChange={setAspectRatio}
                    options={ASPECT_RATIO_OPTIONS}
                  />
                  <SelectField
                    label="Style"
                    value={style}
                    onChange={setStyle}
                    options={STYLE_OPTIONS}
                  />
                </div>

                {/* Language and Voice */}
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <SelectField
                    label="Language"
                    value={language}
                    onChange={setLanguage}
                    options={LANGUAGE_OPTIONS}
                  />
                  <SelectField
                    label="Voice"
                    value={voice}
                    onChange={setVoice}
                    options={VOICE_OPTIONS}
                  />
                </div>
              </div>
            </div>
            <div>
              {/* Generate Button */}
              <button className="bg-primary-500 hover:bg-primary/90 text-white-100 flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-base font-medium duration-200">
                <SparkleFill className="size-5" />
                Generate
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 space-y-2.5">
            <header className="border-base-50 rounded-2xl border px-5 py-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-title-50 text-base font-medium">
                    AI Video Generator
                  </h3>
                  <p className="text-text-100 text-sm">
                    Turn your ideas into videos instantly
                  </p>
                </div>
                <div className="flex gap-3">
                  <button className="text-title-50 border-base-200 flex h-10 w-12 items-center justify-center rounded-lg border">
                    <InfoCircle className="size-5" />
                  </button>
                  <button className="text-title-50 border-base-200 flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium">
                    <Plus className="size-5" />
                    New project
                  </button>
                </div>
              </div>
            </header>
            <div className="border-base-50 flex items-center justify-center rounded-2xl border lg:h-[calc(100vh-4rem)]">
              <div className="flex items-center justify-center p-10">
                <div>
                  <div className="border-base-50 overflow-hidden rounded-3xl border">
                    <video
                      className="h-auto w-full rounded-3xl"
                      poster="https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/video-generators/video-generator-01/image.jpg"
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
                    <button className="hover:bg-background-soft-100 border-base-50 text-text-100 flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border py-1.5 text-xs font-medium transition-colors">
                      <DotsVerticalIcon />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
