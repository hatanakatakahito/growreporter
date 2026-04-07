import {
  Cart2,
  ChevronDown,
  Globe2,
  Heart,
  MenuHamburger1,
  Search1,
  User2,
  Xmark2x,
} from '@tailgrids/icons';
import { useEffect, useRef, useState } from 'react';

export default function EcomNavbar5() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedCurrency, setSelectedCurrency] = useState({
    code: 'USD',
    img: 'https://flagcdn.com/w20/us.png',
  });

  const languages = [
    { code: 'English' },
    { code: 'Bangla' },
    { code: 'Chinese' },
    { code: 'Dutch' },
  ];

  const currencies = [
    { code: 'USD', img: 'https://flagcdn.com/w20/us.png' },
    { code: 'EUR', img: 'https://flagcdn.com/w20/eu.png' },
    { code: 'GBP', img: 'https://flagcdn.com/w20/gb.png' },
    { code: 'BDT', img: 'https://flagcdn.com/w20/bd.png' },
  ];

  const languageRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        languageRef.current &&
        !languageRef.current.contains(event.target as Node)
      ) {
        setLanguageOpen(false);
      }
      if (
        currencyRef.current &&
        !currencyRef.current.contains(event.target as Node)
      ) {
        setCurrencyOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <section className="bg-background-50 relative min-h-screen">
      {/* Top Bar */}
      <div className="bg-foreground-100 py-3">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="order-2 flex gap-5 sm:order-1">
            {/* Language Dropdown */}
            <div className="relative" ref={languageRef}>
              <button
                onClick={() => setLanguageOpen(!languageOpen)}
                className="text-white-100 flex w-full cursor-pointer items-center gap-2 text-left text-base font-medium"
              >
                <Globe2 className="h-5 w-5" />
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

            {/* Currency Dropdown */}
            <div className="relative" ref={currencyRef}>
              <button
                onClick={() => setCurrencyOpen(!currencyOpen)}
                className="text-white-100 inline-flex cursor-pointer items-center gap-2 text-sm font-medium"
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
          </div>

          <p className="text-white-100 order-1 text-sm font-medium sm:order-2">
            Flash Sale Live – 30% Off Everything
          </p>

          <div className="order-3 hidden sm:block">
            <a
              href="javascript:void(0)"
              className="text-white-100 flex items-center gap-2 text-sm font-medium"
            >
              <User2 className="h-5 w-5" />
              Sign In / Register
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="bg-background-50 py-4 lg:py-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
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
            <div className="flex items-center">
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

            {/* Desktop Navigation */}
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

            {/* Desktop Right Side Items */}
            <div className="hidden items-center space-x-5 lg:flex">
              <div className="flex space-x-3">
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
                  <Heart className="h-6 w-6" />
                  <span className="bg-primary-500 text-white-100 absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold">
                    3
                  </span>
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
              </div>
            </div>

            {/* Mobile Right Side Items */}
            <div className="flex items-center gap-2.5 lg:hidden">
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
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="px-2 lg:hidden">
            <div className="bg-background-50 mt-5 space-y-1 rounded-xl px-2 pt-2 pb-3">
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
    </section>
  );
}
