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

export default function VideoGenerator4() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <div className="bg-background-50 flex min-h-screen flex-col">
      {/* Chat Container */}
      <div className="mx-auto w-full max-w-[830px] flex-1 overflow-y-auto px-2 pb-40 sm:px-0 sm:pb-30">
        {/* Chat Messages */}
        <div className="space-y-6 p-4 pb-40">
          {/* User Message */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs sm:max-w-lg">
              <div className="text-title-50 bg-background-soft-100 rounded-3xl rounded-tr-md px-5 py-4">
                <p className="text-base">
                  Create an Instagram Reel for a travel vlog with smooth
                  transitions and uplifting background music
                </p>
              </div>
            </div>
          </div>

          {/* AI Response 1 */}
          <div className="flex flex-col space-y-4">
            {/* AI Header */}
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <g clip-path="url(#clip0_11928_2513)">
                  <path
                    d="M16 8.016C13.9242 8.14339 11.9666 9.02545 10.496 10.496C9.02545 11.9666 8.14339 13.9242 8.016 16H7.984C7.85682 13.9241 6.97483 11.9664 5.5042 10.4958C4.03358 9.02518 2.07588 8.14318 0 8.016L0 7.984C2.07588 7.85682 4.03358 6.97483 5.5042 5.5042C6.97483 4.03358 7.85682 2.07588 7.984 0L8.016 0C8.14339 2.07581 9.02545 4.03339 10.496 5.50397C11.9666 6.97455 13.9242 7.85661 16 7.984V8.016Z"
                    fill="url(#paint0_radial_11928_2513)"
                  />
                </g>
                <defs>
                  <radialGradient
                    id="paint0_radial_11928_2513"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(1.588 6.503) rotate(18.6832) scale(17.03 136.421)"
                  >
                    <stop offset="0.067" stop-color="#3758F9" />
                    <stop offset="0.343" stop-color="#5E84FC" />
                    <stop offset="0.672" stop-color="#BECDFF" />
                  </radialGradient>
                  <clipPath id="clip0_11928_2513">
                    <rect width="16" height="16" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <span className="text-text-100 text-sm">Google Veo 3 Fast</span>
            </div>

            {/* AI Message */}
            <div>
              <p className="text-title-50 mb-4 leading-relaxed">
                Here’s your Instagram Reel based on your prompt — a travel vlog
                with smooth transitions and uplifting background music. ✨ Hope
                you enjoy the journey!
              </p>
              <div className="border-base-50 max-w-xs overflow-hidden rounded-3xl border">
                <video
                  className="h-auto w-full rounded-3xl"
                  poster="/src/assets https://cdn-tailgrids.b-cdn.net/3.0/ai-components/video-generators/video-generator-04/poster.jpg"
                  controls
                >
                  <source
                    src="https://www.w3schools.com/html/mov_bbb.mp4"
                    type="video/mp4"
                  />
                  Your browser does not support the video tag.
                </video>
              </div>
              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-3">
                <button className="group hover:bg-background-soft-100 text-text-50 border-base-50 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors">
                  <Download1 className="size-4.5" />
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

      {/* Fixed Input Area */}
      <div className="bg-background-50 fixed right-0 bottom-0 left-0 z-10 px-4 pt-6 pb-10">
        <div className="mx-auto max-w-[800px]">
          <div className="bg-background-soft-100 rounded-3xl p-1 shadow-[0_12px_32px_-2px_rgba(16,24,40,0.03)]">
            {/* Chat Input */}
            <div className="relative">
              <textarea
                className="bg-background-50 text-title-50 placeholder:text-text-200 block max-h-40 min-h-[120px] w-full resize-none rounded-[20px] border-0 px-5 py-4 focus:ring-0 focus:outline-none sm:leading-6"
                placeholder="Ask me anything..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              ></textarea>
              {/* Bottom Controls */}
              <div className="flex flex-col items-start justify-between gap-3 px-3 pt-3 pb-2 sm:flex-row sm:items-center sm:gap-0">
                {/* Left Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <button className="bg-background-50 hover:bg-background-soft-200 text-text-100 inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="21"
                      height="20"
                      viewBox="0 0 21 20"
                      fill="none"
                    >
                      <path
                        d="M9.08105 1.54297C11.0615 1.54316 12.668 3.14903 12.668 5.12988V13.4551C12.6676 14.6523 11.6963 15.623 10.499 15.623C9.30207 15.6226 8.33139 14.652 8.33105 13.4551V5.12988C8.33105 4.71582 8.66705 4.38013 9.08105 4.37988C9.49527 4.37988 9.83105 4.71567 9.83105 5.12988V13.4551C9.83139 13.8236 10.1305 14.1226 10.499 14.123C10.8679 14.123 11.1676 13.8239 11.168 13.4551V12.0547C11.1678 12.0487 11.167 12.0421 11.167 12.0361L11.168 5.12988C11.168 3.97778 10.2334 3.04316 9.08105 3.04297C7.92883 3.04315 6.99414 3.97762 6.99414 5.12988V13.4551C6.99448 15.3903 8.5638 16.9597 10.499 16.96C12.4345 16.96 14.0036 15.3905 14.0039 13.4551V7.96582C14.0041 7.5519 14.34 7.21609 14.7539 7.21582C15.168 7.21582 15.5038 7.55173 15.5039 7.96582V13.4551C15.5036 16.2189 13.2629 18.46 10.499 18.46C7.73537 18.4597 5.49448 16.2187 5.49414 13.4551V5.12988C5.49414 3.14919 7.1004 1.54315 9.08105 1.54297Z"
                        fill="currentColor"
                      />
                    </svg>
                    Attach
                  </button>
                  <div className="relative inline-block text-left">
                    {/* Dropdown Button */}
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="hover:bg-background-soft-100 text-text-50 inline-flex cursor-pointer items-center gap-2 rounded-full bg-transparent px-3 py-2 text-sm font-medium transition-colors"
                    >
                      {/* Icon */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                      >
                        <path
                          d="M16.8759 9.17444C16.8759 8.52695 16.8223 8.05445 16.7063 7.56445H9.16162V10.4869H13.5902C13.5009 11.2132 13.0188 12.3069 11.9473 13.0419L11.9323 13.1397L14.3178 14.9508L14.483 14.967C16.0009 13.5932 16.8759 11.5719 16.8759 9.17444Z"
                          fill="#4285F4"
                        />
                        <path
                          d="M9.16098 16.8752C11.3306 16.8752 13.152 16.1751 14.4824 14.9677L11.9467 13.0426C11.2681 13.5064 10.3574 13.8301 9.16098 13.8301C7.03601 13.8301 5.23246 12.4564 4.58954 10.5576L4.4953 10.5655L2.01486 12.4467L1.98242 12.5351C3.30383 15.1076 6.01811 16.8752 9.16098 16.8752Z"
                          fill="#34A853"
                        />
                        <path
                          d="M4.59022 10.5576C4.42058 10.0676 4.32241 9.54257 4.32241 9.00009C4.32241 8.45756 4.42058 7.93258 4.5813 7.44259L4.57681 7.33823L2.06527 5.42676L1.9831 5.46506C1.43848 6.53258 1.12598 7.73135 1.12598 9.00009C1.12598 10.2688 1.43848 11.4676 1.9831 12.5351L4.59022 10.5576Z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M9.16103 4.16998C10.6699 4.16998 11.6878 4.80873 12.2682 5.34251L14.536 3.1725C13.1432 1.90375 11.3306 1.125 9.16103 1.125C6.01814 1.125 3.30384 2.89249 1.98242 5.46496L4.58063 7.44249C5.23248 5.54375 7.03604 4.16998 9.16103 4.16998Z"
                          fill="#EB4335"
                        />
                      </svg>
                      gemini-2.0-flash
                      {/* Chevron */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="10"
                        height="6"
                        viewBox="0 0 10 6"
                        fill="none"
                        className={`transition-transform ${
                          dropdownOpen ? 'rotate-180' : ''
                        }`}
                      >
                        <path
                          d="M0.833008 0.917969L4.99967 5.08464L9.16634 0.917969"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    <div
                      className={`bg-background-50 border-base-50 absolute right-0 bottom-full z-30 mb-2 w-48 rounded-xl border p-1 shadow-lg ${
                        dropdownOpen ? '' : 'hidden'
                      }`}
                    >
                      <ul className="text-text-50 text-sm">
                        <li>
                          <a
                            href="javascript:void(0)"
                            className="hover:bg-background-soft-100 block rounded-lg px-4 py-2"
                            onClick={() => setDropdownOpen(false)}
                          >
                            Google Veo 3 Fast
                          </a>
                        </li>
                        <li>
                          <a
                            href="javascript:void(0)"
                            className="hover:bg-background-soft-100 block rounded-lg px-4 py-2"
                            onClick={() => setDropdownOpen(false)}
                          >
                            Google Veo 2 Fast
                          </a>
                        </li>
                        <li>
                          <a
                            href="javascript:void(0)"
                            className="hover:bg-background-soft-100 block rounded-lg px-4 py-2"
                            onClick={() => setDropdownOpen(false)}
                          >
                            gemini-2.0-flash
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* <!-- Right Controls --> */}
                <div className="flex items-center gap-3">
                  <button className="hover:bg-background-soft-200 text-text-100 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="21"
                      height="20"
                      viewBox="0 0 21 20"
                      fill="none"
                    >
                      <path
                        d="M16.333 8.72363C16.6917 8.72398 16.9824 9.01526 16.9824 9.37402C16.9824 12.735 14.4245 15.4978 11.1494 15.8242V17.0566H12.165C12.5239 17.0566 12.8153 17.3482 12.8154 17.707C12.8154 18.066 12.524 18.3574 12.165 18.3574H8.83203C8.4732 18.3572 8.18164 18.0659 8.18164 17.707C8.18182 17.3483 8.4733 17.0568 8.83203 17.0566H9.84863V15.8242C6.57338 15.4979 4.01562 12.7351 4.01562 9.37402C4.01562 9.01504 4.30703 8.72363 4.66602 8.72363C5.02485 8.72381 5.31641 9.01515 5.31641 9.37402C5.31641 12.2341 7.63213 14.5524 10.4912 14.5566H10.5059C13.3652 14.5528 15.6826 12.2343 15.6826 9.37402C15.6826 9.01504 15.974 8.72363 16.333 8.72363ZM10.499 1.64062C12.6987 1.64077 14.4823 3.42433 14.4824 5.62402V9.37402C14.4822 11.5737 12.6987 13.3573 10.499 13.3574C8.29935 13.3573 6.5158 11.5737 6.51562 9.37402V5.62402C6.51579 3.42434 8.29934 1.64079 10.499 1.64062ZM10.499 2.94141C9.01731 2.94157 7.81657 4.14231 7.81641 5.62402V9.37402C7.81658 10.8557 9.01732 12.0575 10.499 12.0576C11.9807 12.0575 13.1824 10.8557 13.1826 9.37402V5.62402C13.1825 4.1423 11.9807 2.94155 10.499 2.94141Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <button className="hover:bg-foreground-soft-500 bg-foreground-soft-500 text-white-100 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="21"
                      height="20"
                      viewBox="0 0 21 20"
                      fill="none"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M11.6059 5.70944L11.6059 16.875C11.6059 17.3721 11.2026 17.7754 10.7055 17.7754C10.2085 17.7754 9.80515 17.3721 9.80515 16.875L9.80515 5.71513L6.34413 9.17383C5.99255 9.52519 5.42303 9.52541 5.07167 9.17383C4.72039 8.82224 4.72109 8.2527 5.07265 7.90137L10.0296 2.94633C10.1947 2.75892 10.4364 2.64063 10.7055 2.64063C10.7778 2.64063 10.8481 2.64916 10.9155 2.66527C11.0444 2.69571 11.1679 2.75489 11.2758 2.84277L11.3441 2.9043L16.3441 7.90137C16.6957 8.2527 16.6964 8.82223 16.3451 9.17383C15.9938 9.52542 15.4242 9.52518 15.0726 9.17383L11.6059 5.70944Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
