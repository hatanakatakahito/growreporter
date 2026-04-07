import {
  Cart2,
  ChevronDown,
  Globe2,
  Heart,
  MenuHamburger1,
  Search1,
  Sparkle,
  User2,
  Xmark,
} from '@tailgrids/icons';
import { useState } from 'react';

const EcomNavbar3 = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('En');
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [mobileLangOpen, setMobileLangOpen] = useState(false);

  const categories = [
    'All Categories',
    'Electronics',
    'Clothing',
    'Books',
    'Home & Kitchen',
  ];
  const languages = ['En', 'Bn', 'Cn', 'Dn'];

  return (
    <header className="bg-background-50 relative min-h-screen">
      <div className="border-base-100 border-b py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex w-full items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-text-50 bg-background-soft-100 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg focus:outline-none lg:hidden"
            >
              {mobileMenuOpen ? (
                <Xmark className="size-6" />
              ) : (
                <MenuHamburger1 className="size-6" />
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

            {/* Search */}
            <div className="border-base-100 divide-base-100 relative mx-auto hidden h-11 w-full max-w-md items-center divide-x rounded-lg border px-4 py-2.5 xl:flex">
              {/* Category Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  className="flex w-40 cursor-pointer items-center justify-between pr-3"
                >
                  <span>{selectedCategory}</span>
                  <ChevronDown className="text-text-100 ml-2 h-4 w-4" />
                </button>

                {/* Dropdown Menu */}
                {categoryDropdownOpen && (
                  <div className="bg-background-50 absolute z-10 mt-2 w-40 rounded-xl p-1 shadow-md">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setCategoryDropdownOpen(false);
                        }}
                        className="hover:bg-background-soft-100 w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                {/* Search Input */}
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full border-0 bg-transparent px-4 focus:ring-0 focus:outline-none"
                />

                {/* Search Button */}
                <button className="absolute inset-y-0 right-0 px-4 py-2">
                  <Search1 className="text-text-100 size-5" />
                </button>
              </div>
            </div>

            {/* Cart and Others */}
            <div className="hidden items-center gap-5 lg:flex">
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:bg-background-soft-100 border-base-100 relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border transition-all"
              >
                <Heart className="size-6" />
                <span className="bg-primary-500 text-white-100 absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold">
                  2
                </span>
              </a>

              <a
                href="javascript:void(0)"
                className="text-text-50 hover:bg-background-soft-100 border-base-100 relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border transition-all"
              >
                <Cart2 className="size-6" />
                <span className="bg-primary-500 text-white-100 absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold">
                  3
                </span>
              </a>

              {/* Language */}
              <div className="relative">
                <button
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                  className="text-title-50 inline-flex cursor-pointer items-center gap-2 text-base font-medium"
                >
                  <Globe2 className="text-title-50 size-5" />
                  <span>{selectedLanguage}</span>
                  <ChevronDown
                    className={`size-5 transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {languageDropdownOpen && (
                  <ul className="bg-background-50 absolute z-10 mt-1 w-full rounded-xl p-1 shadow-lg">
                    {languages.map((lang) => (
                      <li
                        key={lang}
                        onClick={() => {
                          setSelectedLanguage(lang);
                          setLanguageDropdownOpen(false);
                        }}
                        className="hover:bg-background-soft-100 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
                      >
                        <span className="text-sm">{lang}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <a
                href="javascript:void(0)"
                className="text-title-50 flex items-center gap-2 font-medium"
              >
                <User2 className="size-5" />
                Sign In / Register
              </a>
            </div>

            {/* Mobile Right side items */}
            <div className="flex items-center gap-2.5 lg:hidden">
              <button className="text-text-50 hover:text-text-100 cursor-pointer">
                <Search1 className="size-6" />
              </button>

              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-text-100 cursor-pointer"
              >
                <User2 className="size-6" />
              </a>

              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-text-100 relative cursor-pointer"
              >
                <Cart2 className="size-6" />
                <span className="bg-primary-500 text-white-100 absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold">
                  3
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="bg-background-50">
        {/* Desktop Nav */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="hidden items-center lg:flex">
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 inline-flex gap-2 py-7 pr-4 text-base font-medium transition-colors"
              >
                <Sparkle className="size-5" />
                Hot Offer
              </a>

              <div
                className="group px-4 py-7"
                onMouseEnter={() => setShopDropdownOpen(true)}
                onMouseLeave={() => setShopDropdownOpen(false)}
              >
                <a
                  href="javascript:void(0)"
                  className="group-hover:text-primary-500 text-title-50 inline-flex cursor-pointer items-center text-base font-medium transition-all"
                >
                  Shop
                  <ChevronDown className="ml-1 size-5 transition-transform duration-300 group-hover:rotate-180" />
                </a>

                {/* Full-Width Mega Menu */}
                {shopDropdownOpen && (
                  <div className="bg-background-50 border-base-50 absolute right-0 left-0 z-50 mt-7 w-full border-t py-7">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                      <div className="divide-base-50 flex flex-col gap-7 divide-y xl:flex-row xl:divide-x xl:divide-y-0">
                        <div className="divide-base-50 flex divide-x pb-7 xl:w-1/2">
                          {/* Column 1 */}
                          <div className="w-1/3 pr-7">
                            <h3 className="text-title-50 mb-3 text-xl font-medium">
                              Men
                            </h3>
                            <div className="space-y-3">
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                T-Shirts
                              </a>
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                Hoodies
                              </a>
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                Pants & Shorts
                              </a>
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                Jackets
                              </a>
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                Shoes
                              </a>
                            </div>
                          </div>

                          {/* Column 2 */}
                          <div className="w-1/3 px-7">
                            <h3 className="text-title-50 mb-3 text-xl font-medium">
                              Women
                            </h3>
                            <div className="space-y-3">
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                Dresses
                              </a>
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                Tops & Blouses
                              </a>
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                Skirts & Pants
                              </a>
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                Outerwear
                              </a>
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                Heels & Flats
                              </a>
                            </div>
                          </div>

                          {/* Column 3 */}
                          <div className="w-1/3 px-7">
                            <h3 className="text-title-50 mb-3 text-xl font-medium">
                              Accessories
                            </h3>
                            <div className="space-y-3">
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                Bags
                              </a>
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                Jewelry
                              </a>
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                Watches
                              </a>
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                Sunglasses
                              </a>
                              <a
                                href="javascript:void(0)"
                                className="hover:text-title-50 text-text-100 block text-base transition-colors"
                              >
                                Belts
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="divide-base-50 flex divide-x xl:w-1/2">
                          <div className="relative w-1/2 pr-7">
                            <img
                              src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/navbars/navbar-02/product-1.jpg"
                              className="w-full rounded-lg"
                              alt="New Arrivals"
                            />
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                              <a
                                href="javascript:void(0)"
                                className="text-title-50 bg-background-50 hover:bg-background-soft-100 border-base-200 rounded-lg border px-3.5 py-2.5 text-sm font-medium"
                              >
                                New Arrivals
                              </a>
                            </div>
                          </div>
                          <div className="relative w-1/2 pl-7">
                            <img
                              src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/navbars/navbar-02/product-2.jpg"
                              className="w-full rounded-lg"
                              alt="Best Seller"
                            />
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                              <a
                                href="javascript:void(0)"
                                className="text-title-50 bg-background-50 hover:bg-background-soft-100 border-base-200 rounded-lg border px-3.5 py-2.5 text-sm font-medium"
                              >
                                Best Seller
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 px-3.5 py-7 text-base font-medium transition-colors"
              >
                New Arrivals
              </a>
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 px-4 py-7 text-base font-medium transition-colors"
              >
                Collections
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
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-title-50 px-4 py-7 text-base font-medium transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="px-2 lg:hidden">
            <div className="bg-background-50 mt-5 space-y-1 rounded-xl px-2 pt-2 pb-3">
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-base font-medium"
              >
                <Sparkle className="size-5" />
                Hot Offer
              </a>

              {/* Mobile Shop Dropdown */}
              <div>
                <button
                  onClick={() => setMobileShopOpen(!mobileShopOpen)}
                  className={`text-title-50 hover:bg-background-soft-100 inline-flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-base font-medium ${
                    mobileShopOpen ? 'text-primary-500' : ''
                  }`}
                >
                  Shop
                  <ChevronDown
                    className={`size-5 transition-transform ${
                      mobileShopOpen ? 'text-primary-500 rotate-180' : ''
                    }`}
                  />
                </button>
                {mobileShopOpen && (
                  <div className="mt-1 p-2">
                    <div className="border-base-100 space-y-6 border-b pb-5">
                      <div>
                        <h3 className="text-title-50 mb-3 text-xl font-medium">
                          Men
                        </h3>
                        <div className="space-y-3">
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            T-Shirts
                          </a>
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            Hoodies
                          </a>
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            Pants & Shorts
                          </a>
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            Jackets
                          </a>
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            Shoes
                          </a>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-title-50 mb-3 text-xl font-medium">
                          Women
                        </h3>
                        <div className="space-y-3">
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            Dresses
                          </a>
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            Tops & Blouses
                          </a>
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            Skirts & Pants
                          </a>
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            Outerwear
                          </a>
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            Heels & Flats
                          </a>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-title-50 mb-3 text-xl font-medium">
                          Accessories
                        </h3>
                        <div className="space-y-3">
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            Bags
                          </a>
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            Jewelry
                          </a>
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            Watches
                          </a>
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            Sunglasses
                          </a>
                          <a
                            href="javascript:void(0)"
                            className="hover:text-title-50 text-text-100 block text-base transition-colors"
                          >
                            Belts
                          </a>
                        </div>
                      </div>

                      <div className="relative">
                        <img
                          src="https://placehold.co/256x238/png"
                          className="w-full rounded-lg"
                          alt="New Arrivals"
                        />
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                          <a
                            href="javascript:void(0)"
                            className="text-title-50 bg-background-50 hover:bg-background-soft-100 border-base-200 rounded-lg border px-3.5 py-2.5 text-sm font-medium"
                          >
                            New Arrivals
                          </a>
                        </div>
                      </div>

                      <div className="relative">
                        <img
                          src="https://placehold.co/256x238/png"
                          className="w-full rounded-lg"
                          alt="Best Seller"
                        />
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                          <a
                            href="javascript:void(0)"
                            className="text-title-50 bg-background-50 hover:bg-background-soft-100 border-base-200 rounded-lg border px-3.5 py-2.5 text-sm font-medium"
                          >
                            Best Seller
                          </a>
                        </div>
                      </div>
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
                Collections
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 flex w-full gap-2 rounded-lg px-3 py-2 text-left text-base font-medium"
              >
                Sale
                <span className="text-primary-500 bg-primary-50 inline-flex items-center rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                  20% OFF
                </span>
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-base font-medium"
              >
                <div className="relative">
                  <span className="bg-primary-500 text-white-100 absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold">
                    3
                  </span>
                  <Heart className="size-5" />
                </div>
                Wishlist
              </a>
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-base font-medium"
              >
                <User2 className="size-5" />
                Sign in / Register
              </a>

              {/* Language */}
              <div className="relative">
                <button
                  onClick={() => setMobileLangOpen(!mobileLangOpen)}
                  className="text-title-50 hover:bg-background-soft-100 flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-base font-medium"
                >
                  <Globe2 className="text-title-50 size-5" />
                  <span>{selectedLanguage}</span>
                  <ChevronDown
                    className={`size-5 transition-transform ${mobileLangOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {mobileLangOpen && (
                  <ul className="bg-background-50 absolute z-10 mt-1 w-full rounded-xl p-1 shadow-lg">
                    {languages.map((lang) => (
                      <li
                        key={lang}
                        onClick={() => {
                          setSelectedLanguage(lang);
                          setMobileLangOpen(false);
                        }}
                        className="hover:bg-background-soft-100 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
                      >
                        <span className="text-sm">{lang}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default EcomNavbar3;
