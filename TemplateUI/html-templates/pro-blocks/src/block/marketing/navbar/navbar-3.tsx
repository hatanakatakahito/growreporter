import { MenuHamburger1, Search1, Xmark2x } from '@tailgrids/icons';
import { useState } from 'react';
import { Input } from '@/components/core/input';

export default function Navbar3() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <nav className="bg-background-50 py-4 lg:py-0">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between">
          {/* <!-- Logo --> */}
          <div className="flex items-center">
            <a href="javascript:void(0);">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                alt=""
              />
            </a>
          </div>

          {/* <!-- Desktop Navigation --> */}
          <div className="hidden items-center justify-center lg:flex">
            <a
              href="javascript:void(0);"
              className="hover:text-primary-500 text-text-50 px-3.5 py-7 text-base font-medium transition-colors first:pl-0 last:pr-0"
            >
              Home
            </a>
            <a
              href="javascript:void(0);"
              className="hover:text-primary-500 text-text-50 px-3.5 py-7 text-base font-medium transition-colors first:pl-0 last:pr-0"
            >
              Features
            </a>
            <a
              href="javascript:void(0);"
              className="hover:text-primary-500 text-text-50 px-3.5 py-7 text-base font-medium transition-colors first:pl-0 last:pr-0"
            >
              Pricing
            </a>
            <a
              href="javascript:void(0);"
              className="hover:text-primary-500 text-text-50 px-3.5 py-7 text-base font-medium transition-colors first:pl-0 last:pr-0"
            >
              Blogs
            </a>
            <a
              href="javascript:void(0);"
              className="hover:text-primary-500 text-text-50 px-3.5 py-7 text-base font-medium transition-colors first:pl-0 last:pr-0"
            >
              Contact
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="block lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="bg-background-soft-100 text-text-50 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg focus:outline-none"
            >
              {mobileMenuOpen ? <Xmark2x /> : <MenuHamburger1 />}
            </button>
          </div>

          {/* <!-- Desktop Right side items --> */}
          <div className="hidden items-center space-x-5 lg:flex">
            <form action="javascript:void(0);">
              <div className="relative w-xs">
                <Input
                  type="text"
                  placeholder="Search here..."
                  className="border-base-100 bg-background-soft-100 text-text-100 placeholder:text-text-100 h-11 w-full rounded-lg border px-3 py-2 pl-9 text-sm focus:outline-none"
                />
                <span className="text-text-100 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                  <Search1 className="size-5" />
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="bg-background-50 mt-5 space-y-1 rounded-xl px-2 pt-2 pb-3">
            <a
              href="javascript:void(0);"
              className="hover:bg-background-soft-100 text-text-50 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
            >
              Home
            </a>
            <a
              href="javascript:void(0);"
              className="hover:bg-background-soft-100 text-text-50 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
            >
              Price
            </a>
            <a
              href="javascript:void(0);"
              className="hover:bg-background-soft-100 text-text-50 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
            >
              Contact
            </a>
          </div>
          <div className="border-base-100 border-t px-2 pt-5">
            {/* <!-- Mobile Right side items --> */}
            <form action="javascript:void(0);">
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="Search here..."
                  className="border-base-100 bg-background-soft-100 text-text-100 placeholder:text-text-100 h-11 w-full rounded-lg border px-3 py-2 pl-9 text-sm focus:outline-none"
                />
                <span className="text-text-100 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                  <Search1 className="size-5" />
                </span>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
