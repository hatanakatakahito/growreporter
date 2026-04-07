import {
  BadgeDecagramPercent,
  BagShopping2,
  Brush2,
  ChevronDown,
  Code1,
  EmojiSmile,
  FontSquare,
  LaptopPhone,
  Layout5,
  Layout6,
  MenuBento1,
  MenuHamburger1,
  Phone,
  Search1,
  User2,
  Xmark,
} from '@tailgrids/icons';
import { useState } from 'react';

export default function EcomNavbar4() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  return (
    <header className="bg-background-50 relative min-h-screen">
      <div className="to-primary-500 bg-linear-to-l from-sky-500 py-3">
        <div className="flex items-center justify-center gap-1">
          <BadgeDecagramPercent className="text-white-100/90 h-5 w-5" />
          <p className="text-white-100 text-sm">
            Get 30% Off Use this promo “spring2025”
          </p>
        </div>
      </div>

      <nav className="bg-background-50 py-5 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              className="text-text-50 bg-background-soft-100 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg focus:outline-none md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <Xmark /> : <MenuHamburger1 />}
            </button>

            {/* Logo */}
            <div className="flex items-center">
              <a href="javascript:void(0)" className="text-title-50">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                  alt=""
                />
              </a>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden items-center md:flex">
              <div
                className="group relative px-3.5 py-2"
                onMouseEnter={() => setShopDropdownOpen(true)}
                onMouseLeave={() => setShopDropdownOpen(false)}
              >
                <button className="group-hover:text-primary-500 text-title-50 inline-flex cursor-pointer items-center text-base font-medium transition-all">
                  Categories
                  <ChevronDown
                    className={`ml-1 size-5 transition-transform duration-200 ${
                      shopDropdownOpen ? 'rotate-180' : ''
                    } group-hover:rotate-180`}
                  />
                </button>

                {/* Dropdown Menu */}
                <div
                  className={`bg-background-100 absolute left-0 z-50 mt-2 w-56 rounded-xl px-1 shadow-md transition-all duration-200 ${
                    shopDropdownOpen
                      ? 'visible opacity-100'
                      : 'invisible opacity-0'
                  }`}
                >
                  <div className="py-1">
                    {[
                      {
                        href: '#',
                        icon: Layout6,
                        text: 'All Products',
                      },
                      {
                        href: '#',
                        icon: Layout5,
                        text: 'Website Templates',
                      },
                      { href: '#', icon: Phone, text: 'Mobile App Kits' },
                      { href: '#', icon: FontSquare, text: 'Fonts' },
                      { href: '#', icon: MenuBento1, text: 'Dashboard UI' },
                      { href: '#', icon: LaptopPhone, text: 'Mockups' },
                      { href: '#', icon: Brush2, text: 'Illustrations' },
                      { href: '#', icon: Code1, text: 'Coded Templates' },
                      { href: '#', icon: EmojiSmile, text: 'Icon Pack' },
                    ].map((item, index) => (
                      <a
                        key={index}
                        href={item.href}
                        className="hover:bg-background-soft-200 text-title-50 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
                      >
                        <item.icon />
                        {item.text}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {['Freebies', 'Tutorials / Docs', 'Support'].map(
                (text, index) => (
                  <a
                    key={index}
                    href="javascript:void(0)"
                    className="hover:text-primary-500 text-title-50 px-3.5 py-2 text-base font-medium transition-colors"
                  >
                    {text}
                  </a>
                ),
              )}
            </div>

            {/* Desktop Right side items */}
            <div className="hidden items-center space-x-5 lg:flex">
              <div className="text-title-50 relative flex items-center gap-5 text-base font-medium">
                <Search1 />
                <p>Become a Partner</p>
              </div>
              <a
                href="javascript:void(0)"
                className="text-title-50 inline-flex cursor-pointer items-center justify-center font-medium transition-all"
              >
                Sign in
              </a>
              <button className="text-title-50 cursor-pointer">
                <BagShopping2 />
              </button>
            </div>

            {/* Mobile Right side items */}
            <div className="flex items-center space-x-4 sm:hidden">
              <button className="hover:text-title-50 text-text-50 cursor-pointer transition-colors">
                <Search1 />
              </button>
              <a
                href="javascript:void(0)"
                className="hover:text-title-50 text-text-50 cursor-pointer transition-colors"
              >
                <User2 />
              </a>
              <button className="hover:text-title-50 text-text-50 cursor-pointer transition-colors">
                <BagShopping2 />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="px-2 sm:hidden">
            <div className="bg-background-50 mt-5 space-y-1 rounded-xl px-2 pt-2 pb-3">
              {/* Mobile Shop Dropdown */}
              <div>
                <button
                  className={`${
                    mobileShopOpen ? 'text-primary-500' : 'text-title-50'
                  } hover:bg-background-soft-100 inline-flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-base font-medium`}
                  onClick={() => setMobileShopOpen(!mobileShopOpen)}
                >
                  Categories
                  <ChevronDown
                    className={`transition-transform duration-200 ${
                      mobileShopOpen ? 'text-primary-500 rotate-180' : ''
                    }`}
                  />
                </button>
                {mobileShopOpen && (
                  <div className="mt-1 space-y-1 rounded-lg p-2">
                    {[
                      { href: '#', icon: Layout6, text: 'UI Kit' },
                      {
                        href: '#',
                        icon: Layout5,
                        text: 'Website Templates',
                      },
                      { href: '#', icon: Phone, text: 'Mobile App Kits' },
                      { href: '#', icon: FontSquare, text: 'Fonts' },
                      { href: '#', icon: MenuBento1, text: 'Dashboard UI' },
                      { href: '#', icon: LaptopPhone, text: 'Mockups' },
                      { href: '#', icon: Brush2, text: 'Illustrations' },
                      { href: '#', icon: Code1, text: 'Coded Templates' },
                      { href: '#', icon: EmojiSmile, text: 'Icon Pack' },
                    ].map((item, index) => (
                      <a
                        key={index}
                        href={item.href}
                        className="hover:bg-background-soft-100 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
                      >
                        {item.icon && <item.icon />}
                        {item.text}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              {[
                { text: 'Freebies', icon: null },
                { text: 'Tutorials / Docs', icon: null },
                { text: 'Support', icon: null },
                { text: 'Become a Partner', icon: Search1 },
                { text: 'Account', icon: User2 },
              ].map((item, index) => (
                <a
                  key={index}
                  href="javascript:void(0)"
                  className="text-title-50 hover:bg-background-soft-100 flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-base font-medium"
                >
                  {item.icon && <item.icon />}
                  {item.text}
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
