import { ArrowUpward, ChevronDown, Paperclip2 } from '@tailgrids/icons';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';

export default function TextGenerator3() {
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');

  return (
    <section>
      <div className="bg-background-soft-100 flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto w-full max-w-3xl">
          {/* <!-- Header Section --> */}
          <div className="mx-auto mb-9 max-w-md text-center">
            {/* <!-- Main Heading --> */}
            <h1 className="text-title-50 mb-3 text-3xl leading-9 font-medium">
              Introducing Tailgrids AI
            </h1>
            <p className="text-text-100 text-sm leading-5">
              Tailgrids AI is our smartest and fastest chatbot — built to give
              you accurate, helpful answers every time.
            </p>
          </div>

          {/* <!-- Text Generator Interface --> */}
          <div className="relative z-50 mx-auto max-w-[752px]">
            <div className="bg-background-50 border-base-50 rounded-3xl border p-3 shadow-[0_5px_15px_0_rgba(16,24,40,0.03)]">
              {/* <!-- Chat Input --> */}
              <div className="relative">
                <textarea
                  className="text-title-50 border-base-50 placeholder:text-text-200 block h-22.5 w-full resize-none rounded-2xl border-0 bg-transparent focus:ring-0 sm:text-lg sm:leading-6"
                  placeholder="Ask me anything..."
                ></textarea>

                {/* <!-- Bottom Controls --> */}
                <div className="flex items-center justify-between">
                  {/* <!-- Left Controls --> */}
                  <div className="flex items-center gap-2">
                    <button className="bg-background-soft-100 text-text-50 hover:bg-background-soft-200 inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors">
                      <Paperclip2 className="size-5" />
                      Attach
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="underline-none hover:bg-background-soft-100 text-text-50 data-pressed:bg-background-soft-100 inline-flex cursor-pointer items-center gap-2 rounded-full bg-transparent px-3 py-2 text-sm font-medium transition-colors outline-none">
                        {/* <!-- Icon --> */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M16 8.016C13.9242 8.14339 11.9666 9.02545 10.496 10.496C9.02545 11.9666 8.14339 13.9242 8.016 16H7.984C7.85682 13.9241 6.97483 11.9664 5.5042 10.4958C4.03358 9.02518 2.07588 8.14318 0 8.016L0 7.984C2.07588 7.85682 4.03358 6.97483 5.5042 5.5042C6.97483 4.03358 7.85682 2.07588 7.984 0L8.016 0C8.14339 2.07581 9.02545 4.03339 10.496 5.50397C11.9666 6.97455 13.9242 7.85661 16 7.984V8.016Z"
                            fill="url(#paint0_radial_11617_7148)"
                          />
                          <defs>
                            <radialGradient
                              id="paint0_radial_11617_7148"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientUnits="userSpaceOnUse"
                              gradientTransform="translate(1.588 6.503) rotate(18.6832) scale(17.03 136.421)"
                            >
                              <stop offset="0.067" stopColor="#9168C0" />
                              <stop offset="0.343" stopColor="#5684D1" />
                              <stop offset="0.672" stopColor="#1BA1E3" />
                            </radialGradient>
                          </defs>
                        </svg>
                        {selectedModel}
                        {/* <!-- Chevron --> */}
                        <ChevronDown className="size-5 transition-transform duration-200 group-data-open:rotate-180" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        placement="top start"
                        className="bg-background-50 border-base-50 w-48 rounded-xl border p-1 shadow-md"
                      >
                        <DropdownMenuItem
                          onAction={() => setSelectedModel('gemini-1.5-pro')}
                          className="hover:bg-background-soft-100 cursor-pointer rounded-lg px-4 py-2"
                        >
                          gemini-1.5-pro
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onAction={() => setSelectedModel('gemini-1.5-flash')}
                          className="hover:bg-background-soft-100 cursor-pointer rounded-lg px-4 py-2"
                        >
                          gemini-1.5-flash
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onAction={() => setSelectedModel('gemini-2.0-flash')}
                          className="hover:bg-background-soft-100 cursor-pointer rounded-lg px-4 py-2"
                        >
                          gemini-2.0-flash
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* <!-- Right Controls --> */}
                  <div className="flex items-center">
                    <button className="hover:bg-foreground-soft-500 text-white-100 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gray-800 transition-colors">
                      <ArrowUpward className="size-5" />
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
