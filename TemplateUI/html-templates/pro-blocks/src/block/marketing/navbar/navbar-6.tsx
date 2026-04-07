import {
  Close,
  Dribbble,
  Facebook,
  Linkedin,
  MenuHamburger1,
  Twitter,
} from '@tailgrids/icons';
import { useState } from 'react';

export default function Navbar6() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-background-50 border-base-100 relative z-10 border-b py-4 lg:py-0">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between">
          {/* Desktop Navigation */}
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
              Contact
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

          {/* Desktop Right side items */}
          <div className="hidden items-center sm:flex">
            <a
              href="javascript:void(0);"
              target="_blank"
              className="hover:bg-background-soft-100 inline-flex size-10 items-center justify-center rounded-full bg-transparent"
              rel="noopener noreferrer"
            >
              <Facebook className="text-text-100 size-5" />
            </a>
            <a
              href="javascript:void(0);"
              target="_blank"
              className="hover:bg-background-soft-100 inline-flex size-10 items-center justify-center rounded-full bg-transparent"
              rel="noopener noreferrer"
            >
              <Twitter className="text-text-100 size-5" />
            </a>
            <a
              href="javascript:void(0);"
              target="_blank"
              className="hover:bg-background-soft-100 inline-flex size-10 items-center justify-center rounded-full bg-transparent"
              rel="noopener noreferrer"
            >
              <Linkedin className="text-text-100 size-5" />
            </a>
            <a
              href="javascript:void(0);"
              target="_blank"
              className="hover:bg-background-soft-100 inline-flex size-10 items-center justify-center rounded-full bg-transparent"
              rel="noopener noreferrer"
            >
              <Dribbble className="text-text-100 size-5" />
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
              Features
            </a>
            <a
              href="javascript:void(0);"
              className="hover:bg-background-soft-100 text-text-50 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
            >
              Pricing
            </a>
            <a
              href="javascript:void(0);"
              className="hover:bg-background-soft-100 text-text-50 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
            >
              Contact
            </a>
          </div>
          <div className="border-base-100 flex justify-center border-t px-2 pt-5 sm:hidden">
            <a
              href="javascript:void(0);"
              target="_blank"
              className="hover:bg-background-soft-100 inline-flex size-10 items-center justify-center rounded-full bg-transparent"
              rel="noopener noreferrer"
            >
              <Facebook className="text-text-100 size-5" />
            </a>
            <a
              href="javascript:void(0);"
              target="_blank"
              className="hover:bg-background-soft-100 inline-flex size-10 items-center justify-center rounded-full bg-transparent"
              rel="noopener noreferrer"
            >
              <Twitter className="text-text-100 size-5" />
            </a>
            <a
              href="javascript:void(0);"
              target="_blank"
              className="hover:bg-background-soft-100 inline-flex size-10 items-center justify-center rounded-full bg-transparent"
              rel="noopener noreferrer"
            >
              <Linkedin className="text-text-100 size-5" />
            </a>
            <a
              href="javascript:void(0);"
              target="_blank"
              className="hover:bg-background-soft-100 inline-flex size-10 items-center justify-center rounded-full bg-transparent"
              rel="noopener noreferrer"
            >
              <Dribbble className="text-text-100 size-5" />
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
