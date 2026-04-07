import {
  BagShopping2,
  Cart2,
  ChevronDown,
  ClockThree,
  Diamonds1,
  GamePad,
  Heart,
  LaptopPhone,
  MenuHamburger1,
  Muscles,
  Phone,
  SackDollar,
  Scoter,
  Search1,
  Table2,
  Telephone1,
  TruckDeliveryFast,
  User2,
  Xmark2x,
} from '@tailgrids/icons';
import { useState } from 'react';

export default function EcomNavbar7() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

  const categories = [
    { name: 'Smartphones', icon: Phone },
    { name: 'Electronics', icon: LaptopPhone },
    { name: 'Fashion', icon: BagShopping2 },
    { name: 'Jewelry & Accessories', icon: Diamonds1 },
    { name: 'Furniture & Decor', icon: Table2 },
    { name: 'Game Console', icon: GamePad },
    { name: 'Cars & MotorBike', icon: Scoter },
    { name: 'Sports & Outdoor', icon: Muscles },
  ];

  return (
    <section className="bg-background-50 relative min-h-screen">
      {/* Top Bar */}
      <div className="xl:bg-background-soft-100 xl: py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-text-50 bg-background-soft-100 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg focus:outline-none lg:hidden"
          >
            {!mobileMenuOpen ? (
              <MenuHamburger1 className="h-6 w-6" />
            ) : (
              <Xmark2x className="h-6 w-6" />
            )}
          </button>

          {/* Logo */}
          <div>
            <a
              href="javascript:void(0)"
              className="text-primary-500 text-2xl font-bold"
            >
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                alt=""
              />
            </a>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-6">
            {/* Search Bar - Desktop */}
            <div className="relative hidden xl:block">
              <input
                type="text"
                placeholder="Search products.."
                className="border-base-100 bg-input-background w-100 rounded-lg border px-4 py-2.5"
              />
              <span className="text-text-100 absolute inset-y-0 top-1/2 right-4 -translate-y-1/2">
                <Search1 className="h-5 w-5" />
              </span>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden gap-3 xl:flex">
              <button className="text-title-50 bg-background-50 border-base-200 hover:bg-background-soft-50 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium">
                <Heart className="h-5 w-5" />
                Wishlist
              </button>
              <button className="text-title-50 bg-background-50 border-base-200 hover:bg-background-soft-50 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium">
                <Cart2 className="h-5 w-5" />
                Cart
              </button>
              <button className="text-title-50 bg-background-50 border-base-200 hover:bg-background-soft-50 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium">
                <User2 className="h-5 w-5" />
                Sign In
              </button>
            </div>

            {/* Mobile Action Icons */}
            <div className="flex items-center gap-2.5 xl:hidden">
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-text-100 cursor-pointer"
              >
                <Heart className="h-5 w-5" />
              </a>
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-text-100 cursor-pointer"
              >
                <Cart2 className="h-6 w-6" />
              </a>
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-text-100 cursor-pointer"
              >
                <User2 className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="bg-background-soft-100 block px-4 py-3.5 sm:px-6 lg:px-8 xl:hidden">
        <div className="relative">
          <input
            type="text"
            placeholder="Search products.."
            className="border-base-100 w-full rounded-lg border px-4 py-2.5"
          />
          <span className="text-text-100 absolute inset-y-0 top-1/2 right-4 -translate-y-1/2">
            <Search1 className="h-5 w-5" />
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="bg-background-50 py-4 lg:py-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* All Categories Dropdown */}
            <div className="relative hidden lg:inline-block">
              <button
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                className="text-title-50 bg-background-50 border-base-100 hover:bg-background-soft-50 flex h-10 cursor-pointer items-center gap-2 rounded-md border px-4 py-2 font-medium"
              >
                {!categoriesOpen ? (
                  <MenuHamburger1 className="h-5 w-5" />
                ) : (
                  <Xmark2x className="h-5 w-5" />
                )}
                All Categories
              </button>

              {categoriesOpen && (
                <div className="bg-background-50 absolute left-0 z-50 mt-1 w-60 rounded-lg p-1.5 shadow-md">
                  {categories.map((category, index) => {
                    const Icon = category.icon;
                    return (
                      <a
                        key={index}
                        href="javascript:void(0)"
                        className="text-title-50 hover:bg-background-soft-100 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
                      >
                        <Icon className="h-5 w-5" />
                        {category.name}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden items-center lg:flex">
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 inline-flex gap-2 px-4 py-7 text-base font-medium transition-colors"
              >
                Deals of the Week
                <span className="bg-badge-error-background inline-flex items-center rounded-full px-2 py-0.5 text-xs leading-4 font-medium text-red-500">
                  Hot
                </span>
              </a>
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 px-3.5 py-7 text-base font-medium transition-colors"
              >
                New Arrivals
              </a>
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 px-3.5 py-7 text-base font-medium transition-colors"
              >
                Men
              </a>
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 px-3.5 py-7 text-base font-medium transition-colors"
              >
                Women
              </a>
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 px-3.5 py-7 text-base font-medium transition-colors"
              >
                Kids
              </a>
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 inline-flex gap-2 px-4 py-7 text-base font-medium transition-colors"
              >
                Sale
                <span className="text-primary-500 bg-primary-50 inline-flex items-center rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                  20% OFF
                </span>
              </a>
            </div>

            {/* Contact Info */}
            <div className="hidden items-center space-x-5 xl:flex">
              <p className="flex gap-2 text-base font-medium">
                <Telephone1 className="text-text-100 h-5 w-5" />
                <a href="tel:+16283998030" className="text-text-100">
                  Call Us (+16283998030)
                </a>
                <a
                  href="javascript:void(0)"
                  className="text-title-50 text-base font-medium"
                >
                  Or Live Chat
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="px-2 lg:hidden">
            <div className="bg-background-50 space-y-1 rounded-xl px-2 pt-2 pb-3">
              {/* Shop Dropdown */}
              <div>
                <button
                  onClick={() => setShopOpen(!shopOpen)}
                  className="text-title-50 hover:bg-background-soft-100 inline-flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium"
                >
                  Shop
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${shopOpen ? 'text-primary-500 rotate-180' : ''}`}
                  />
                </button>
                {shopOpen && (
                  <div className="bg-background-50 z-50 mt-1 w-full p-1.5">
                    {categories.map((category, index) => {
                      const Icon = category.icon;
                      return (
                        <a
                          key={index}
                          href="javascript:void(0)"
                          className="text-title-50 hover:bg-background-soft-100 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
                        >
                          <Icon className="h-5 w-5" />
                          {category.name}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>

              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 flex w-full gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium"
              >
                Deals of the Week
                <span className="bg-badge-error-background inline-flex items-center rounded-full px-2 py-0.5 text-xs leading-4 font-medium text-red-500">
                  Hot
                </span>
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium"
              >
                New Arrivals
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium"
              >
                Men
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium"
              >
                Women
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium"
              >
                Kids
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 flex w-full gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium"
              >
                Sale
                <span className="text-primary-500 bg-primary-50 inline-flex items-center rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                  20% OFF
                </span>
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium"
              >
                <div className="relative">
                  <span className="bg-primary-500 text-white-100 absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold">
                    3
                  </span>
                  <Heart className="h-5 w-5" />
                </div>
                Wishlist
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm font-medium"
              >
                <User2 className="h-5 w-5" />
                Sign in / Register
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Info Bar */}
      <div className="bg-background-soft-100 border-base-100 hidden border-t py-3.5 lg:block">
        <div className="mx-auto flex max-w-7xl justify-between px-4 sm:px-6 lg:px-8">
          <p className="text-text-50 flex items-center gap-1 text-sm">
            <TruckDeliveryFast className="h-4 w-4 shrink-0" />
            Free shipping and returns
          </p>
          <p className="text-text-50 flex items-center gap-1 text-sm">
            <SackDollar className="h-4 w-4 shrink-0" />
            Money Back guarantee
          </p>
          <p className="text-text-50 flex items-center gap-1 text-sm">
            <ClockThree className="h-4 w-4 shrink-0" />
            24/7 online Support
          </p>
        </div>
      </div>
    </section>
  );
}
