import { Checkbox } from '@/components/core/checkbox';
import { Funnel1, Minus, Plus, Xmark2x } from '@tailgrids/icons';
import { useState } from 'react';

// Type definitions
type FilterSidebarProps = {
  isOpen: boolean;
  toggleSidebar: () => void;
};

type ProductListProps = {
  toggleSidebar: () => void;
};

type SectionKey =
  | 'category'
  | 'availability'
  | 'price'
  | 'brand'
  | 'color'
  | 'size';

type OpenSections = {
  [K in SectionKey]: boolean;
};

const FilterSidebar = ({ isOpen, toggleSidebar }: FilterSidebarProps) => {
  const [openSections, setOpenSections] = useState<OpenSections>({
    category: true,
    availability: true,
    price: true,
    brand: true,
    color: true,
    size: true,
  });

  const toggleSection = (section: SectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const colors = [
    { bg: 'bg-black', ring: 'ring-black', label: 'Black' },
    {
      bg: 'bg-background-50',
      ring: 'ring-background-soft-400',
      label: 'White',
    },
    {
      bg: 'bg-primary-700',
      ring: 'ring-primary-700',
      label: 'primary',
    },
    { bg: 'bg-red-700', ring: 'ring-red-700', label: 'Red' },
    {
      bg: 'bg-green-700',
      ring: 'ring-green-700',
      label: 'Green',
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 transform lg:rounded-xl ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } bg-background-50 z-50 overflow-y-auto px-5 transition-transform duration-300 sm:px-8 lg:static lg:col-span-4 lg:w-auto lg:translate-x-0 xl:col-span-3`}
    >
      <div className="divide-base-50 divide-y">
        {/* Header */}
        <div className="block py-5 lg:hidden lg:py-0">
          <div className="mb-7 flex items-center justify-between">
            <h4 className="text-title-50 text-base font-semibold">Filter By</h4>
            <button
              onClick={toggleSidebar}
              className="text-text-100 bg-background-soft-100 inline-flex h-9 w-9 items-center justify-center rounded-lg"
            >
              <Xmark2x />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:hidden">
            {['Men', 'primary', 'Clear all'].map((item, index) => (
              <span
                key={index}
                className="text-text-50 bg-background-soft-100 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium"
              >
                {item}

                <Xmark2x className="shrink-0 cursor-pointer" />
              </span>
            ))}
          </div>
        </div>
        {/* Product Category */}
        <div className="py-7 lg:pt-0 lg:pb-7">
          <button
            onClick={() => toggleSection('category')}
            className="text-title-50 flex w-full cursor-pointer items-center justify-between text-left text-base font-medium transition"
          >
            Product Category
            {openSections.category ? (
              <Minus className="text-text-50 h-6 w-6" />
            ) : (
              <Plus className="text-text-50 h-6 w-6" />
            )}
          </button>
          {openSections.category && (
            <ul className="mt-5 space-y-3">
              {['Mens', 'Women', 'Kids', 'Shoes', 'Accessories'].map(
                (item, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <div className="flex grow items-center gap-3">
                      <Checkbox
                        name="category"
                        type="checkbox"
                        defaultChecked={item === 'Shoes'}
                        label={item}
                        size="sm"
                      />
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
        {/* Availability */}
        <div className="py-7">
          <button
            onClick={() => toggleSection('availability')}
            className="text-title-50 flex w-full cursor-pointer items-center justify-between text-left text-base font-medium transition"
          >
            Availability
            {openSections.availability ? (
              <Minus className="text-text-50 h-6 w-6" />
            ) : (
              <Plus className="text-text-50 h-6 w-6" />
            )}
          </button>
          {openSections.availability && (
            <ul className="mt-5 space-y-3">
              {['In stock', 'Out of stock'].map((item, index) => (
                <li key={index} className="flex items-center justify-between">
                  <div className="flex grow items-center gap-3">
                    <Checkbox
                      name="stock"
                      type="checkbox"
                      label={item}
                      size="sm"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Price */}
        <div className="py-7">
          <button
            onClick={() => toggleSection('price')}
            className="text-title-50 flex w-full cursor-pointer items-center justify-between text-left text-base font-medium transition"
          >
            Price
            {openSections.price ? (
              <Minus className="text-text-50 h-6 w-6" />
            ) : (
              <Plus className="text-text-50 h-6 w-6" />
            )}
          </button>
          {openSections.price && (
            <div className="mt-5">
              <div className="my-6 flex items-center gap-3">
                <div className="flex-1">
                  <div className="bg-background-50 border-base-100 flex items-center rounded-lg border px-3">
                    <span className="text-text-100 pr-2">$</span>
                    <input
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
        {/* Brand */}
        <div className="py-7">
          <button
            onClick={() => toggleSection('brand')}
            className="text-title-50 flex w-full cursor-pointer items-center justify-between text-left text-base font-medium transition"
          >
            Brand
            {openSections.brand ? (
              <Minus className="text-text-50 h-6 w-6" />
            ) : (
              <Plus className="text-text-50 h-6 w-6" />
            )}
          </button>
          {openSections.brand && (
            <ul className="mt-5 space-y-3">
              {['Aymar', 'Angel', 'Burberry', 'Eliza J', 'Sanok'].map(
                (item, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <div className="flex grow items-center gap-3">
                      <Checkbox
                        name="brand"
                        type="checkbox"
                        label={item}
                        size="sm"
                      />
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
        {/* Color */}
        <div className="py-7">
          <button
            onClick={() => toggleSection('color')}
            className="text-title-50 flex w-full cursor-pointer items-center justify-between text-left text-base font-medium transition"
          >
            Color
            {openSections.color ? (
              <Minus className="text-text-50 h-6 w-6" />
            ) : (
              <Plus className="text-text-50 h-6 w-6" />
            )}
          </button>
          {openSections.color && (
            <ul className="mt-5 space-y-3">
              {colors.map((color, index) => (
                <li key={index} className="flex items-center justify-between">
                  <label className="group flex w-full cursor-pointer items-center gap-3 select-none">
                    <Checkbox
                      name="color"
                      type="checkbox"
                      size="sm"
                      className="!w-auto"
                    />
                    <span className="text-text-50 flex items-center text-sm">
                      <span
                        className={`ring-1 ${color.bg} ${color.ring} mr-1 inline-block h-3.5 w-3.5 rounded-full`}
                      ></span>
                      <span>{color.label}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Size */}
        <div className="py-7">
          <button
            onClick={() => toggleSection('size')}
            className="text-title-50 flex w-full cursor-pointer items-center justify-between text-left text-base font-medium transition"
          >
            Size
            {openSections.size ? (
              <Minus className="text-text-50 h-6 w-6" />
            ) : (
              <Plus className="text-text-50 h-6 w-6" />
            )}
          </button>
          {openSections.size && (
            <ul className="mt-5 space-y-3">
              {['XS', 'S', 'M', 'L', 'XL'].map((item, index) => (
                <li key={index} className="flex items-center justify-between">
                  <div className="flex grow items-center gap-3">
                    <Checkbox
                      name="size"
                      type="checkbox"
                      label={item}
                      size="sm"
                    />
                  </div>
                  <span className="text-text-100 text-xs">
                    ({[45, 45, 75, 39, 89][index]})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
};

const ProductList = ({ toggleSidebar }: ProductListProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('Best selling');

  const sortOptions = [
    'Featured',
    'Best selling',
    'Price, Low to high',
    'Price, high to low',
    'Alphabetically, A-Z',
    'Alphabetically, Z-A',
  ];

  return (
    <div className="flex flex-col lg:col-span-8 xl:col-span-9">
      <div className="hidden items-center justify-between pb-4 lg:flex">
        <p className="text-text-100 text-base">Showing 1-12 of 23 Results</p>
        <div className="relative inline-block shrink-0 text-left">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            type="button"
            className="inline-flex cursor-pointer items-center justify-end gap-2 rounded-lg bg-transparent text-sm font-medium focus:outline-none sm:max-w-2xs sm:min-w-60"
          >
            <div className="text-text-100 font-normal">
              Sort By:{' '}
              <span className="text-title-50 font-medium">{selectedSort}</span>
            </div>
            <svg
              className={`h-4 w-4 transform transition-transform ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
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
          {dropdownOpen && (
            <div className="ring-opacity-5 bg-background-50 absolute z-10 mt-2 w-60 origin-top-right rounded-lg shadow-md focus:outline-none">
              <ul className="text-text-50 p-1.5 text-sm">
                {sortOptions.map((option, index) => (
                  <li key={index}>
                    <button
                      onClick={() => {
                        setSelectedSort(option);
                        setDropdownOpen(false);
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
      <div className="hidden flex-wrap items-center gap-3 lg:flex">
        {['Men', 'primary', 'Clear all'].map((item, index) => (
          <span
            key={index}
            className="text-text-50 bg-background-soft-100 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium"
          >
            {item}
            <svg
              className="shrink-0 cursor-pointer"
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9.15408 9.15408C8.86119 9.44697 8.38631 9.44697 8.09342 9.15408L5.99951 7.06017L3.90533 9.15435C3.61244 9.44725 3.13756 9.44725 2.84467 9.15435C2.55178 8.86146 2.55178 8.38659 2.84467 8.09369L4.93885 5.99951L2.84467 3.90533C2.55178 3.61244 2.55178 3.13756 2.84467 2.84467C3.13756 2.55178 3.61244 2.55178 3.90533 2.84467L5.99951 4.93885L8.09342 2.84494C8.38631 2.55205 8.86119 2.55205 9.15408 2.84494C9.44697 3.13784 9.44697 3.61271 9.15408 3.9056L7.06017 5.99951L9.15408 8.09342C9.44697 8.38631 9.44697 8.86119 9.15408 9.15408Z"
                fill="#6B7280"
              />
            </svg>
          </span>
        ))}
      </div>
      <div className="block lg:hidden">
        <div className="border-base-100 flex items-center justify-between rounded-xl border p-5">
          <button
            onClick={toggleSidebar}
            className="text-title-50 border-base-100 flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium"
          >
            <Funnel1 />
            Filter
          </button>
          <div>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="text-title-50 border-base-100 h-10 justify-center rounded-lg border px-3.5 py-2.5 text-sm font-medium"
            >
              <option value="">Sort</option>
              {sortOptions.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-text-100 py-5 text-center text-base">
          Showing 1-12 of 23 Results
        </p>
      </div>
      <div className="bg-background-soft-100 flex h-full flex-1 items-center justify-center rounded-xl p-10 lg:mt-8">
        <p className="text-6xl opacity-15">Products</p>
      </div>
    </div>
  );
};

const Filter2 = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div
            className={`fixed inset-0 z-40 bg-black/50 lg:hidden ${
              sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={() => setSidebarOpen(false)}
          ></div>
          <FilterSidebar
            isOpen={sidebarOpen}
            toggleSidebar={() => setSidebarOpen(false)}
          />
          <ProductList toggleSidebar={() => setSidebarOpen(true)} />
        </div>
      </div>
    </section>
  );
};

export default Filter2;
