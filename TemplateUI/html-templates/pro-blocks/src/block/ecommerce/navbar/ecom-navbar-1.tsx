import {
  Cart2,
  ChevronDown,
  MenuHamburger1,
  Search1,
  User2,
  Xmark2x,
} from '@tailgrids/icons';
import { useState } from 'react';

// Navigation items object
const navItems = [
  { label: 'New Arrivals', href: '#' },
  { label: 'Collections', href: '#' },
  { label: 'Sale', href: '#' },
  { label: 'Contact', href: '#' },
];

// Shop dropdown items object
const shopItems = [
  { label: 'All Products', href: '#' },
  { label: 'Hoodies', href: '#' },
  { label: 'Pants & Shorts', href: '#' },
  { label: 'Jackets', href: '#' },
  { label: 'Shoes', href: '#' },
];

// Mobile shop dropdown items object (including T-Shirt)
const mobileShopItems = [{ label: 'T-Shirt', href: '#' }, ...shopItems];

const EcomNavbar1 = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleShopDropdown = () => {
    setShopOpen(!shopOpen);
  };

  return (
    <div className="bg-background-100 h-screen">
      <nav className="bg-background-50 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-0 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              className="text-text-50 bg-background-soft-100 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg focus:outline-none md:hidden"
              onClick={toggleMobileMenu}
            >
              {mobileMenuOpen ? (
                <Xmark2x className="h-6 w-6" />
              ) : (
                <MenuHamburger1 className="h-6 w-6" />
              )}
            </button>

            {/* Logo */}
            <div className="flex items-center">
              <a href="javascript:void(0)">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                  alt=""
                />
              </a>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden items-center md:flex">
              <div className="group relative px-3.5 py-7">
                <button className="group-hover:text-primary-500 text-title-50 inline-flex cursor-pointer items-center text-sm font-medium transition-all">
                  Shop
                  <ChevronDown className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:rotate-180" />
                </button>

                {/* Dropdown Menu */}
                <div className="bg-background-50 invisible absolute left-0 z-50 mt-5 w-57 rounded-xl px-1 opacity-0 shadow-md transition-all duration-200 group-hover:visible group-hover:opacity-100">
                  <div className="py-1">
                    {shopItems.map((item, index) => (
                      <a
                        key={index}
                        href={item.href}
                        className="hover:bg-background-soft-100 text-title-50 block rounded-lg px-3 py-2.5 text-sm"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {navItems.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className="hover:text-primary-500 text-title-50 px-3.5 py-7 text-sm font-medium transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* Desktop Right side items */}
            <div className="hidden items-center space-x-4 lg:flex">
              {/* Search Bar */}
              <div className="relative hidden sm:block">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="focus:ring-primary-500 border-base-200 h-11 w-60 rounded-lg border bg-transparent py-2.5 pr-10 pl-4 text-sm focus:border-transparent focus:ring-2 focus:outline-none"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                  <Search1 className="text-text-50 h-6 w-6" />
                </div>
              </div>

              {/* User Account */}
              <button className="text-text-50 hover:bg-background-soft-100 border-base-100 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border transition-all">
                <User2 className="h-6 w-6" />
              </button>

              {/* Shopping Cart */}
              <button className="text-text-50 hover:bg-background-soft-100 border-base-100 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border transition-all">
                <span className="relative">
                  <Cart2 className="h-6 w-6" />
                  <span className="text-white-100 bg-error-500 ring-background-50 absolute top-0 right-0 flex h-2.5 w-2.5 items-center justify-center rounded-full text-xs ring-2"></span>
                </span>
              </button>
            </div>

            {/* Mobile Right side items */}
            <div className="flex items-center space-x-4 sm:hidden">
              {/* Search Bar */}
              <button>
                <Search1 className="text-text-50 h-6 w-6" />
              </button>

              {/* User Account */}
              <button className="text-text-50 cursor-pointer">
                <User2 className="h-6 w-6" />
              </button>

              {/* Shopping Cart */}
              <button className="text-text-50">
                <span className="relative">
                  <Cart2 className="h-6 w-6" />
                  <span className="text-white-100 bg-badge-error-background0 absolute top-0 right-0 flex h-2.5 w-2.5 items-center justify-center rounded-full text-xs ring-2 ring-white"></span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="min-h-screen px-2 sm:hidden">
            <div className="bg-background-50 mt-5 space-y-1 rounded-xl px-2 pt-2 pb-3">
              {/* Mobile Shop Dropdown */}
              <div>
                <button
                  className={`text-title-50 hover:bg-background-soft-100 inline-flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-base font-medium ${
                    shopOpen ? 'text-primary-500' : ''
                  }`}
                  onClick={toggleShopDropdown}
                >
                  Shop
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      shopOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {shopOpen && (
                  <div className="mt-1 space-y-1 rounded-lg p-2">
                    {mobileShopItems.map((item, index) => (
                      <a
                        key={index}
                        href={item.href}
                        className="text-title-50 hover:bg-background-soft-100 block rounded-lg px-3 py-2.5 text-sm font-medium"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {navItems.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className="text-title-50 hover:bg-background-soft-100 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};

export default EcomNavbar1;
