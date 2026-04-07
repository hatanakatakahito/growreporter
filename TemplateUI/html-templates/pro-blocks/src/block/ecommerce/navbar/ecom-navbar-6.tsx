import {
  Cart2,
  ChevronDown,
  Fire,
  Globe2,
  Heart,
  Instagram,
  MenuHamburger1,
  Search1,
  Twitter,
  User2,
  Whatsapp,
  Xmark2x,
} from '@tailgrids/icons';
import { useEffect, useRef, useState } from 'react';

export default function EcomNavbar6() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState({
    code: 'USD',
    img: 'https://flagcdn.com/w20/us.png',
  });
  const [selectedLanguage, setSelectedLanguage] = useState('En');

  const currencyRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        currencyRef.current &&
        !currencyRef.current.contains(event.target as Node)
      ) {
        setCurrencyOpen(false);
      }
      if (
        languageRef.current &&
        !languageRef.current.contains(event.target as Node)
      ) {
        setLanguageOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currencies = [
    { code: 'USD', img: 'https://flagcdn.com/w20/us.png' },
    { code: 'EUR', img: 'https://flagcdn.com/w20/eu.png' },
    { code: 'GBP', img: 'https://flagcdn.com/w20/gb.png' },
    { code: 'BDT', img: 'https://flagcdn.com/w20/bd.png' },
  ];

  const languages = [
    { code: 'En' },
    { code: 'Bn' },
    { code: 'Cn' },
    { code: 'Dn' },
  ];

  const shopCategories = [
    {
      title: 'Men',
      description: 'Classic fits & modern layers',
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/navbars/navbar-02/product-1.jpg',
    },
    {
      title: 'Women',
      description: 'Trending now & forever staples',
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/navbars/navbar-02/product-2.jpg',
    },
    {
      title: 'Kids',
      description: 'Soft, durable, and playful looks',
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/navbars/navbar-02/product-1.jpg',
    },
    {
      title: 'Jewelry',
      description: 'Original Gold,Diamond collections',
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/navbars/navbar-02/product-2.jpg',
    },
    {
      title: 'Shoes',
      description: 'Shoes, boots, sandals, & sneakers',
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/navbars/navbar-02/product-1.jpg',
    },
    {
      title: 'Watches',
      description: 'Best Luxurious and premium watches',
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/navbars/navbar-02/product-2.jpg',
    },
  ];

  return (
    <header className="bg-background-50 min-h-screen">
      {/* Top Bar */}
      <div className="border-base-100 border-b py-5 lg:py-6">
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

          {/* Social Left */}
          <div className="hidden items-center gap-6 lg:flex">
            {/* Currency Dropdown */}
            <div className="relative mt-2" ref={currencyRef}>
              <button
                onClick={() => setCurrencyOpen(!currencyOpen)}
                className="text-title-50 inline-flex cursor-pointer items-center gap-2 text-sm font-medium"
              >
                <img
                  src={selectedCurrency.img}
                  className="h-5 w-5 rounded-full"
                  alt=""
                />
                <span>{selectedCurrency.code}</span>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${currencyOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {currencyOpen && (
                <ul className="bg-background-50 absolute z-10 mt-1 w-full rounded-xl p-1 shadow-lg">
                  {currencies.map((currency) => (
                    <li
                      key={currency.code}
                      onClick={() => {
                        setSelectedCurrency(currency);
                        setCurrencyOpen(false);
                      }}
                      className="hover:bg-background-soft-100 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
                    >
                      <img
                        src={currency.img}
                        className="h-5 w-5 rounded-full"
                        alt=""
                      />
                      <span className="text-title-50 text-sm">
                        {currency.code}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-5">
              <a
                href="http://"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-500 text-title-50 transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="http://"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-500 text-title-50 transition-colors"
              >
                <Whatsapp className="h-5 w-5" />
              </a>
              <a
                href="http://"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-500 text-title-50 transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

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

          {/* Right Side Icons */}
          <div className="flex items-center space-x-3">
            <button className="text-text-50 hover:text-text-100 cursor-pointer">
              <Search1 className="h-6 w-6" />
            </button>

            <a
              href="javascript:void(0)"
              className="text-text-50 hover:text-text-100 cursor-pointer"
            >
              <User2 className="h-6 w-6" />
            </a>

            <a
              href="javascript:void(0)"
              className="text-text-50 hover:text-text-100 relative cursor-pointer"
            >
              <Cart2 className="h-6 w-6" />
              <span className="bg-primary-500 text-white-100 absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold">
                3
              </span>
            </a>

            {/* Language Dropdown */}
            <div className="relative ml-2 hidden lg:block" ref={languageRef}>
              <button
                onClick={() => setLanguageOpen(!languageOpen)}
                className="text-title-50 flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-base font-medium"
              >
                <Globe2 className="text-title-50 h-5 w-5" />
                <span>{selectedLanguage}</span>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${languageOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {languageOpen && (
                <ul className="bg-background-50 absolute z-10 mt-1 w-full rounded-xl p-1 shadow-lg">
                  {languages.map((language) => (
                    <li
                      key={language.code}
                      onClick={() => {
                        setSelectedLanguage(language.code);
                        setLanguageOpen(false);
                      }}
                      className="hover:bg-background-soft-100 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
                    >
                      <span className="text-title-50 text-sm">
                        {language.code}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="bg-background-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="hidden items-center lg:flex lg:justify-center">
            {/* Desktop Navigation */}
            <div className="relative flex items-center">
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 inline-flex items-center gap-2 py-6 pr-3.5 text-base font-medium transition-colors"
              >
                <Fire className="h-5 w-5" />
                Hot Offer
              </a>

              {/* Shop Dropdown */}
              <div
                className="group px-4 py-6"
                onMouseEnter={() => setShopDropdownOpen(true)}
                onMouseLeave={() => setShopDropdownOpen(false)}
              >
                <a
                  href="javascript:void(0)"
                  className="group-hover:text-primary-500 text-title-50 inline-flex cursor-pointer items-center text-base font-medium transition-all"
                >
                  Shop
                  <ChevronDown className="ml-1 h-5 w-5 transition-transform duration-300 group-hover:rotate-180" />
                </a>

                {/* Mega Menu */}
                {shopDropdownOpen && (
                  <div className="bg-background-50 border-base-50 absolute right-0 left-0 z-50 mt-7 w-3xl rounded-xl border p-3">
                    <div className="divide-base-100 flex divide-x">
                      <div className="w-1/2 pr-9">
                        {shopCategories.slice(0, 3).map((category, index) => (
                          <a
                            key={index}
                            href="javascript:void(0)"
                            className="hover:bg-background-soft-100 flex rounded-lg bg-transparent p-3"
                          >
                            <div>
                              <img
                                src={category.image}
                                className="h-12 w-12 rounded-md"
                                alt=""
                              />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-text-50 font-medium">
                                {category.title}
                              </h3>
                              <p className="text-text-100 text-sm">
                                {category.description}
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                      <div className="w-1/2 pl-9">
                        {shopCategories.slice(3, 6).map((category, index) => (
                          <a
                            key={index}
                            href="javascript:void(0)"
                            className="hover:bg-background-soft-100 flex rounded-lg bg-transparent p-3"
                          >
                            <div>
                              <img
                                src={category.image}
                                className="h-12 w-12 rounded-md"
                                alt=""
                              />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-text-50 font-medium">
                                {category.title}
                              </h3>
                              <p className="text-text-100 text-sm">
                                {category.description}
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 px-3.5 py-6 text-base font-medium transition-colors"
              >
                New Arrivals
              </a>
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 px-3.5 py-6 text-base font-medium transition-colors"
              >
                Collections
              </a>
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 px-3.5 py-6 text-base font-medium transition-colors"
              >
                Bundle Deals
              </a>
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 inline-flex gap-2 px-3.5 py-6 text-base font-medium transition-colors"
              >
                Sale
                <span className="text-primary-500 bg-primary-50 inline-flex items-center rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                  20% OFF
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="px-2 lg:hidden">
            <div className="bg-background-50 space-y-1 px-2 py-4">
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
    </header>
  );
}
