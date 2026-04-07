import {
  ArrowUpward,
  Brain1,
  ChevronDown,
  Code1,
  FileText,
  Paperclip2,
  MenuHamburger1,
  Xmark2x,
} from '@tailgrids/icons';
import { useState } from 'react';

export default function AiHero3() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen p-4">
      {/* Header */}
      <header className="absolute top-8 right-0 left-0 z-50 w-full px-8 xl:px-0">
        <nav className="bg-background-50 mx-auto max-w-7xl rounded-2xl px-6 py-4 lg:pr-4 lg:pl-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex lg:flex-1">
              <a
                href="javascript:void(0)"
                className="-m-1.5 flex items-center gap-2 p-1.5"
              >
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                  alt=""
                />
              </a>
            </div>

            {/* Navigation Menu */}
            <div className="hidden lg:gap-x-7 xl:flex">
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-primary-500 text-base leading-6 font-medium"
              >
                Features
              </a>
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-primary-500 text-base leading-6 font-medium"
              >
                Pricing
              </a>
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-primary-500 text-base leading-6 font-medium"
              >
                Product
              </a>
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-primary-500 text-base leading-6 font-medium"
              >
                About
              </a>
            </div>

            {/* Sign In & Get Started */}
            <div className="hidden xl:flex xl:flex-1 xl:justify-end xl:gap-x-4">
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 border-base-200 hover:text-title-50 inline-flex h-12 w-12 items-center justify-center rounded-lg border text-base leading-6 font-medium transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M6.24707 7.08426C6.24707 10.7671 9.23257 13.7526 12.9154 13.7526C14.6689 13.7526 16.2643 13.0757 17.4547 11.969C16.5843 15.272 13.5767 17.7076 10.0003 17.7076C5.74313 17.7076 2.29199 14.2565 2.29199 9.9993C2.29199 6.4229 4.7276 3.41537 8.0306 2.54492C6.92392 3.73528 6.24707 5.33073 6.24707 7.08426Z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 border-base-200 hover:text-title-50 inline-flex h-12 items-center justify-center rounded-lg border px-5 py-3 text-base leading-6 font-medium transition-colors"
              >
                Sign In
              </a>
              <a
                href="javascript:void(0)"
                className="bg-primary-500 hover:bg-primary-600 text-white-100 inline-flex h-12 items-center justify-center rounded-lg px-5 py-3 text-base font-medium transition-colors"
              >
                Get Started
              </a>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="hover:bg-background-soft-100 text-title-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-transparent transition-colors xl:hidden"
            >
              {mobileMenuOpen ? (
                <Xmark2x className="h-6 w-6" />
              ) : (
                <MenuHamburger1 className="h-6 w-6" />
              )}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="mt-4 xl:hidden">
              <div className="space-y-1 pt-2 pb-4">
                <a
                  href="javascript:void(0)"
                  className="hover:bg-background-soft-100 text-text-50 hover:text-title-50 block rounded-lg px-3 py-2 text-base font-medium"
                >
                  Features
                </a>
                <a
                  href="javascript:void(0)"
                  className="hover:bg-background-soft-100 text-text-50 hover:text-title-50 block rounded-lg px-3 py-2 text-base font-medium"
                >
                  Pricing
                </a>
                <a
                  href="javascript:void(0)"
                  className="hover:bg-background-soft-100 text-text-50 hover:text-title-50 block rounded-lg px-3 py-2 text-base font-medium"
                >
                  Product
                </a>
                <a
                  href="javascript:void(0)"
                  className="hover:bg-background-soft-100 text-text-50 hover:text-title-50 block rounded-lg px-3 py-2 text-base font-medium"
                >
                  About
                </a>
              </div>
              <div className="border-base-50 flex flex-col gap-3 border-t pt-5">
                <a
                  href="javascript:void(0)"
                  className="text-title-50 hover:bg-background-soft-100 border-base-200 hover:text-title-50 inline-flex h-12 w-full items-center justify-center rounded-lg border px-5 py-3 text-base leading-6 font-medium transition-colors"
                >
                  Contact
                </a>
                <a
                  href="javascript:void(0)"
                  className="text-title-50 hover:bg-background-soft-100 border-base-200 hover:text-title-50 inline-flex h-12 w-full items-center justify-center rounded-lg border px-5 py-3 text-base leading-6 font-medium transition-colors"
                >
                  Sign In
                </a>
                <a
                  href="javascript:void(0)"
                  className="bg-primary-500 hover:bg-primary-600 text-white-100 inline-flex h-12 w-full items-center justify-center rounded-lg px-5 py-3 text-base font-medium transition-colors"
                >
                  Get Started
                </a>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="bg-background-soft-100 relative isolate z-30 overflow-hidden rounded-xl">
        <div className="mx-auto max-w-7xl px-4 pt-44 pb-30 xl:px-0">
          <div className="mx-auto max-w-3xl px-10">
            {/* New Badge */}
            <div className="mb-6 flex justify-center">
              <div className="bg-background-50 text-text-50 inline-flex h-7.5 items-center gap-2 rounded-lg p-1 pr-4 text-sm font-medium">
                <span className="text-text-50 ring-background-soft-400 inline-flex h-5 w-5 items-center justify-center gap-1 rounded-md p-1 text-sm font-medium ring-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="11"
                    height="14"
                    viewBox="0 0 11 14"
                    fill="none"
                  >
                    <path
                      d="M6.12058 1.24479C6.12058 0.855976 5.62195 0.695746 5.39546 1.01178L0.453669 7.90712C0.263975 8.17181 0.453155 8.54014 0.778795 8.54014H4.47942C4.70033 8.54014 4.87942 8.71922 4.87942 8.94014V12.7552C4.87942 13.144 5.37805 13.3043 5.60454 12.9882L10.5463 6.09288C10.736 5.82819 10.5468 5.45986 10.2212 5.45986H6.52058C6.29967 5.45986 6.12058 5.28078 6.12058 5.05986V1.24479Z"
                      fill="#91AEFF"
                    />
                  </svg>
                </span>
                <span className="text-text-100">
                  The ultimate tool for dynamic teams
                </span>
              </div>
            </div>
            {/* Main Heading */}
            <h1 className="text-title-50 mb-12 text-center text-4xl font-medium sm:text-5xl sm:leading-13">
              Meet your new AI companion, here to help you.
            </h1>
          </div>
          {/* Chat Interface */}
          <div className="relative z-50 mx-auto max-w-[797px]">
            <div className="bg-background-50/10 border-white-100/10 rounded-[32px] border-10">
              <div className="bg-background-50 rounded-3xl p-3 shadow-[0_8px_30px_0_rgba(16,24,40,0.03)]">
                {/* Chat Input */}
                <div className="relative">
                  <textarea
                    className="text-title-50 border-base-50 placeholder:text-text-200 block h-22.5 w-full resize-none rounded-2xl border-0 bg-transparent focus:ring-0 sm:text-lg sm:leading-6"
                    placeholder="Ask me anything..."
                  ></textarea>

                  {/* Bottom Controls */}
                  <div className="flex items-center justify-between">
                    {/* Left Controls */}
                    <div className="flex items-center gap-2">
                      <button className="bg-background-soft-100 text-text-50 hover:bg-background-soft-200 inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors">
                        <Paperclip2 className="size-5" />
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
                          gemini-2.0-flash
                          {/* Chevron */}
                          <ChevronDown
                            className={`size-5 transition-transform ${
                              dropdownOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                          <div className="bg-background-50 border-base-50 absolute right-0 z-20 w-48 rounded-xl border p-1 shadow-md">
                            <ul className="text-text-50 text-sm">
                              <li>
                                <a
                                  href="javascript:void(0)"
                                  className="hover:bg-background-soft-100 block rounded-lg px-4 py-2"
                                  onClick={() => setDropdownOpen(false)}
                                >
                                  gemini-1.5-pro
                                </a>
                              </li>
                              <li>
                                <a
                                  href="javascript:void(0)"
                                  className="hover:bg-background-soft-100 block rounded-lg px-4 py-2"
                                  onClick={() => setDropdownOpen(false)}
                                >
                                  gemini-1.5-flash
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
                        )}
                      </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center">
                      <button className="hover:bg-foreground-soft-500 bg-foreground-soft-500 text-white-100 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors">
                        <ArrowUpward className="size-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <div className="flex flex-wrap justify-center gap-3">
                <button className="bg-background-50 text-text-50 hover:bg-background-soft-50 flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="17"
                    height="16"
                    viewBox="0 0 17 16"
                    fill="none"
                  >
                    <path
                      d="M5.27347 7.43916L3.16699 8.24935L5.27347 9.05953L6.08366 11.166L6.89384 9.05953L9.00033 8.24935L6.89384 7.43916L6.08366 5.33268L5.27347 7.43916Z"
                      stroke="#91AEFF"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M11.0651 4.23083L9.50033 4.83268L11.0651 5.43453L11.667 6.99935L12.2688 5.43453L13.8337 4.83268L12.2688 4.23083L11.667 2.66602L11.0651 4.23083Z"
                      stroke="#91AEFF"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.5975 11.0966L9.33366 11.5827L10.5975 12.0688L11.0837 13.3327L11.5698 12.0688L12.8337 11.5827L11.5698 11.0966L11.0837 9.83268L10.5975 11.0966Z"
                      stroke="#91AEFF"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Generate Image
                </button>
                <button className="bg-background-50 text-text-50 hover:bg-background-soft-50 flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors">
                  <FileText className="text-primary-300 size-4" />
                  Summarize PDF
                </button>
                <button className="bg-background-50 text-text-50 hover:bg-background-soft-50 flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors">
                  <Code1 className="text-primary-300 size-4" />
                  Explain Code
                </button>
                <button className="bg-background-50 text-text-50 hover:bg-background-soft-50 flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors">
                  <Brain1 className="text-primary-300 size-4" />
                  Brainstorm Ideas
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Background decoration */}
        <div>
          <img
            src=" https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-3/shape-1.png"
            className="absolute bottom-0 left-0 z-10 block w-full"
            alt=""
          />
          <img
            src=" https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-3/shape-2.png"
            className="absolute top-0 right-0 z-10 block w-full"
            alt=""
          />
        </div>
      </section>
    </div>
  );
}
