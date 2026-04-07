import {
  ArrowUpward,
  Globe2,
  Microphone1,
  Paperclip2,
  Sparkle,
  MenuHamburger1,
  Xmark2x,
} from '@tailgrids/icons';
import { useState } from 'react';

export default function AiHero1() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div className="relative min-h-screen p-4">
      {/* <!-- Header --> */}
      <header className="absolute top-8 right-0 left-0 z-10 w-full px-8 xl:px-0">
        <nav className="bg-background-50 mx-auto max-w-7xl rounded-2xl px-6 py-4 lg:pr-4 lg:pl-8">
          <div className="flex items-center justify-between">
            {/* <!-- Logo --> */}
            <div className="flex lg:flex-1">
              <a href="javascript:void(0)" className="flex items-center gap-2">
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
                className="text-title-50 hover:bg-background-soft-100 border-base-200 hover:text-primary-500 inline-flex items-center justify-center rounded-lg border px-5 py-3 text-base leading-6 font-medium transition-colors"
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
                  className="hover:bg-background-soft-100 text-text-50 hover:text-primary-500 block rounded-lg px-3 py-2 text-base font-medium"
                >
                  Features
                </a>
                <a
                  href="javascript:void(0)"
                  className="hover:bg-background-soft-100 text-text-50 hover:text-primary-500 block rounded-lg px-3 py-2 text-base font-medium"
                >
                  Pricing
                </a>
                <a
                  href="javascript:void(0)"
                  className="hover:bg-background-soft-100 text-text-50 hover:text-primary-500 block rounded-lg px-3 py-2 text-base font-medium"
                >
                  Product
                </a>
                <a
                  href="javascript:void(0)"
                  className="hover:bg-background-soft-100 text-text-50 hover:text-primary-500 block rounded-lg px-3 py-2 text-base font-medium"
                >
                  About
                </a>
              </div>
              <div className="border-base-50 flex flex-col gap-3 border-t pt-5">
                <a
                  href="javascript:void(0)"
                  className="border-base-200 text-text-50 hover:text-primary-500 hover:bg-background-soft-50 inline-flex w-full items-center justify-center rounded-lg border px-5 py-3 text-base font-medium transition-colors"
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
      <section className="bg-background-soft-100 relative isolate overflow-hidden rounded-xl">
        <div className="mx-auto max-w-7xl px-4 pt-44 pb-30 xl:px-0">
          <div className="mx-auto max-w-3xl px-10">
            {/* <!-- New Badge --> */}
            <div className="mb-6 flex justify-center">
              <div className="bg-background-50 text-text-50 ring-background-soft-400 inline-flex h-10 items-center gap-1.5 rounded-full p-2 pr-4 text-sm font-medium ring-1">
                <span className="text-text-50 ring-background-soft-400 inline-flex h-6 items-center justify-center gap-1 rounded-full p-1 pr-3 text-sm font-medium ring-1">
                  <Sparkle className="size-4" />
                  New
                </span>
                <span className="text-text-50">Develop smarter with AI.</span>
              </div>
            </div>

            {/* <!-- Main Heading --> */}
            <h1 className="text-title-50 mb-12 text-center text-4xl font-medium sm:text-5xl sm:leading-13">
              Build Smarter & Ship Faster with AI-Powered Tools for Developers
            </h1>
          </div>
          {/* <!-- Chat Interface --> */}
          <div className="mx-auto max-w-[797px]">
            <div className="bg-background-50 ring-background-soft-400 rounded-3xl p-3 shadow-[0_12px_32px_-2px_rgba(16,24,40,0.03)] ring-1">
              {/* <!-- Chat Input --> */}
              <div className="relative">
                <textarea
                  className="text-title-50 border-base-50 placeholder:text-text-200 block h-30 w-full resize-none rounded-2xl bg-transparent px-5 py-4.5 focus:ring-0 sm:text-lg sm:leading-6"
                  placeholder="Ask me anything..."
                ></textarea>

                {/* <!-- Bottom Controls --> */}
                <div className="flex items-center justify-between pt-3">
                  {/* <!-- Left Controls --> */}
                  <div className="flex items-center gap-2">
                    <button className="bg-background-soft-100 text-text-50 hover:bg-background-soft-200 inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors">
                      <Paperclip2 className="size-5" />
                      Attach
                    </button>
                    <button className="text-text-50 hover:bg-background-soft-200 inline-flex cursor-pointer items-center gap-2 rounded-full bg-transparent px-3 py-2 text-sm font-medium transition-colors">
                      <Globe2 className="size-5" />
                      Deep Research
                    </button>
                  </div>

                  {/* <!-- Right Controls --> */}
                  <div className="flex items-center gap-3">
                    <button className="hover:bg-background-soft-100 text-text-100 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors">
                      <Microphone1 className="size-5" />
                    </button>
                    <button className="hover:bg-foreground-soft-500 bg-foreground-soft-500 text-white-100 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors">
                      <ArrowUpward className="size-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* <!-- Quick Actions --> */}
            <div className="mt-8">
              <div className="flex flex-wrap justify-center gap-3">
                <button className="bg-background-50 text-text-50 hover:bg-background-soft-50 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors">
                  E-commerce Website
                </button>
                <button className="bg-background-50 text-text-50 hover:bg-background-soft-50 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors">
                  Create a financial app
                </button>
                <button className="bg-background-50 text-text-50 hover:bg-background-soft-50 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors">
                  CRM dashboard
                </button>
                <button className="bg-background-50 text-text-50 hover:bg-background-soft-50 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors">
                  SaaS landing page
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* <!-- Background decoration --> */}
        <div className="absolute inset-x-0 bottom-0 -z-10 overflow-hidden">
          <img
            src=" https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-1/shape.png"
            className="block w-full"
            alt=""
          />
          <img
            src=" https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-1/shape-dark.png"
            className="hidden w-full"
            alt=""
          />
        </div>
      </section>
    </div>
  );
}
