import { MenuHamburger1, Xmark2x } from '@tailgrids/icons';
import { useState } from 'react';

export default function Navbar2() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="relative">
      <div className="bg-primary-500 divide-white-100/70 flex flex-col items-center justify-center gap-1 divide-x-0 py-2.5 sm:flex-row sm:items-center sm:gap-0 sm:divide-x">
        <p className="text-white-80 text-sm font-medium sm:pe-3">
          Sunday – Thursday: 10 am – 6 pm
        </p>
        <p className="text-white-80 text-sm font-medium sm:ps-3">
          Friday: 2 pm – 10 pm
        </p>
      </div>

      <nav className="bg-background-50 py-4 lg:py-0">
        <div className="mx-auto max-w-7xl px-4 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between">
            {/* <!-- Desktop Navigation --> */}
            <div className="hidden items-center lg:flex">
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-text-50 px-3.5 py-7 text-base font-medium transition-colors"
              >
                Home
              </a>
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-text-50 px-3.5 py-7 text-base font-medium transition-colors"
              >
                Pricing
              </a>
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-text-50 px-3.5 py-7 text-base font-medium transition-colors"
              >
                Contact
              </a>
            </div>

            {/* <!-- Logo --> */}
            <div className="flex items-center">
              <a href="javascript:void(0);">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                  alt="logo"
                />
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
              <a
                href="tel:+45665445424"
                className="hover:text-primary-500 text-text-50 text-base font-medium transition-colors"
              >
                Emergency Call: +456-6544-5424
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
                Home
              </a>
              <a
                href="javascript:void(0)"
                className="hover:bg-background-soft-100 text-text-50 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
              >
                Pricing
              </a>
              <a
                href="javascript:void(0)"
                className="hover:bg-background-soft-100 text-text-50 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
              >
                Contact
              </a>
            </div>
            <div className="border-base-100 border-t px-2 pt-3">
              {/* <!-- Mobile Right side items --> */}
              <a
                href="tel:+45665445424"
                className="hover:bg-background-soft-100 text-text-50 block w-full rounded-lg px-3 py-3 text-left text-base font-medium"
              >
                Emergency Call: +456-6544-5424
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
