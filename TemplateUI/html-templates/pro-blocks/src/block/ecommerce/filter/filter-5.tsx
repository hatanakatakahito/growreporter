import { Checkbox } from '@/components/core/checkbox';
import { Input } from '@/components/core/input';
import { ChevronDown, Search1, Xmark2x } from '@tailgrids/icons';
import { useState } from 'react';

export default function Filter5() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('Recommended');
  const [activeTab, setActiveTab] = useState('list');
  const [categoryOpen, setCategoryOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);
  const [colorOpen, setColorOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);
  const [selectedColor, setSelectedColor] = useState('Blue');

  const sortOptions = [
    'Featured',
    'Recommended',
    'Price, Low to high',
    'Price, high to low',
    'Alphabetically, A-Z',
    'Alphabetically, Z-A',
  ];

  const categories = [
    { name: 'Casual Shirts', count: 112 },
    { name: 'Dress Shirts', count: 45 },
    { name: 'Oxford Shirts', count: 74 },
    { name: 'Flannel Shirts', count: 58 },
    { name: 'Linen Shirts', count: 42 },
  ];

  const sizes = [
    { name: 'Small (S)', count: 47 },
    { name: 'Medium (M)', count: 78 },
    { name: 'Large (L)', count: 69 },
    { name: 'X-Large (XL)', count: 64 },
    { name: 'XX-Large (XXL)', count: 36 },
  ];

  const colors = [
    {
      name: 'Black',
      color: '#1f2937',
      ring: 'ring-black/20',
    },
    { name: 'Blue', color: '#3758F9', ring: 'ring-[#3758F9]/30' },
    {
      name: 'White',
      color: '#ffffff',
      ring: 'ring-gray-300',
    },
    { name: 'Green', color: '#4ade80', ring: 'ring-green-400/30' },
    { name: 'Red', color: '#f87171', ring: 'ring-red-400/30' },
  ];
  return (
    <section className="bg-background-soft-100 py-28">
      <div className="relative mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Header Section */}
          <div className="bg-background-50 col-span-full flex items-end justify-between rounded-xl p-7">
            <div className="block lg:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-title-50 border-base-100 flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="18"
                  viewBox="0 0 14 18"
                  fill="none"
                >
                  <path
                    d="M0.75 2.54102C0.75 1.85066 1.30964 1.29102 2 1.29102H11.375C12.0654 1.29102 12.625 1.85066 12.625 2.54102V3.67479C12.625 4.22313 12.4447 4.75627 12.1119 5.19207L8.50654 9.9134C8.34014 10.1313 8.25 10.3979 8.25 10.672V15.8706C8.25 16.5184 7.54336 16.9185 6.98792 16.5852L5.73188 15.8316C5.35537 15.6057 5.125 15.1988 5.125 14.7597V10.672C5.125 10.3979 5.03486 10.1313 4.86846 9.9134L1.26308 5.19207C0.930283 4.75627 0.75 4.22313 0.75 3.67479V2.54102Z"
                    stroke="#1F2937"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Filter
              </button>
            </div>
            <div className="hidden lg:block">
              <h3 className="text-title-50 mb-1 text-2xl font-semibold">
                Mens Shirts
              </h3>
              <p className="text-text-100 text-base">
                Showing 1-12 of 23 Results
              </p>
            </div>
            {/* Sort Section */}
            <div className="flex gap-7">
              <div className="hidden items-center gap-2 lg:flex">
                <span className="text-text-100 text-sm font-normal">
                  Sort by
                </span>
                <div className="relative inline-block">
                  <button
                    onClick={() => setSortOpen(!sortOpen)}
                    className="text-title-50 bg-background-50 border-base-200 hover:bg-background-soft-50 inline-flex h-10 min-w-26 cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm font-medium shadow-sm focus:outline-none"
                  >
                    <span>{selectedSort}</span>
                    <svg
                      className={`ml-2 h-4 w-4 transform transition-transform ${
                        sortOpen ? 'rotate-180' : ''
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M4.79102 7.39648L9.99935 12.6048L15.2077 7.39648"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {sortOpen && (
                    <div
                      className="bg-background-50 absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-lg shadow-md focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ul className="text-text-50 p-1.5 text-sm">
                        {sortOptions.map((option) => (
                          <li key={option}>
                            <button
                              onClick={() => {
                                setSelectedSort(option);
                                setSortOpen(false);
                              }}
                              className="hover:text-title-50 text-text-100 hover:bg-background-soft-100 block w-full cursor-pointer rounded-lg px-4 py-2 text-left"
                            >
                              {option}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('grid')}
                  className={`rounded-r-0 border-base-100 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-l-lg border border-r-0 transition-colors ${
                    activeTab === 'grid'
                      ? 'bg-primary-100 text-primary-500'
                      : 'text-text-100 bg-transparent'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M12.0001 4V20M20 12L4 12M5.5 20H18.5C19.3284 20 20 19.3284 20 18.5V5.5C20 4.67157 19.3284 4 18.5 4H5.5C4.67157 4 4 4.67157 4 5.5V18.5C4 19.3284 4.67157 20 5.5 20Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab('list')}
                  className={`rounded-l-0 border-base-100 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 transition-colors ${
                    activeTab === 'list'
                      ? 'bg-primary-100 text-primary-500'
                      : 'text-text-100 bg-transparent'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M10.3301 5.66498H20M10.3301 11.995H20M10.3301 18.325H20M5 7.33H6.33C6.88228 7.33 7.33 6.88229 7.33 6.33V5C7.33 4.44772 6.88229 4 6.33 4H5C4.44772 4 4 4.44771 4 5V6.33C4 6.88228 4.44771 7.33 5 7.33ZM5 13.66H6.33C6.88228 13.66 7.33 13.2123 7.33 12.66V11.33C7.33 10.7777 6.88229 10.33 6.33 10.33H5C4.44772 10.33 4 10.7777 4 11.33V12.66C4 13.2123 4.44771 13.66 5 13.66ZM5 19.99H6.33C6.88228 19.99 7.33 19.5423 7.33 18.99V17.66C7.33 17.1077 6.88229 16.66 6.33 16.66H5C4.44772 16.66 4 17.1077 4 17.66V18.99C4 19.5423 4.44771 19.99 5 19.99Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
          {/* Overlay */}
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden"
            ></div>
          )}
          {/* Sidebar */}
          <aside
            className={`bg-background-soft-50 fixed top-0 left-0 z-50 h-full w-75 transform space-y-6 overflow-y-auto px-4 py-6 transition-transform duration-300 lg:static lg:col-span-4 lg:w-auto lg:translate-x-0 lg:rounded-xl lg:bg-transparent lg:p-0 xl:col-span-3 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="bg-background-50 rounded-xl px-6 py-4">
              <div className="flex items-center justify-between lg:hidden">
                <h4 className="text-title-50 text-base font-semibold">
                  Filter
                </h4>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-text-100 bg-background-soft-100 z-40 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg"
                >
                  <Xmark2x />
                </button>
              </div>
              <div className="hidden items-center justify-between lg:flex">
                <h4 className="text-title-50 text-base font-semibold">
                  Filter By
                </h4>
                <button className="text-primary-500 text-sm font-semibold">
                  Clear All
                </button>
              </div>
            </div>
            {/* Categories */}
            <div className="bg-background-50 rounded-xl">
              <div
                onClick={() => setCategoryOpen(!categoryOpen)}
                className="text-title-50 flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left text-base font-medium transition"
              >
                <h3 className="text-title-50 text-base font-medium">
                  Product Category
                  <span className="bg-primary-50 text-primary-500 ml-1 inline-flex h-5 items-center justify-center rounded-4xl px-2 text-xs font-medium">
                    2
                  </span>
                </h3>

                <ChevronDown
                  className={`text-text-50 transform transition-transform duration-300 ${
                    categoryOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
              {categoryOpen && (
                <div className="border-base-100 border-t px-6 py-6">
                  <div className="relative mb-6">
                    <Input
                      type="text"
                      className="pl-10"
                      placeholder="Search Category"
                    />
                    <span className="text-text-100 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                      <Search1 className="size-5" />
                    </span>
                  </div>
                  <ul className="space-y-4">
                    {categories.map((category) => (
                      <li
                        key={category.name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex grow items-center gap-3">
                          <Checkbox
                            name="category"
                            type="checkbox"
                            size="sm"
                            label={category.name}
                          />
                        </div>
                        <span className="text-text-100 bg-background-soft-100 inline-block rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                          {category.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex justify-center">
                    <button className="text-title-50 flex justify-center text-sm font-medium">
                      View more
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="21"
                        height="20"
                        viewBox="0 0 21 20"
                        fill="none"
                        className="ml-1"
                      >
                        <path
                          d="M5.29199 7.39648L10.5003 12.6048L15.7087 7.39648"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* Price Range */}
            <div className="bg-background-50 rounded-xl">
              <div
                onClick={() => setPriceOpen(!priceOpen)}
                className="text-title-50 flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left text-base font-medium transition"
              >
                <h3 className="text-title-50 text-base font-medium">
                  Price Range
                </h3>
                <ChevronDown
                  className={`text-text-50 transform transition-transform duration-300 ${
                    priceOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
              {priceOpen && (
                <div className="border-base-100 border-t px-6 py-6">
                  <p className="text-text-50 text-base">
                    The highest price is $100.00
                  </p>
                  <div className="my-6 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="bg-background-50 border-base-100 flex items-center rounded-lg border px-3">
                        <span className="text-text-100 pr-2">$</span>
                        <input
                          id="minPrice"
                          type="text"
                          placeholder="0.00"
                          className="text-title-50 border-l-base-100 w-full border-0 border-l bg-transparent px-2 py-2.5 text-sm font-medium focus:ring-0 focus:outline-none"
                        />
                      </div>
                    </div>
                    <span className="text-text-100">to</span>
                    <div className="flex-1">
                      <div className="bg-background-50 border-base-200 flex items-center rounded-lg border px-3">
                        <span className="text-text-100 pr-2">$</span>
                        <input
                          id="maxPrice"
                          type="text"
                          placeholder="0.00"
                          className="text-title-50 border-l-base-100 w-full border-0 border-l bg-transparent px-2 py-2.5 text-sm font-medium focus:ring-0 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="2000"
                      defaultValue="1278"
                      className="[&::-moz-range-thumb]:border-primary-600 [&::-moz-range-thumb]:bg-background-50 [&::-webkit-slider-thumb]:bg-background-50 [&::-moz-range-track]:bg-background-soft-100 [&::-webkit-slider-runnable-track]:bg-background-soft-100 w-full cursor-pointer appearance-none bg-transparent focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-150 [&::-moz-range-thumb]:ease-in-out [&::-moz-range-track]:h-2 [&::-moz-range-track]:w-full [&::-moz-range-track]:rounded-full [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:w-full [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:-mt-0.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(37,99,235,1)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:ease-in-out"
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Color */}
            <div className="bg-background-50 rounded-xl">
              <div
                onClick={() => setColorOpen(!colorOpen)}
                className="text-title-50 flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left text-base font-medium transition"
              >
                <h3 className="text-title-50 text-base font-medium">Color</h3>
                <ChevronDown
                  className={`text-text-50 transform transition-transform duration-300 ${
                    colorOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
              {colorOpen && (
                <div className="border-base-100 border-t px-6 py-6">
                  <div className="flex flex-wrap items-center gap-6">
                    {colors.map((color) => (
                      <label
                        key={color.name}
                        className="flex cursor-pointer flex-col items-center"
                      >
                        <input
                          type="radio"
                          value={color.name}
                          checked={selectedColor === color.name}
                          onChange={() => setSelectedColor(color.name)}
                          className="hidden"
                        />
                        <span
                          className={`border-base-200 h-5 w-5 rounded-full border ${
                            selectedColor === color.name
                              ? `ring-2 ring-offset-1 ${color.ring}`
                              : ''
                          }`}
                          style={{ backgroundColor: color.color }}
                        ></span>
                        <span className="text-text-100 mt-1 text-xs">
                          {color.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Size */}
            <div className="bg-background-50 rounded-xl">
              <div
                onClick={() => setSizeOpen(!sizeOpen)}
                className="text-title-50 flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left text-base font-medium transition"
              >
                <h3 className="text-title-50 text-base font-medium">
                  Size
                  <span className="bg-primary-50 text-primary-500 ml-1 inline-flex h-5 items-center justify-center rounded-4xl px-2 text-xs font-medium">
                    1
                  </span>
                </h3>
                <ChevronDown
                  className={`text-text-50 transform transition-transform duration-300 ${
                    sizeOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
              {sizeOpen && (
                <div className="border-base-100 border-t px-6 py-6">
                  <ul className="space-y-4">
                    {sizes.map((size) => (
                      <li
                        key={size.name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex grow items-center gap-3">
                          <Checkbox
                            name="size"
                            type="checkbox"
                            size="sm"
                            label={size.name}
                          />
                        </div>
                        <span className="text-text-100 bg-background-soft-100 inline-block rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                          {size.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
          {/* Products */}
          <div className="bg-background-50 flex min-h-screen items-center justify-center rounded-xl lg:col-span-8 xl:col-span-9">
            <p className="text-6xl opacity-15">Products</p>
          </div>
        </div>
      </div>
    </section>
  );
}
