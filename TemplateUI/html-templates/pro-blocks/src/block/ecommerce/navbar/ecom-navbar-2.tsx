import {
  Cart2,
  ChevronDown,
  Heart,
  MenuHamburger1,
  Search1,
  User2,
  Xmark2x,
} from '@tailgrids/icons';
import React, { useEffect, useRef, useState } from 'react';

// Interface for menu category
interface MenuCategory {
  title: string;
  items: MenuItem[];
}

// Interface for menu item
interface MenuItem {
  label: string;
  href: string;
}

// Interface for featured item
interface FeaturedItem {
  label: string;
  href: string;
  imageSrc: string;
  alt: string;
}

// Interface for currency
interface Currency {
  code: string;
  img: string;
}

// Interface for component props
interface NavbarTwoProps {
  menuCategories?: MenuCategory[];
  featuredItems?: FeaturedItem[];
  currencies?: Currency[];
  cartCount?: number;
  onSearch?: () => void;
  onUserClick?: () => void;
  onWishlistClick?: () => void;
  onCartClick?: () => void;
  onCurrencyChange?: (code: string) => void;
}

// Default data
const defaultMenuCategories: MenuCategory[] = [
  {
    title: 'Men',
    items: [
      { label: 'T-Shirts', href: '#' },
      { label: 'Hoodies', href: '#' },
      { label: 'Pants & Shorts', href: '#' },
      { label: 'Jackets', href: '#' },
      { label: 'Shoes', href: '#' },
    ],
  },
  {
    title: 'Women',
    items: [
      { label: 'Dresses', href: '#' },
      { label: 'Tops & Blouses', href: '#' },
      { label: 'Skirts & Pants', href: '#' },
      { label: 'Outerwear', href: '#' },
      { label: 'Heels & Flats', href: '#' },
    ],
  },
  {
    title: 'Accessories',
    items: [
      { label: 'Bags', href: '#' },
      { label: 'Jewelry', href: '#' },
      { label: 'Watches', href: '#' },
      { label: 'Sunglasses', href: '#' },
      { label: 'Hats', href: '#' },
    ],
  },
];

const defaultFeaturedItems: FeaturedItem[] = [
  {
    label: 'New Arrivals',
    href: '#',
    imageSrc:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/navbars/navbar-02/product-1.jpg',
    alt: 'New Arrivals',
  },
  {
    label: 'Best Seller',
    href: '#',
    imageSrc:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/navbars/navbar-02/product-2.jpg',
    alt: 'Best Seller',
  },
];

const defaultCurrencies: Currency[] = [
  {
    code: 'USD',
    img: 'https://flagcdn.com/w20/us.png',
  },
  {
    code: 'EUR',
    img: 'https://flagcdn.com/w20/eu.png',
  },
  {
    code: 'GBP',
    img: 'https://flagcdn.com/w20/gb.png',
  },
];

const EcomNavbar2: React.FC<NavbarTwoProps> = ({
  menuCategories = defaultMenuCategories,
  featuredItems = defaultFeaturedItems,
  currencies = defaultCurrencies,
  cartCount = 3,
  onSearch = () => {},
  onUserClick = () => {},
  onWishlistClick = () => {},
  onCartClick = () => {},
  onCurrencyChange = () => {},
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState<boolean>(false);
  const [currencyOpen, setCurrencyOpen] = useState<boolean>(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    currencies[0],
  );
  const [mobileShopOpen, setMobileShopOpen] = useState<boolean>(false);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const mobileCurrencyDropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside for currency dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        currencyDropdownRef.current &&
        !currencyDropdownRef.current.contains(event.target as Node)
      ) {
        setCurrencyOpen(false);
      }
      if (
        mobileCurrencyDropdownRef.current &&
        !mobileCurrencyDropdownRef.current.contains(event.target as Node)
      ) {
        setCurrencyOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCurrencySelect = (currency: Currency) => {
    setSelectedCurrency(currency);
    setCurrencyOpen(false);
    onCurrencyChange(currency.code);
  };

  return (
    <section className="bg-background-50 relative min-h-screen">
      {/* Top Banner */}
      <div className="bg-primary-500 flex flex-col items-center justify-center gap-1 divide-x-0 divide-white/70 py-3 sm:flex-row sm:items-center sm:gap-0 sm:divide-x">
        <p className="text-white-100/80 text-sm font-medium sm:pe-3">
          Sign Up & Get 10% Off
        </p>
        <p className="text-white-100/80 text-sm font-medium sm:ps-3">
          Free Shipping on Orders $50+
        </p>
      </div>

      {/* Navbar */}
      <nav className="bg-background-50 py-4 lg:py-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-text-50 bg-background-soft-100 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg focus:outline-none lg:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <Xmark2x /> : <MenuHamburger1 />}
            </button>

            {/* Desktop Navigation */}
            <div className="hidden items-center lg:flex">
              {/* Shop Dropdown */}
              <div
                className="group py-7 pr-3.5"
                onMouseEnter={() => setShopDropdownOpen(true)}
                onMouseLeave={() => setShopDropdownOpen(false)}
              >
                <a
                  href="javascript:void(0)"
                  className="group-hover:text-primary-500 text-title-50 inline-flex cursor-pointer items-center text-base font-medium transition-all"
                >
                  Shop
                  <ChevronDown
                    className={`ml-1 h-4 w-4 transition-transform duration-200 ${
                      shopDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </a>
                {/* Mega Menu */}
                <div
                  className={`bg-background-50 border-base-50 absolute right-0 left-0 z-50 mt-7 w-full border-t py-7 shadow-sm transition-all duration-300 ${
                    shopDropdownOpen
                      ? 'visible opacity-100'
                      : 'invisible opacity-0'
                  }`}
                >
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="divide-base-50 flex flex-col gap-7 divide-y xl:flex-row xl:divide-x xl:divide-y-0">
                      <div className="divide-base-50 flex divide-x pb-7 xl:w-1/2">
                        {menuCategories.map((category, index) => (
                          <div
                            key={index}
                            className="w-1/3 pr-7 pl-7 first:pl-0"
                          >
                            <h3 className="text-title-50 mb-3 text-xl font-medium">
                              {category.title}
                            </h3>
                            <div className="space-y-3">
                              {category.items.map((item, idx) => (
                                <a
                                  key={idx}
                                  href={item.href}
                                  className="hover:text-title-50 text-text-100 block text-base transition-colors"
                                >
                                  {item.label}
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="divide-base-50 flex divide-x xl:w-1/2">
                        {featuredItems.map((item, index) => (
                          <div
                            key={index}
                            className="relative w-1/2 pr-7 last:pr-0"
                          >
                            <img
                              src={item.imageSrc}
                              className="h-full w-full rounded-lg"
                              alt={item.alt}
                              width={256}
                              height={238}
                              loading="lazy"
                            />
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                              <a
                                href={item.href}
                                className="text-title-50 bg-background-50 hover:bg-background-soft-100 border-base-200 rounded-lg border px-3.5 py-2.5 text-sm font-medium"
                              >
                                {item.label}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Links */}
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
                Collections
              </a>
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 px-3.5 py-7 text-base font-medium transition-colors"
              >
                Sale
              </a>
            </div>

            {/* Logo */}
            <div className="flex items-center">
              <a href="javascript:void(0)" className="h-7 w-28 lg:w-full">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                  alt=""
                />
              </a>
            </div>

            {/* Desktop Right Side */}
            <div className="hidden items-center space-x-5 lg:flex">
              {/* Currency Dropdown */}
              <div className="relative" ref={currencyDropdownRef}>
                <button
                  onClick={() => setCurrencyOpen(!currencyOpen)}
                  className="text-title-50 inline-flex cursor-pointer items-center gap-2 text-base font-medium"
                  aria-label="Select currency"
                >
                  <img
                    src={selectedCurrency.img}
                    className="h-5 w-5 rounded-full"
                    alt={`${selectedCurrency.code} flag`}
                  />
                  <span>{selectedCurrency.code}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      currencyOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <ul
                  className={`bg-background-50 absolute z-10 mt-1 w-full rounded-xl p-1 shadow-lg transition-all duration-200 ${
                    currencyOpen ? 'visible opacity-100' : 'invisible opacity-0'
                  }`}
                >
                  {currencies.map((currency: Currency) => (
                    <li
                      key={currency.code}
                      onClick={() => handleCurrencySelect(currency)}
                      className="hover:bg-background-soft-100 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
                    >
                      <img
                        src={currency.img}
                        className="h-5 w-5 rounded-full"
                        alt={`${currency.code} flag`}
                      />
                      <span className="text-sm">{currency.code}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right Icons */}
              <div className="flex space-x-3">
                <button
                  onClick={onSearch}
                  className="text-text-50 hover:text-text-100 cursor-pointer"
                  aria-label="Search"
                >
                  <Search1 />
                </button>
                <a
                  href="javascript:void(0)"
                  onClick={onUserClick}
                  className="text-text-50 hover:text-text-100 cursor-pointer"
                  aria-label="Account"
                >
                  <User2 />
                </a>
                <a
                  href="javascript:void(0)"
                  onClick={onWishlistClick}
                  className="text-text-50 hover:text-text-100 cursor-pointer"
                  aria-label="Wishlist"
                >
                  <Heart />
                </a>
                <a
                  href="javascript:void(0)"
                  onClick={onCartClick}
                  className="text-text-50 hover:text-text-100 relative cursor-pointer"
                  aria-label={`Cart with ${cartCount} items`}
                >
                  <Cart2 />
                  <span className="bg-primary-500 text-white-100 absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold">
                    {cartCount}
                  </span>
                </a>
              </div>
            </div>

            {/* Mobile Right Side */}
            <div className="flex items-center gap-2.5 lg:hidden">
              <button
                onClick={onSearch}
                className="text-text-50 hover:text-text-100 cursor-pointer"
                aria-label="Search"
              >
                <Search1 />
              </button>
              <a
                href="javascript:void(0)"
                onClick={onUserClick}
                className="text-text-50 hover:text-text-100 cursor-pointer"
                aria-label="Account"
              >
                <User2 />
              </a>
              <a
                href="javascript:void(0)"
                onClick={onCartClick}
                className="text-text-50 hover:text-text-100 relative cursor-pointer"
                aria-label={`Cart with ${cartCount} items`}
              >
                <Cart2 />
                <span className="bg-primary-500 text-white-100 absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold">
                  {cartCount}
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="px-2 lg:hidden">
            <div className="bg-background-50 mt-5 space-y-1 rounded-xl px-2 pt-2 pb-3">
              {/* Mobile Shop Dropdown */}
              <div>
                <button
                  onClick={() => setMobileShopOpen(!mobileShopOpen)}
                  className={`text-title-50 hover:bg-background-soft-100 inline-flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-base font-medium ${
                    mobileShopOpen ? 'text-primary-500' : ''
                  }`}
                  aria-label={
                    mobileShopOpen ? 'Close shop menu' : 'Open shop menu'
                  }
                >
                  Shop
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      mobileShopOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {mobileShopOpen && (
                  <div className="mt-1 p-2">
                    <div className="border-base-100 space-y-6 border-b pb-5">
                      {menuCategories.map((category, index) => (
                        <div key={index}>
                          <h3 className="text-title-50 mb-3 text-xl font-medium">
                            {category.title}
                          </h3>
                          <div className="space-y-3">
                            {category.items.map((item, idx) => (
                              <a
                                key={idx}
                                href={item.href}
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                {item.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                      {featuredItems.map((item, index) => (
                        <div key={index} className="relative">
                          <img
                            src={item.imageSrc}
                            className="w-full rounded-lg"
                            alt={item.alt}
                            loading="lazy"
                          />
                          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                            <a
                              href={item.href}
                              className="text-title-50 bg-background-50 hover:bg-background-soft-100 border-base-200 rounded-lg border px-3.5 py-2.5 text-sm font-medium"
                            >
                              {item.label}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
              >
                New Arrivals
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
              >
                Tutorials / Docs
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
              >
                Collections
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
              >
                Sale
              </a>
              <a
                href="javascript:void(0)"
                onClick={onWishlistClick}
                className="text-title-50 hover:bg-background-soft-100 flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-base font-medium"
                aria-label="Wishlist"
              >
                <Heart />
                Wishlist
              </a>
              <a
                href="javascript:void(0)"
                onClick={onUserClick}
                className="text-title-50 hover:bg-background-soft-100 flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-base font-medium"
                aria-label="Account"
              >
                <User2 />
                Account
              </a>
              <div className="relative" ref={mobileCurrencyDropdownRef}>
                <button
                  onClick={() => setCurrencyOpen(!currencyOpen)}
                  className="text-title-50 hover:bg-background-soft-100 flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-left text-base font-medium"
                  aria-label="Select currency"
                >
                  <img
                    src={selectedCurrency.img}
                    className="h-5 w-5 rounded-full"
                    alt={`${selectedCurrency.code} flag`}
                  />
                  <span>{selectedCurrency.code}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      currencyOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <ul
                  className={`bg-background-50 absolute z-10 mt-1 w-full rounded-xl p-1 shadow-lg transition-all duration-200 ${
                    currencyOpen ? 'visible opacity-100' : 'invisible opacity-0'
                  }`}
                >
                  {currencies.map((currency: Currency) => (
                    <li
                      key={currency.code}
                      onClick={() => handleCurrencySelect(currency)}
                      className="hover:bg-background-soft-100 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
                    >
                      <img
                        src={currency.img}
                        className="h-5 w-5 rounded-full"
                        alt={`${currency.code} flag`}
                      />
                      <span className="text-sm">{currency.code}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </nav>
    </section>
  );
};

export default EcomNavbar2;
