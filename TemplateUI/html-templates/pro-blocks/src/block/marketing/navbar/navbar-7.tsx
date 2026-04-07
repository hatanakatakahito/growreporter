import { useState } from 'react';

export default function Navbar7() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <nav className="bg-background-50 py-6 shadow-sm lg:py-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between">
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
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="bg-background-soft-100 text-text-50 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg focus:outline-none lg:hidden"
          >
            {!mobileMenuOpen && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M20 5C20.5523 5 21 5.44772 21 6C21 6.55228 20.5523 7 20 7L4 7C3.44772 7 3 6.55229 3 6C3 5.44772 3.44772 5 4 5H20ZM20 17C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19L4 19C3.44772 19 3 18.5523 3 18C3 17.4477 3.44772 17 4 17L20 17ZM21 12C21 11.4477 20.5523 11 20 11L4 11C3.44772 11 3 11.4477 3 12C3 12.5523 3.44772 13 4 13L20 13C20.5523 13 21 12.5523 21 12Z"
                  fill="currentColor"
                />
              </svg>
            )}
            {mobileMenuOpen && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M16.6163 5.97449L16.5411 6.04285L11.999 10.5849L7.45711 6.04299C7.06658 5.65247 6.43342 5.65247 6.04289 6.04299C5.65237 6.43351 5.65237 7.06668 6.04289 7.4572L10.5848 11.9991L6.04289 16.541C5.65237 16.9316 5.65237 17.5647 6.04289 17.9553C6.43342 18.3458 7.06658 18.3458 7.45711 17.9553L11.999 13.4133L16.5411 17.9554L16.6163 18.0238C17.0091 18.3443 17.5891 18.3216 17.9553 17.9554C18.3215 17.5892 18.3442 17.0092 18.0237 16.6164L17.9553 16.5412L13.4132 11.9991L17.9553 7.45706L18.0237 7.38179C18.3442 6.98902 18.3215 6.40904 17.9553 6.04285C17.5891 5.67666 17.0091 5.65392 16.6163 5.97449Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>

          {/* Desktop Navigation */}
          <div className="hidden items-center justify-center lg:flex">
            <a
              href="javascript:void(0)"
              className="hover:text-primary-500 text-text-50 px-3.5 py-8 text-sm font-medium transition-colors"
            >
              Home
            </a>
            <a
              href="javascript:void(0)"
              className="hover:text-primary-500 text-text-50 px-3.5 py-8 text-sm font-medium transition-colors"
            >
              Features
            </a>
            <a
              href="javascript:void(0)"
              className="hover:text-primary-500 text-text-50 px-3.5 py-8 text-sm font-medium transition-colors"
            >
              Pricing
            </a>
            <a
              href="javascript:void(0)"
              className="hover:text-primary-500 text-text-50 px-3.5 py-8 text-sm font-medium transition-colors"
            >
              Pricing
            </a>
            <a
              href="javascript:void(0)"
              className="hover:text-primary-500 text-text-50 px-3.5 py-8 text-sm font-medium transition-colors"
            >
              Contact
            </a>
          </div>

          {/* Desktop Right side items - Profile Dropdown */}
          <div className="hidden items-center space-x-3 lg:flex">
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="text-text-50 flex cursor-pointer items-center border-none bg-transparent px-3.5 text-sm font-medium"
              >
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/application/paywall/paywall-1.jpg"
                  className="mr-2 inline-block size-8 rounded-full"
                  alt="Kathryn Murphy"
                />
                Kathryn Murphy
                <svg
                  className={`ml-3 h-3 w-3 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="7"
                  viewBox="0 0 12 7"
                  fill="none"
                >
                  <path
                    d="M0.75 0.75L5.95833 5.95833L11.1667 0.75"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Profile Menu */}
              {profileOpen && (
                <div className="border-base-100 bg-background-50 absolute right-0 z-10 mt-6 w-64 overflow-hidden rounded-xl border shadow-lg">
                  <div className="p-1.5">
                    <div className="space-y-1">
                      <a
                        href="javascript:void(0)"
                        className="hover:bg-background-soft-100 text-text-50 block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                      >
                        User Profile
                      </a>
                      <a
                        href="javascript:void(0)"
                        className="hover:bg-background-soft-100 text-text-50 flex justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                      >
                        <span>Keyboard Shortcuts</span>
                        <span className="text-text-100 text-xs">⌘K</span>
                      </a>
                      <a
                        href="javascript:void(0)"
                        className="hover:bg-background-soft-100 text-text-50 block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                      >
                        Support
                      </a>
                    </div>
                  </div>

                  <div className="border-base-100 border-t p-1.5">
                    <a
                      href="javascript:void(0)"
                      className="hover:bg-background-soft-100 text-text-50 block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                    >
                      Sign Out
                    </a>
                  </div>
                </div>
              )}
            </div>
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
              Features
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
        </div>
      )}
    </nav>
  );
}
