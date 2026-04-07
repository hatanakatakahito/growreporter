import { MenuHamburger1, Xmark2x } from '@tailgrids/icons';
import { useState } from 'react';

export default function AiHero2() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <>
      {/* <!-- Header --> */}
      <header className="bg-background-50 w-full">
        <nav className="mx-auto max-w-7xl rounded-2xl px-6 py-3.5 lg:px-8">
          <div className="flex items-center justify-between">
            {/* <!-- Logo --> */}
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

            {/* <!-- Navigation Menu --> */}
            <div className="hidden lg:gap-x-7 xl:flex">
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-title-50 text-base leading-6 font-medium"
              >
                Features
              </a>
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-title-50 text-base leading-6 font-medium"
              >
                Pricing
              </a>
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-title-50 text-base leading-6 font-medium"
              >
                Product
              </a>
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-title-50 text-base leading-6 font-medium"
              >
                About
              </a>
            </div>

            {/* <!-- Sign In & Get Started --> */}
            <div className="hidden xl:flex xl:flex-1 xl:justify-end xl:gap-x-4">
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 border-base-200 hover:text-title-50 inline-flex items-center justify-center rounded-lg border px-5 py-3 text-base leading-6 font-medium transition-colors"
              >
                Sign In
              </a>
              <a
                href="javascript:void(0)"
                className="bg-primary-500 hover:bg-primary-600 text-white-100 inline-flex items-center justify-center rounded-lg px-5 py-3 text-base font-medium transition-colors"
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
                  className="border-base-200 text-text-50 hover:text-title-50 hover:bg-background-soft-50 inline-flex w-full items-center justify-center rounded-lg border px-5 py-3 text-base font-medium transition-colors"
                >
                  Sign In
                </a>
                <a
                  href="javascript:void(0)"
                  className="bg-primary-500 hover:bg-primary-600 text-white-100 inline-flex w-full items-center justify-center rounded-lg px-5 py-3 text-base font-medium transition-colors"
                >
                  Get Started
                </a>
              </div>
            </div>
          )}
        </nav>
      </header>
      {/* <!-- Hero Section --> */}
      <section className="bg-background-soft-100 relative isolate overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-20 sm:pt-30 sm:pb-30 xl:px-0 xl:pb-50">
          <div className="mx-auto max-w-3xl px-5">
            {/* <!-- New Badge --> */}
            <div className="mb-6 flex justify-center">
              <div className="text-text-50 ring-background-soft-400 inline-flex h-10 items-center gap-1.5 rounded-full p-1 pr-4 text-sm font-medium ring-1">
                <div className="flex -space-x-2">
                  <img
                    src=" https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-2/avatar.png"
                    className="h-6 w-6 rounded-full"
                    alt=""
                  />
                  <img
                    src=" https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-2/avatar-2.png"
                    className="h-6 w-6 rounded-full"
                    alt=""
                  />
                  <img
                    src=" https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-2/avatar-3.png"
                    className="h-6 w-6 rounded-full"
                    alt=""
                  />
                </div>
                <span className="text-text-50">
                  Trusted by creators and artist
                </span>
              </div>
            </div>
            {/* <!-- Main Heading --> */}
            <h1 className="text-title-50 mb-3 text-center text-4xl font-medium sm:text-6xl sm:leading-16">
              Create Stunning AI Images just in Seconds
            </h1>
            <p className="text-text-100 mb-12 text-center text-lg leading-7 lg:px-22">
              Transform your ideas into breathtaking visuals with our
              cutting-edge AI image generator. create anything you can imagine.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="javascript:void(0)"
                className="bg-primary-500 hover:bg-primary-600 text-white-100 inline-flex items-center justify-center rounded-lg px-5 py-3 text-base font-medium transition-colors"
              >
                Start Creating Free
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 bg-background-50 hover:bg-background-soft-100 border-base-200 hover:text-title-50 inline-flex items-center justify-center rounded-lg border px-5 py-3 text-base leading-6 font-medium transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
        <div className="hidden xl:block">
          <div className="border-white-100 pointer-events-none absolute bottom-10 left-50 z-20 -rotate-[13.52deg] overflow-hidden rounded-2xl border-4 shadow-xl">
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-2/img-1.png"
              className="rounded-2xl"
              alt=""
            />
          </div>
          <div className="border-white-100 pointer-events-none absolute -bottom-10 left-10 rotate-[9.64deg] overflow-hidden rounded-2xl border-4 shadow-xl">
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-2/img-2.png"
              className="rounded-2xl"
              alt=""
            />
          </div>
          <div className="border-white-100 pointer-events-none absolute right-10 bottom-10 z-20 rotate-[9.3deg] overflow-hidden rounded-2xl border-4 shadow-xl">
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-2/img-3.png"
              className="rounded-2xl"
              alt=""
            />
          </div>
          <div className="border-white-100 pointer-events-none absolute right-60 -bottom-5 z-30 rotate-[162.98deg] overflow-hidden rounded-2xl border-4 shadow-xl">
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-2/img-4.png"
              className="rounded-2xl"
              alt=""
            />
          </div>
        </div>
        <div className="absolute -bottom-17.5 z-50 h-41 w-full bg-[#F3F4F6] blur-[32px]"></div>
        {/* <!-- Background decoration --> */}
        <div className="absolute top-0 left-1/2 -z-10 w-full -translate-x-1/2 overflow-hidden">
          <svg
            className="block w-full"
            width="1219"
            height="667"
            viewBox="0 0 1219 667"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              x1="-4.37114e-08"
              y1="514.5"
              x2="1216"
              y2="514.5"
              stroke="#D1D5DB"
              stroke-dasharray="4 4"
            />
            <line
              x1="1050.68"
              y1="-2.18557e-08"
              x2="1050.68"
              y2="667"
              stroke="#D1D5DB"
              stroke-dasharray="4 4"
            />
            <line
              x1="1218.18"
              y1="-2.18557e-08"
              x2="1218.18"
              y2="667"
              stroke="#D1D5DB"
              stroke-dasharray="4 4"
            />
            <line
              x1="0.5"
              y1="-2.18557e-08"
              x2="0.500029"
              y2="667"
              stroke="#D1D5DB"
              stroke-dasharray="4 4"
            />
            <line
              x1="168"
              y1="-2.18557e-08"
              x2="168"
              y2="667"
              stroke="#D1D5DB"
              stroke-dasharray="4 4"
            />
            <line
              x1="-4.37114e-08"
              y1="80.5"
              x2="1216"
              y2="80.4999"
              stroke="#D1D5DB"
              stroke-dasharray="4 4"
            />
            <rect
              x="1047.7"
              y="77.5234"
              width="5.9544"
              height="5.9544"
              fill="#F3F4F6"
            />
            <rect
              x="1047.7"
              y="77.5234"
              width="5.9544"
              height="5.9544"
              stroke="#D1D5DB"
            />
            <rect
              x="162.84"
              y="77.5234"
              width="5.9544"
              height="5.9544"
              fill="#F3F4F6"
            />
            <rect
              x="162.84"
              y="77.5234"
              width="5.9544"
              height="5.9544"
              stroke="#D1D5DB"
            />
          </svg>

          <svg
            className="hidden w-full"
            width="1219"
            height="667"
            viewBox="0 0 1219 667"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              x1="-4.37114e-08"
              y1="514.5"
              x2="1216"
              y2="514.5"
              stroke="#1F2937"
              stroke-dasharray="4 4"
            />
            <line
              x1="1050.68"
              y1="-2.18557e-08"
              x2="1050.68"
              y2="667"
              stroke="#1F2937"
              stroke-dasharray="4 4"
            />
            <line
              x1="1218.18"
              y1="-2.18557e-08"
              x2="1218.18"
              y2="667"
              stroke="#1F2937"
              stroke-dasharray="4 4"
            />
            <line
              x1="0.5"
              y1="-2.18557e-08"
              x2="0.500029"
              y2="667"
              stroke="#1F2937"
              stroke-dasharray="4 4"
            />
            <line
              x1="168"
              y1="-2.18557e-08"
              x2="168"
              y2="667"
              stroke="#1F2937"
              stroke-dasharray="4 4"
            />
            <line
              x1="-4.37114e-08"
              y1="80.5"
              x2="1216"
              y2="80.4999"
              stroke="#1F2937"
              stroke-dasharray="4 4"
            />
            <rect
              x="1047.7"
              y="77.5234"
              width="5.9544"
              height="5.9544"
              fill="#111827"
            />
            <rect
              x="1047.7"
              y="77.5234"
              width="5.9544"
              height="5.9544"
              stroke="#1F2937"
            />
            <rect
              x="162.84"
              y="77.5234"
              width="5.9544"
              height="5.9544"
              fill="#111827"
            />
            <rect
              x="162.84"
              y="77.5234"
              width="5.9544"
              height="5.9544"
              stroke="#1F2937"
            />
          </svg>
        </div>
      </section>
    </>
  );
}
