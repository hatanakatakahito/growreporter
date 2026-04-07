import { Checkbox } from '@/components/core/checkbox';
import { Check, ChevronDown, Funnel1, Xmark2x } from '@tailgrids/icons';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/core/button';
import { DropdownMenuTrigger } from '@/components/core/dropdown';
import { MenuTrigger, Popover } from 'react-aria-components';

export default function Filter6() {
  const [sortSelected, setSortSelected] = useState<string | null>(null);
  const [colorSelected, setColorSelected] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const mobileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // close mobile drawer when clicking outside
      if (mobileRef.current && !mobileRef.current.contains(target))
        setMobileOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortOptions = [
    'Featured',
    'Best Selling',
    'Price, Low to high',
    'Price, high to low',
    'Alphabetically, A-Z',
    'Alphabetically, Z-A',
  ];

  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );

  const categories = [
    { name: 'Casual Shirts', count: 112 },
    { name: 'Dress Shirts', count: 45 },
    { name: 'Oxford Shirts', count: 74 },
    { name: 'Flannel Shirts', count: 58 },
    { name: 'Linen Shirts', count: 42 },
  ];

  const toggleSize = (value: string) => {
    setSelectedSizes((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const toggleCategory = (value: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  return (
    <section className="bg-background-50 py-28">
      <div className="relative mx-auto max-w-7xl px-4 xl:px-0">
        <div className="sm:px-8">
          <div className="flex items-center justify-between pb-6 sm:hidden">
            <div>
              <Button
                appearance="outline"
                className="flex items-center gap-2"
                onClick={() => setMobileOpen(true)}
              >
                <Funnel1 className="size-4" /> Filter
              </Button>
            </div>
            {/* Sort Dropdown Here (using MenuTrigger and Popover) */}
            <div className="relative">
              <MenuTrigger>
                <DropdownMenuTrigger className="text-text-50 bg-background-soft-100 inline-flex items-center gap-2 rounded-md px-3 py-1 text-sm font-medium">
                  {sortSelected || 'Sort'}
                  <ChevronDown className="ml-1 h-3 w-3 transform transition-transform" />
                </DropdownMenuTrigger>

                <Popover
                  className="bg-background-50 z-50 w-52 rounded-lg p-2 shadow-md"
                  placement="bottom end"
                >
                  <ul className="space-y-1">
                    {sortOptions.map((option) => (
                      <li key={option}>
                        <button
                          onClick={() => setSortSelected(option)}
                          className="hover:text-title-50 text-text-100 hover:bg-background-soft-100 block w-full cursor-pointer rounded-lg px-4 py-2 text-left text-sm"
                        >
                          {option}
                        </button>
                      </li>
                    ))}
                  </ul>
                </Popover>
              </MenuTrigger>
            </div>
          </div>
          {/* Mobile filter drawer - controlled by mobileOpen */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 flex items-stretch">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setMobileOpen(false)}
              />
              <div
                ref={mobileRef}
                className="bg-background-50 relative ml-auto h-full w-full max-w-xs overflow-auto p-6"
                role="dialog"
                aria-modal="true"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Filter</h3>
                  <Button
                    appearance="outline"
                    size="sm"
                    iconOnly
                    aria-label="Close filters"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center"
                  >
                    <Xmark2x className="size-4" />
                  </Button>
                </div>

                <div className="mt-6 space-y-6">
                  {/* Sort options */}
                  <div>
                    <h4 className="mb-3 text-sm font-medium">Sort</h4>
                    <ul className="space-y-1">
                      {sortOptions.map((option) => (
                        <li key={option}>
                          <button
                            onClick={() => {
                              setSortSelected(option);
                            }}
                            className="text-text-50 w-full text-left text-sm"
                          >
                            {option}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Categories */}
                  <div>
                    <h4 className="mb-3 text-sm font-medium">Category</h4>
                    <ul className="space-y-3">
                      {categories.map((cat) => (
                        <li
                          key={cat.name}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              name="category"
                              size="sm"
                              label={cat.name}
                              onChange={() => toggleCategory(cat.name)}
                              checked={selectedCategories.has(cat.name)}
                            />
                          </div>
                          <span className="text-text-100 text-xs">
                            {cat.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Price */}
                  <div>
                    <h4 className="mb-3 text-sm font-medium">Price</h4>
                    <p className="text-title-50 mb-5 text-sm">
                      The highest price is $100.00
                    </p>
                    <div className="mb-6">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        defaultValue={50}
                        className="accent-primary-500 [&::-webkit-slider-thumb]:border-primary-500 [&::-webkit-slider-thumb]:bg-background-50 bg-background-soft-200 h-1.5 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="border-base-100 flex items-center overflow-hidden rounded-lg border">
                        <span className="border-base-100 text-text-50 border-r px-4 py-2.5 text-sm">
                          $
                        </span>
                        <input
                          type="text"
                          placeholder="00.00"
                          className="text-text-50 w-full border-0 px-3 py-2.5 text-sm ring-0 focus:outline-none"
                        />
                      </div>
                      <p className="text-text-100 text-sm">to</p>
                      <div className="border-base-100 flex items-center overflow-hidden rounded-lg border">
                        <span className="border-base-100 text-text-50 border-r px-4 py-2.5 text-sm">
                          $
                        </span>
                        <input
                          type="text"
                          placeholder="100.00"
                          className="text-text-50 w-full border-0 px-3 py-2.5 text-sm ring-0 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <h4 className="mb-3 text-sm font-medium">Color</h4>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: 'Black', bg: 'bg-black' },
                        { label: 'Blue', bg: 'bg-primary-600' },
                        { label: 'White', bg: 'bg-background-50' },
                        { label: 'Green', bg: 'bg-badge-success-background0' },
                        { label: 'Red', bg: 'bg-badge-error-background0' },
                        { label: 'Pink', bg: 'bg-pink-500' },
                        { label: 'Yellow', bg: 'bg-yellow-400' },
                        { label: 'Purple', bg: 'bg-purple-500' },
                      ].map((c) => (
                        <button
                          key={c.label}
                          onClick={() => setColorSelected(c.label)}
                          className="flex flex-col items-center gap-1"
                          aria-pressed={colorSelected === c.label}
                        >
                          <div className="relative h-7 w-7">
                            <div
                              className={`${c.bg} ring-background-soft-400 h-7 w-7 rounded-full ring-1`}
                            />
                            {colorSelected === c.label && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Check
                                  className={`size-3 ${c.label === 'White' ? 'text-text-50' : 'text-white-100'}`}
                                />
                              </div>
                            )}
                          </div>
                          <span className="text-text-100 text-xs">
                            {c.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size */}
                  <div>
                    <h4 className="mb-3 text-sm font-medium">Size</h4>
                    <ul className="space-y-3">
                      {[
                        'Small (S)',
                        'Medium (M)',
                        'Large (L)',
                        'X-Large (XL)',
                        'XX-Large (XXL)',
                      ].map((sz) => (
                        <li key={sz} className="flex items-center gap-3">
                          <Checkbox
                            name="size"
                            size="sm"
                            label={sz}
                            onChange={() => toggleSize(sz)}
                            checked={selectedSizes.has(sz)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-6">
                    <Button
                      appearance="outline"
                      onClick={() => {
                        setSelectedCategories(new Set());
                        setSelectedSizes(new Set());
                        setColorSelected(null);
                        setSortSelected(null);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      className="w-full"
                      onClick={() => setMobileOpen(false)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="border-base-100 flex justify-between border-b sm:px-7 sm:py-6">
            <div className="hidden items-center gap-2 sm:flex">
              {/* Sort/Featured Dropdown */}
              <div className="relative inline-block">
                <MenuTrigger>
                  <DropdownMenuTrigger className="group text-title-50 hover:text-primary-500 aria-expanded:text-primary-500 inline-flex cursor-pointer items-center justify-between text-sm font-medium transition-colors focus:outline-none">
                    <span>{sortSelected ? sortSelected : 'Featured'}</span>
                    <ChevronDown className="ml-2 h-4 w-4 transition-transform duration-200 group-aria-expanded:rotate-180" />
                  </DropdownMenuTrigger>

                  <Popover
                    className="bg-background-50 border-base-100 z-50 w-52 rounded-xl border p-5 shadow-lg focus:outline-none"
                    placement="bottom start"
                  >
                    <h4 className="text-title-50 mb-4 text-base font-semibold">
                      Featured
                    </h4>
                    <ul className="space-y-3">
                      {[
                        'Best Selling',
                        'Price, Low to high',
                        'Price, high to low',
                        'Alphabetically, A-Z',
                        'Alphabetically, Z-A',
                      ].map((option) => (
                        <li key={option}>
                          <button
                            onClick={() => setSortSelected(option)}
                            className={`block w-full cursor-pointer text-left text-sm ${sortSelected === option ? 'text-title-50 font-medium' : 'hover:text-title-50 text-text-100'}`}
                          >
                            {option}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Popover>
                </MenuTrigger>
              </div>
            </div>
            <div className="flex gap-7">
              {/* <!-- Category --> */}
              <div className="hidden items-center gap-2 sm:flex">
                <div className="relative inline-block">
                  <MenuTrigger>
                    <DropdownMenuTrigger className="group text-title-50 hover:text-primary-500 aria-expanded:text-primary-500 inline-flex cursor-pointer items-center justify-between text-sm font-medium transition-colors focus:outline-none">
                      <span>Category</span>
                      <ChevronDown className="ml-2 h-4 w-4 transition-transform duration-200 group-aria-expanded:rotate-180" />
                    </DropdownMenuTrigger>

                    <Popover
                      className="bg-background-50 border-base-100 z-50 w-60 rounded-lg border p-4 shadow-lg focus:outline-0"
                      placement="bottom start"
                    >
                      <span className="text-text-50 mb-4 block text-base font-medium">
                        Product Category
                      </span>
                      <ul className="space-y-3">
                        {categories.map((cat) => (
                          <li
                            key={cat.name}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                name="category"
                                size="sm"
                                label={cat.name}
                                onChange={() => toggleCategory(cat.name)}
                                checked={selectedCategories.has(cat.name)}
                              />
                            </div>
                            <span className="text-text-100 text-xs">
                              {cat.count}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Popover>
                  </MenuTrigger>
                </div>
              </div>

              {/* Price */}
              <div className="hidden items-center gap-2 sm:flex">
                <div className="relative inline-block">
                  <MenuTrigger>
                    <DropdownMenuTrigger className="group text-title-50 hover:text-primary-500 aria-expanded:text-primary-500 inline-flex cursor-pointer items-center justify-between text-sm font-medium transition-colors focus:outline-none">
                      <span>Price</span>
                      <ChevronDown className="ml-2 h-4 w-4 transition-transform duration-200 group-aria-expanded:rotate-180" />
                    </DropdownMenuTrigger>

                    <Popover
                      className="bg-background-50 border-base-100 z-50 w-56 rounded-xl border p-6 shadow-lg focus:outline-0"
                      placement="bottom end"
                    >
                      <p className="text-title-50 mb-5 text-left text-sm">
                        The highest price is $100.00
                      </p>
                      <div className="mb-6">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          defaultValue={50}
                          className="accent-primary-500 [&::-webkit-slider-thumb]:border-primary-500 [&::-webkit-slider-thumb]:bg-background-50 bg-background-soft-200 h-1.5 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4"
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="border-base-100 flex items-center overflow-hidden rounded-lg border">
                          <span className="border-base-100 text-text-50 border-r px-4 py-2.5 text-sm">
                            $
                          </span>
                          <input
                            type="text"
                            placeholder="00.00"
                            className="text-text-50 w-full border-0 px-3 py-2.5 text-sm ring-0 focus:outline-none"
                          />
                        </div>
                        <p className="text-text-100 text-sm">to</p>
                        <div className="border-base-100 flex items-center overflow-hidden rounded-lg border">
                          <span className="border-base-100 text-text-50 border-r px-4 py-2.5 text-sm">
                            $
                          </span>
                          <input
                            type="text"
                            placeholder="100.00"
                            className="text-text-50 w-full border-0 px-3 py-2.5 text-sm ring-0 focus:outline-none"
                          />
                        </div>
                      </div>
                    </Popover>
                  </MenuTrigger>
                </div>
              </div>

              {/* Color */}
              <div className="hidden items-center gap-2 sm:flex">
                <div className="relative inline-block">
                  <MenuTrigger>
                    <DropdownMenuTrigger className="group text-title-50 hover:text-primary-500 aria-expanded:text-primary-500 inline-flex cursor-pointer items-center justify-between text-sm font-medium transition-colors focus:outline-none">
                      Color
                      <ChevronDown className="ml-2 h-4 w-4 transition-transform duration-200 group-aria-expanded:rotate-180" />
                    </DropdownMenuTrigger>

                    <Popover
                      className="bg-background-50 border-base-100 z-50 w-56 rounded-xl border p-5 shadow-lg focus:outline-0"
                      placement="bottom end"
                    >
                      <h4 className="text-title-50 mb-4 text-base font-semibold">
                        Color
                      </h4>
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { label: 'Black', bg: 'bg-black' },
                          { label: 'Blue', bg: 'bg-primary-500' },
                          { label: 'White', bg: 'bg-background-50' },
                          {
                            label: 'Green',
                            bg: 'bg-badge-success-background0',
                          },
                          { label: 'Pink', bg: 'bg-pink-400' },
                          { label: 'Yellow', bg: 'bg-yellow-400' },
                          { label: 'Purple', bg: 'bg-purple-500' },
                          { label: 'Gray', bg: 'bg-gray-400' },
                        ].map((c) => (
                          <button
                            key={c.label}
                            onClick={() => setColorSelected(c.label)}
                            className="flex flex-col items-center gap-1.5"
                            aria-pressed={colorSelected === c.label}
                          >
                            <div className="relative h-9 w-9">
                              <div
                                className={`${c.bg} ring-background-soft-400 h-9 w-9 rounded-full ring-1`}
                              />
                              {colorSelected === c.label && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Check
                                    className={`size-4 ${c.label === 'White' ? 'text-text-50' : 'text-white-100'}`}
                                  />
                                </div>
                              )}
                            </div>
                            <span className="text-text-100 text-xs">
                              {c.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </Popover>
                  </MenuTrigger>
                </div>
              </div>

              {/* Size */}
              <div className="hidden items-center gap-2 sm:flex">
                <div className="relative inline-block">
                  <MenuTrigger>
                    <DropdownMenuTrigger className="group text-title-50 hover:text-primary-500 aria-expanded:text-primary-500 inline-flex cursor-pointer items-center justify-between text-sm font-medium transition-colors focus:outline-none">
                      Size
                      <ChevronDown className="ml-2 h-4 w-4 transition-transform duration-200 group-aria-expanded:rotate-180" />
                    </DropdownMenuTrigger>

                    <Popover
                      className="bg-background-50 border-base-100 z-50 w-52 rounded-xl border p-5 shadow-lg outline-0"
                      placement="bottom end"
                    >
                      <h4 className="text-title-50 mb-4 text-base font-semibold">
                        Size
                      </h4>
                      <ul className="space-y-4">
                        {[
                          'Small (S)',
                          'Medium (M)',
                          'Large (L)',
                          'X-Large (XL)',
                          'XX-Large (XXL)',
                        ].map((sz) => (
                          <li key={sz} className="flex items-center gap-3">
                            <Checkbox
                              name="size"
                              size="sm"
                              label={sz}
                              onChange={() => toggleSize(sz)}
                              checked={selectedSizes.has(sz)}
                            />
                          </li>
                        ))}
                      </ul>
                    </Popover>
                  </MenuTrigger>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between py-6 sm:px-7">
            <div>
              <p className="text-text-100 text-base">
                Showing 1-12 of 23 Results
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-text-50 bg-background-soft-100 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium">
                Men
                <Xmark2x className="size-3 shrink-0" />
              </span>
              <span className="text-text-50 bg-background-soft-100 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium">
                Blue
                <Xmark2x className="size-3 shrink-0" />
              </span>
              <span className="text-text-50 bg-background-soft-100 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium">
                Clear all
                <Xmark2x className="size-3 shrink-0" />
              </span>
            </div>
          </div>
        </div>
        <div className="bg-background-soft-100 mt-6 flex min-h-screen items-center justify-center rounded-xl">
          <p className="text-title-50 text-6xl opacity-15">Products</p>
        </div>
      </div>
    </section>
  );
}
