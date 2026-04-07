import { ArrowRight, MenuHamburger1, Play, Xmark2x } from '@tailgrids/icons';
import { useState } from 'react';

export default function AiHero5() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  return (
    <>
      <header className="bg-background-50 sticky top-0 z-50 w-full">
        <nav className="mx-auto max-w-7xl rounded-2xl px-6 py-4 lg:px-8">
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

      <section className="bg-background-soft-100 relative isolate overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-20 sm:pt-30 sm:pb-30 xl:px-0 xl:pb-50">
          <div className="mx-auto max-w-4xl sm:px-5">
            {/* <!-- New Badge --> */}
            <div className="mb-6 flex justify-center">
              <div className="bg-background-50 text-text-50 ring-background-soft-400 inline-flex h-10 items-center justify-center gap-1.5 rounded-full py-2 pr-2 pl-4 text-sm font-medium ring-1">
                <span className="text-text-50">
                  Elevate your coding experience with intelligent
                </span>
                <span className="text-text-50 ring-background-soft-400 inline-flex h-6 items-center justify-center gap-1 rounded-full p-1 px-2 text-sm font-medium ring-1">
                  Discover
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </div>
            {/* <!-- Main Heading --> */}
            <h1 className="text-title-50 mb-4 text-center text-4xl font-medium sm:text-6xl sm:leading-16">
              Transform your video editing process with AI innovation.
            </h1>
            <p className="text-text-100 mx-auto mb-12 max-w-lg text-center text-lg leading-7">
              Step into the future of video editing: AI-driven tools for
              unmatched creativity and accuracy.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="javascript:void(0)"
                className="bg-primary-500 hover:bg-primary-600 text-white-100 inline-flex items-center justify-center rounded-lg px-5 py-3 text-base font-medium transition-colors"
              >
                Get started Free
              </a>
              <button
                onClick={() => setVideoOpen(true)}
                className="text-title-50 bg-background-50 hover:bg-background-soft-100 border-base-200 hover:text-title-50 inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border px-5 py-3 text-base leading-6 font-medium transition-colors"
              >
                <Play />
                Watch Demo
              </button>
            </div>
          </div>

          <div className="relative mt-6 sm:mt-16">
            <div className="relative z-50 mx-auto max-w-[770px]">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-5/main-image.jpg"
                className="w-full rounded-3xl"
                alt="main-image"
              />

              <button
                onClick={() => setVideoOpen(true)}
                className="bg-background-50/15 absolute top-1/2 left-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full backdrop-blur-sm transition-transform hover:scale-110"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="52"
                  height="53"
                  viewBox="0 0 52 53"
                  fill="none"
                >
                  <path
                    d="M13.8535 13.3966L13.8535 39.6065C13.8535 42.1391 16.6293 43.692 18.7876 42.3668L40.1299 29.2618C42.1889 27.9976 42.1889 25.0055 40.1299 23.7412L18.7876 10.6363C16.6293 9.31106 13.8535 10.864 13.8535 13.3966Z"
                    fill="white"
                    stroke="white"
                    strokeWidth="3.23913"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="absolute -top-16 left-0 z-10 hidden rounded-2xl xl:block">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-5/image-1.jpg"
                className="rounded-2xl"
                alt="image-1"
              />
            </div>
            <div className="absolute bottom-10 left-20 hidden rounded-2xl xl:block">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-5/image-2.jpg"
                className="rounded-2xl"
                alt="image-2"
              />
            </div>
            <div className="absolute -top-28 right-0 z-10 hidden rounded-2xl xl:block">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-5/image-4.jpg"
                className="rounded-2xl"
                alt="image-4"
              />
            </div>
          </div>
        </div>
      </section>
      {/* <!-- Video Modal --> */}
      {/* <!-- Video Modal --> */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-999 flex h-screen w-full items-center justify-center bg-black/80 px-4 py-5"
          onClick={() => setVideoOpen(false)}
        >
          <button
            onClick={() => setVideoOpen(false)}
            className="text-white-100 hover:text-white-80 absolute top-0 right-0 z-50 m-4 flex items-center justify-center rounded-md p-2"
          >
            <Xmark2x className="h-8 w-8" />
          </button>
          <div
            className="bg-background-50 relative w-full max-w-[800px] rounded-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video w-full overflow-hidden rounded-xl">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/LXb3EKWsInQ?si=gJKQ1F8i91Z8YdD0"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
