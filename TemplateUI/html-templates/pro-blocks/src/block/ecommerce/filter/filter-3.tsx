import { Button } from '@/components/core/button';
import { Checkbox } from '@/components/core/checkbox';
import { DropdownMenuTrigger } from '@/components/core/dropdown';
import { SlidersDoubleHorizontal } from '@tailgrids/icons';
import React, { useState } from 'react';
import { MenuTrigger, Popover } from 'react-aria-components';

const Filter3: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [selectedColor, setSelectedColor] = useState('red-500');
  const [selectedSize, setSelectedSize] = useState('2XL');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Footwear',
  ]);
  const [priceRange, setPriceRange] = useState(1278);

  const categories = [
    { name: 'Tops', count: 124 },
    { name: 'Bottoms', count: 78 },
    { name: 'Outerwear', count: 104 },
    { name: 'Footwear', count: 35 },
    { name: 'Accessories', count: 517 },
  ];

  const colors = [
    { name: 'Black', value: 'black' },
    { name: 'Red', value: 'red-500' },
    { name: 'Yellow', value: 'yellow-400' },
    { name: 'White', value: 'white' },
    { name: 'Gray', value: 'gray-500' },
    { name: 'Blue', value: 'primary-500' },
    { name: 'Green', value: 'green-500' },
    { name: 'Pink', value: 'pink-500' },
  ];

  const sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const resetCategory = () => setSelectedCategories([]);
  const resetPrice = () => setPriceRange(1278);
  const resetColor = () => setSelectedColor('red-500');
  const resetSize = () => setSelectedSize('2XL');

  return (
    <section className="bg-background-soft-100 py-28">
      <div className="relative mx-auto max-w-7xl px-4 xl:px-0">
        {/* Overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 xl:hidden"
          ></div>
        )}
        {/* Sidebar */}
        <aside
          className={`bg-background-50 fixed top-0 left-0 z-50 h-full w-75 transform overflow-y-auto p-5 shadow-lg transition-transform duration-300 xl:hidden ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-title-50 text-base font-semibold">
                Filter By
              </h4>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-text-100 bg-background-soft-100 z-40 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M13.805 15.0724L13.7366 15.0109L9.99907 11.2734L6.26156 15.0109C5.91009 15.3624 5.33969 15.3624 4.98821 15.0109C4.63674 14.6594 4.63674 14.089 4.98821 13.7376L8.72573 10L4.98821 6.26253C4.63674 5.91106 4.63674 5.34066 4.98821 4.98919C5.33969 4.63772 5.91009 4.63772 6.26156 4.98919L9.99907 8.7267L13.7366 4.98919L13.805 4.92773C14.1584 4.63936 14.6797 4.66035 15.0092 4.98988C15.3388 5.3194 15.3598 5.84067 15.0714 6.19417L15.0099 6.26253L11.2724 10L15.0099 13.7376L15.0714 13.8059C15.3598 14.1594 15.3388 14.6807 15.0092 15.0102C14.6797 15.3397 14.1584 15.3607 13.805 15.0724Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
            {/* Category */}
            <div className="bg-background-soft-50 rounded-xl p-2">
              <div className="bg-background-50 flex items-center justify-between rounded-lg px-5 py-4">
                <h3 className="text-title-50 text-base font-medium">
                  Category
                </h3>
                <button
                  onClick={resetCategory}
                  className="text-text-100 hover:text-text-50 cursor-pointer text-sm"
                >
                  Reset
                </button>
              </div>
              <ul className="space-y-3 px-3.5 py-7">
                {categories.map((category) => (
                  <li
                    key={category.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex grow items-center gap-3">
                      <Checkbox
                        name="category"
                        size="sm"
                        checked={selectedCategories.includes(category.name)}
                        onChange={() => handleCategoryChange(category.name)}
                        label={category.name}
                      />
                    </div>
                    <span className="text-text-100 bg-background-50 rounded-full px-2 py-0.5 text-xs font-medium">
                      ({category.count})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Price */}
            <div className="bg-background-soft-50 rounded-xl p-2">
              <div className="bg-background-50 flex items-center justify-between rounded-lg px-5 py-4">
                <h3 className="text-title-50 text-base font-medium">Price</h3>
                <button
                  onClick={resetPrice}
                  className="text-text-100 hover:text-text-50 cursor-pointer text-sm"
                >
                  Reset
                </button>
              </div>
              <div className="px-3.5 py-7">
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    value={priceRange}
                    onChange={(e) => setPriceRange(Number(e.target.value))}
                    className="[&::-moz-range-thumb]:border-primary-600 [&::-moz-range-thumb]:bg-background-50 [&::-webkit-slider-thumb]:bg-background-50 [&::-moz-range-track]:bg-background-soft-100 [&::-webkit-slider-runnable-track]:bg-background-soft-100 w-full cursor-pointer appearance-none bg-transparent focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-150 [&::-moz-range-thumb]:ease-in-out [&::-moz-range-track]:h-2 [&::-moz-range-track]:w-full [&::-moz-range-track]:rounded-full [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:w-full [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:-mt-0.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(37,99,235,1)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:ease-in-out"
                  />
                  <div className="mt-2 flex justify-between gap-5">
                    <span className="text-text-50 text-xs">$0</span>
                    <span className="text-text-50 text-xs">$50</span>
                    <span className="text-text-50 text-xs">$100</span>
                    <span className="text-text-50 text-xs">$150</span>
                    <span className="text-text-50 text-xs">$200+</span>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <div>
                    <label className="text-text-50 mb-2 block text-sm font-medium">
                      Min
                    </label>
                    <input className="text-title-50 border-base-200 h-11 w-24 rounded-lg border px-4 py-2.5 text-center text-sm font-medium focus:ring-0" />
                  </div>
                  <div className="mt-11 h-11">
                    <span className="text-gray-200">—</span>
                  </div>
                  <div>
                    <label className="text-text-50 mb-2 block text-sm font-medium">
                      Max
                    </label>
                    <input className="border-base-200 text-text-50 h-11 w-24 rounded-lg border px-4 py-2.5 text-center text-sm focus:ring-0" />
                  </div>
                </div>
              </div>
            </div>
            {/* Color */}
            <div className="bg-background-soft-50 rounded-xl p-2">
              <div className="bg-background-50 flex items-center justify-between rounded-lg px-5 py-4">
                <h3 className="text-title-50 text-base font-medium">Color</h3>
                <button
                  onClick={resetColor}
                  className="text-text-100 hover:text-text-50 cursor-pointer text-sm"
                >
                  Reset
                </button>
              </div>
              <div className="flex flex-wrap gap-5 px-3.5 py-7">
                {colors.map((color) => (
                  <div
                    key={color.value}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      onClick={() => setSelectedColor(color.value)}
                      className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors ${
                        color.value === 'white'
                          ? 'bg-background-50 border-base-100 border'
                          : color.value === 'black'
                            ? 'border-base-200 border bg-black'
                            : `bg-${color.value}`
                      }`}
                    >
                      {selectedColor === color.value && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="21"
                          height="20"
                          viewBox="0 0 21 20"
                          fill="none"
                          className={
                            color.value === 'white'
                              ? 'text-title-50'
                              : 'text-white-100'
                          }
                        >
                          <path
                            d="M17.2522 5.4502L8.15222 14.5502L3.74805 10.1461"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-text-100 text-sm">{color.name}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Size */}
            <div className="bg-background-soft-50 rounded-xl p-2">
              <div className="bg-background-50 flex items-center justify-between rounded-lg px-5 py-4">
                <h3 className="text-title-50 text-base font-medium">Size</h3>
                <button
                  onClick={resetSize}
                  className="text-text-100 hover:text-text-50 cursor-pointer text-sm"
                >
                  Reset
                </button>
              </div>
              <ul className="flex flex-wrap gap-3 px-3.5 py-7">
                {sizes.map((size) => (
                  <li
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`flex h-9 w-14 cursor-pointer items-center justify-center rounded-lg border p-2.5 text-sm font-medium transition-colors ${
                      selectedSize === size
                        ? 'bg-primary-500 border-primary-500 text-white-100'
                        : 'hover:bg-primary-500 hover:border-primary-500 text-text-50 bg-background-50 hover:text-white-100 border-base-100'
                    }`}
                  >
                    {size}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        <div className="bg-background-50 relative rounded-xl">
          {/* Header */}
          <div className="border-base-100 flex flex-col justify-between gap-5 border-b p-7 lg:flex-row lg:items-end">
            <div className="max-w-xl">
              <h2 className="text-title-50 mb-3 text-4xl font-semibold">
                Fall Collection
              </h2>
              <p className="text-text-100 text-base">
                Discover our curated assortment of men's clothing, designed for
                style and
              </p>
            </div>
            <div className="flex gap-3">
              <div className="hidden lg:block">
                <MenuTrigger>
                  <DropdownMenuTrigger className="text-text-50 bg-background-50 border-base-200 hover:bg-background-soft-50 inline-flex h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium">
                    <SlidersDoubleHorizontal className="size-5" /> Filter
                  </DropdownMenuTrigger>
                  <Popover
                    className="bg-background-50 border-base-100 z-50 w-full max-w-5xl rounded-lg border p-6 shadow-lg focus:outline-0"
                    placement="bottom end"
                    offset={10}
                    containerPadding={20}
                  >
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                      {/* Category */}
                      <div className="bg-background-soft-50 rounded-xl p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-title-50 text-base font-medium">
                            Category
                          </h3>
                          <button
                            onClick={resetCategory}
                            className="text-text-100 hover:text-text-50 cursor-pointer text-sm"
                          >
                            Reset
                          </button>
                        </div>
                        <ul className="space-y-3">
                          {categories.map((category) => (
                            <li
                              key={category.name}
                              className="flex items-center justify-between"
                            >
                              <div className="flex grow items-center gap-3">
                                <Checkbox
                                  name="category"
                                  size="sm"
                                  checked={selectedCategories.includes(
                                    category.name,
                                  )}
                                  onChange={() =>
                                    handleCategoryChange(category.name)
                                  }
                                  label={category.name}
                                />
                              </div>
                              <span className="text-text-100 bg-background-50 rounded-full px-2 py-0.5 text-xs font-medium">
                                ({category.count})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Price */}
                      <div className="bg-background-soft-50 rounded-xl p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-title-50 text-base font-medium">
                            Price
                          </h3>
                          <button
                            onClick={resetPrice}
                            className="text-text-100 hover:text-text-50 cursor-pointer text-sm"
                          >
                            Reset
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div className="relative">
                            <input
                              type="range"
                              min="0"
                              max="2000"
                              value={priceRange}
                              onChange={(e) =>
                                setPriceRange(Number(e.target.value))
                              }
                              className="[&::-moz-range-thumb]:border-primary-600 [&::-moz-range-thumb]:bg-background-50 [&::-webkit-slider-thumb]:bg-background-50 [&::-moz-range-track]:bg-background-soft-100 [&::-webkit-slider-runnable-track]:bg-background-soft-100 w-full cursor-pointer appearance-none bg-transparent focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-150 [&::-moz-range-thumb]:ease-in-out [&::-moz-range-track]:h-2 [&::-moz-range-track]:w-full [&::-moz-range-track]:rounded-full [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:w-full [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:-mt-0.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(37,99,235,1)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:ease-in-out"
                            />
                            <div className="text-text-50 mt-2 flex justify-between text-xs">
                              <span>$0</span>
                              <span>$200+</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              placeholder="Min"
                              className="text-title-50 border-base-200 h-9 w-20 rounded-lg border px-2 text-center text-sm font-medium focus:ring-0"
                            />
                            <span className="text-text-50">—</span>
                            <input
                              placeholder="Max"
                              className="border-base-200 text-text-50 h-9 w-20 rounded-lg border px-2 text-center text-sm focus:ring-0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Color */}
                      <div className="bg-background-soft-50 rounded-xl p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-title-50 text-base font-medium">
                            Color
                          </h3>
                          <button
                            onClick={resetColor}
                            className="text-text-100 hover:text-text-50 cursor-pointer text-sm"
                          >
                            Reset
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          {colors.map((color) => (
                            <div
                              key={color.value}
                              className="flex flex-col items-center gap-1"
                            >
                              <div
                                onClick={() => setSelectedColor(color.value)}
                                className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors ${
                                  color.value === 'white'
                                    ? 'bg-background-50 border-base-100 border'
                                    : color.value === 'black'
                                      ? 'border-base-200 border bg-black'
                                      : `bg-${color.value}`
                                }`}
                              >
                                {selectedColor === color.value && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 21 20"
                                    fill="none"
                                    className={
                                      color.value === 'white'
                                        ? 'text-title-50'
                                        : 'text-white-100'
                                    }
                                  >
                                    <path
                                      d="M17.2522 5.4502L8.15222 14.5502L3.74805 10.1461"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </div>
                              <span className="text-text-100 text-xs">
                                {color.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Size */}
                      <div className="bg-background-soft-50 rounded-xl p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-title-50 text-base font-medium">
                            Size
                          </h3>
                          <button
                            onClick={resetSize}
                            className="text-text-100 hover:text-text-50 cursor-pointer text-sm"
                          >
                            Reset
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {sizes.map((size) => (
                            <button
                              key={size}
                              onClick={() => setSelectedSize(size)}
                              className={`flex h-8 w-full cursor-pointer items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                                selectedSize === size
                                  ? 'bg-primary-500 border-primary-500 text-white-100'
                                  : 'hover:bg-primary-500 hover:border-primary-500 text-text-50 bg-background-50 hover:text-white-100 border-base-100'
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Popover>
                </MenuTrigger>
              </div>
              <div className="block lg:hidden">
                <Button
                  appearance="outline"
                  onClick={() => setSidebarOpen(true)}
                >
                  <SlidersDoubleHorizontal className="size-5" />
                  Filter
                </Button>
              </div>
              <nav className="bg-background-soft-100 flex h-11 gap-2 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('list')}
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'list'
                      ? 'text-title-50 bg-background-50'
                      : 'text-text-100 bg-transparent'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setActiveTab('grid')}
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'grid'
                      ? 'text-title-50 bg-background-50'
                      : 'text-text-100 bg-transparent'
                  }`}
                >
                  Grid
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="relative min-h-screen overflow-hidden rounded-xl">
            <div className="flex-1 p-10">
              <div className="flex h-screen items-center justify-center">
                <p className="text-6xl opacity-15">Products</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Filter3;
