import { Close, MenuHamburger1 } from '@tailgrids/icons';
import { useState } from 'react';

export default function Navbar5() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-background-50 py-4 lg:py-0">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between">
          {/* Desktop Navigation */}
          <div className="hidden items-center justify-center lg:flex">
            <a
              href="javascript:void(0)"
              className="hover:text-primary-500 text-text-50 px-3.5 py-7 text-base font-medium transition-colors first:pl-0 last:pr-0"
            >
              For work
            </a>
            <a
              href="javascript:void(0)"
              className="hover:text-primary-500 text-text-50 px-3.5 py-7 text-base font-medium transition-colors first:pl-0 last:pr-0"
            >
              Pricing
              <span className="ml-1.5 inline-block rounded-full bg-green-50 px-2 py-0.5 text-xs leading-4 font-medium text-green-700">
                New
              </span>
            </a>
            <a
              href="javascript:void(0)"
              className="hover:text-primary-500 text-text-50 px-3.5 py-7 text-base font-medium transition-colors first:pl-0 last:pr-0"
            >
              Get Support
            </a>
          </div>

          {/* Logo */}
          <div className="flex items-center">
            <a href="javascript:void(0)">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                alt=""
              />
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="block lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="bg-background-soft-100 text-text-50 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg focus:outline-none"
            >
              {!mobileMenuOpen && <MenuHamburger1 className="size-6" />}
              {mobileMenuOpen && <Close className="size-6" />}
            </button>
          </div>

          {/* Desktop Right side items */}
          <div className="hidden items-center space-x-3 lg:flex">
            <a
              href="javascript:void(0)"
              className="hover:bg-background-soft-100 text-text-50 inline-flex cursor-pointer items-center justify-center rounded-lg bg-transparent px-5 py-3 text-base leading-5 font-medium transition focus:ring-3"
            >
              Sign in
            </a>
            <a
              href="javascript:void(0)"
              className="focus:ring-primary-500/20 bg-primary-500 hover:bg-primary-600 text-white-100 inline-flex cursor-pointer items-center justify-center rounded-lg px-5 py-3 text-base leading-5 font-medium transition focus:ring-3"
            >
              Sign up
            </a>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="bg-background-50 mt-5 space-y-1 rounded-xl px-2 pt-2 pb-3">
            <a
              href="javascript:void(0)"
              className="hover:bg-background-soft-100 text-text-50 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
            >
              For work
            </a>
            <a
              href="javascript:void(0)"
              className="hover:bg-background-soft-100 text-text-50 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
            >
              Price
              <span className="bg-badge-success-background text-badge-success-text ml-1.5 inline-block rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                New
              </span>
            </a>
            <a
              href="javascript:void(0)"
              className="hover:bg-background-soft-100 text-text-50 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
            >
              Get Support
            </a>
          </div>
          <div className="border-base-100 flex flex-col gap-3 border-t px-2 pt-5">
            {/* Mobile Right side items */}
            <a
              href="javascript:void(0)"
              className="border-base-100 bg-background-50 text-text-50 hover:bg-background-soft-100 inline-flex cursor-pointer items-center justify-center rounded-lg border px-5 py-3 text-base leading-5 font-medium transition focus:ring-3"
            >
              Sign in
            </a>
            <a
              href="javascript:void(0)"
              className="focus:ring-primary-500/20 bg-primary-500 hover:bg-primary-600 inline-flex cursor-pointer items-center justify-center rounded-lg px-5 py-3 text-base leading-5 font-medium text-white transition focus:ring-3"
            >
              Sign up
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
