import {
  Download1,
  MenuKebab1,
  ThumbsDown2,
  ThumbsUp2,
} from '@tailgrids/icons';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';

export default function VideoGenerator3() {
  const [soundEffect, setSoundEffect] = useState(true);
  const [model, setModel] = useState('Google Veo 3 Fast');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState('4s');
  const [resolution, setResolution] = useState('1080p');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [style, setStyle] = useState('realistic');

  return (
    <section className="min-h-screen">
      <div className="mx-auto max-w-[1432px]">
        <div className="flex flex-col gap-2.5 p-2.5 lg:flex-row">
          {/* <!-- Settings Sidebar --> */}
          <aside className="bg-background-soft-100 order-2 flex flex-col justify-between lg:order-1 lg:w-108.5">
            <div className="flex-1 space-y-5 p-5">
              <h3 className="text-title-50 mb-5 text-lg font-medium">
                Generate video
              </h3>
              <div className="mb-5">
                <p className="text-text-100 mb-3 block text-sm">Select model</p>
                <select
                  className="bg-background-50 w-full cursor-pointer rounded-xl border-0 py-3.5 pr-9 pl-4 text-sm font-medium"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="Google Veo 3 Fast">Google Veo 3 Fast</option>
                  <option value="Google Veo 2 Fast">Google Veo 2 Fast</option>
                  <option value="Google Veo 1 Fast">Google Veo 1 Fast</option>
                </select>
              </div>
              {/* <!-- File Upload Area --> */}
              <div className="mb-5">
                <div className="bg-background-50 border-base-200 rounded-xl border border-dashed p-8 text-center transition-colors duration-200">
                  {/* <!-- Cloud Upload Icon --> */}
                  <div className="mb-3 flex justify-center">
                    <svg
                      className="text-text-50"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M12.0009 11.8368L12.0009 18.7175M9.34787 14.4885L11.9997 11.8384L14.6517 14.4885M14.9453 19.2772H17.6742C20.0627 19.2772 21.9989 17.3409 21.9989 14.9524C21.9989 12.564 20.0627 10.6277 17.6742 10.6277H16.8643V9.56843C16.8643 6.8814 14.686 4.70312 11.999 4.70312C9.31192 4.70312 7.13365 6.88139 7.13365 9.56843L7.13365 10.6277H6.32276C3.93429 10.6277 1.99805 12.564 1.99805 14.9524C1.99805 17.3409 3.93429 19.2772 6.32276 19.2772H9.05078"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                  {/* <!-- Upload Text --> */}
                  <h4 className="text-title-50 mb-1 text-sm font-medium">
                    Drag & drop or click to upload
                  </h4>
                  <p className="text-text-100 mb-6 text-xs">
                    JPEG, PNG, PDG, and MP4 formats, up to 50MB
                  </p>
                  {/* <!-- Browse File Button --> */}
                  <button className="text-title-50 bg-background-50 border-base-200 hover:bg-background-soft-50 inline-flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-xs font-medium transition-colors duration-200">
                    Browse File
                  </button>
                  {/* <!-- Hidden File Input --> */}
                  <input
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdg,.mp4"
                    multiple
                  />
                </div>
              </div>
              {/* <!-- Prompt --> */}
              <div className="mb-5">
                <p className="text-text-100 mb-3 block text-sm">Prompt</p>
                <textarea
                  name="prompt"
                  id="prompt"
                  placeholder="Create an Instagram Reel for a travel vlog with smooth transitions and uplifting background music"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="text-dark placeholder-dark-6 bg-background-50 border-base-200 placeholder:text-text-200 h-22.5 w-full resize-none rounded-lg border p-3 text-sm outline-none"
                ></textarea>
              </div>
              {/* <!-- Sound --> */}
              <div className="bg-background-50 mb-3 flex items-center justify-between rounded-xl px-4 py-3">
                <span className="text-title-50 text-base font-medium">
                  Sound Effect
                </span>
                <button
                  onClick={() => setSoundEffect(!soundEffect)}
                  className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
                    soundEffect ? 'bg-primary-500' : 'bg-background-soft-300'
                  }`}
                >
                  <span
                    className={`bg-background-50 inline-block h-5 w-5 transform rounded-full transition-transform ${
                      soundEffect ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  ></span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-text-100 mb-3 block text-sm">Resolution</p>
                  <select
                    className="bg-background-50 w-full cursor-pointer rounded-xl border-0 py-3.5 pr-9 pl-4 text-sm font-medium"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  >
                    <option value="1080p">1080p</option>
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                  </select>
                </div>
                <div>
                  <p className="text-text-100 mb-3 block text-sm">Duration</p>
                  <select
                    className="bg-background-50 w-full cursor-pointer rounded-xl border-0 py-3.5 pr-9 pl-4 text-sm font-medium"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  >
                    <option value="4s">4s</option>
                    <option value="8s">8s</option>
                    <option value="12s">12s</option>
                  </select>
                </div>
                <div>
                  <p className="text-text-100 mb-3 block text-sm">
                    Aspect ratio
                  </p>
                  <select
                    className="bg-background-50 w-full cursor-pointer rounded-xl border-0 py-3.5 pr-9 pl-4 text-sm font-medium"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                  >
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                    <option value="1:1">1:1</option>
                  </select>
                </div>
                <div>
                  <p className="text-text-100 mb-3 block text-sm">Style</p>
                  <select
                    className="bg-background-50 w-full cursor-pointer rounded-xl border-0 py-3.5 pr-9 pl-4 text-sm font-medium"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                  >
                    <option value="realistic">Realistic</option>
                    <option value="animated">Animated</option>
                    <option value="cinematic">Cinematic</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-2.5 p-3">
              {/* <!-- Generate Button --> */}
              <button className="bg-primary-500 hover:bg-primary/90 text-white-100 flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-base font-medium duration-200">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="21"
                  height="20"
                  viewBox="0 0 21 20"
                  fill="none"
                >
                  <g clip-path="url(#clip0_11980_2875)">
                    <path
                      d="M9.34533 5.18775L10.0767 6.86291C10.7276 8.35358 11.8991 9.54025 13.3604 10.1889L15.3735 11.0825C16.0135 11.3666 16.0135 12.2977 15.3735 12.5818L13.4232 13.4475C11.9243 14.1128 10.7318 15.3434 10.0921 16.885L9.35125 18.6701C9.07633 19.3326 8.16099 19.3326 7.88608 18.6701L7.14522 16.885C6.50547 15.3434 5.31294 14.1128 3.81404 13.4475L1.86382 12.5818C1.22378 12.2977 1.22378 11.3666 1.86382 11.0825L3.87692 10.1889C5.33824 9.54025 6.50976 8.35358 7.16062 6.86291L7.892 5.18775C8.17313 4.54391 9.06417 4.54391 9.34533 5.18775ZM16.6678 1.10917L16.8735 1.58058C17.2402 2.42108 17.9006 3.09033 18.7246 3.45642L19.3582 3.738C19.701 3.89025 19.701 4.38833 19.3582 4.54058L18.7601 4.80642C17.9148 5.18192 17.2426 5.87591 16.8822 6.745L16.671 7.25441C16.5237 7.60941 16.0329 7.60941 15.8857 7.25441L15.6745 6.745C15.3142 5.87591 14.6419 5.18192 13.7967 4.80642L13.1984 4.54058C12.8557 4.38833 12.8557 3.89025 13.1984 3.738L13.8321 3.45642C14.6562 3.09033 15.3165 2.42108 15.6832 1.58058L15.8889 1.10917C16.0394 0.764083 16.5172 0.764083 16.6678 1.10917Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_11980_2875">
                      <rect
                        width="20"
                        height="20"
                        fill="white"
                        transform="translate(0.5)"
                      />
                    </clipPath>
                  </defs>
                </svg>
                Generate
              </button>
            </div>
          </aside>

          {/* <!-- Main Content Area --> */}
          <div className="order-1 flex-1 py-2.5 lg:order-2">
            <div className="border-base-50 rounded-t-2xl border border-b-0 px-5 py-3">
              <p className="text-text-50 text-center text-sm font-medium">
                Preview video
              </p>
            </div>
            <div className="border-base-50 flex items-center justify-center rounded-b-2xl border">
              <div className="p-10 lg:p-30">
                <div>
                  <div className="border-base-50 overflow-hidden rounded-3xl border">
                    <video
                      className="h-auto w-full rounded-3xl"
                      poster=" https://cdn-tailgrids.b-cdn.net/3.0/ai-components/video-generators/video-generator-03/poster.jpg"
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
                      <Download1 className="size-5" />
                      Download
                    </button>
                    <div className="divide-base-100 border-base-50 flex divide-x rounded-full border">
                      <button className="hover:bg-background-soft-100 text-text-100 cursor-pointer rounded-l-full px-3 py-1.5 transition-colors">
                        <ThumbsUp2 className="size-4.5" />
                      </button>
                      <button className="hover:bg-background-soft-100 text-text-100 cursor-pointer rounded-r-full px-3 py-1.5 transition-colors">
                        <ThumbsDown2 className="size-4.5" />
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
        </div>
      </div>
    </section>
  );
}
