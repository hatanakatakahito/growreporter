import { Checkbox } from '@/components/core/checkbox';
import { Column, Funnel1, Layout5, Row, Xmark2x } from '@tailgrids/icons';
import { useState } from 'react';

// Type definitions for filter data
type ColorItem = {
  bg: string;
  ring: string;
};

type RatingItem = {
  stars: number;
  count: number;
};

type FilterDataType = {
  colors: ColorItem[];
  categories: string[];
  availability: string[];
  sizes: string[];
  ratings: RatingItem[];
  sortOptions: string[];
};

// Data objects for filters
const filterData: FilterDataType = {
  colors: [
    { bg: 'bg-[#DCB2AC]', ring: 'ring-[#DCB2AC]/30' },
    { bg: 'bg-[#000]', ring: 'ring-[#000]/30' },
    { bg: 'bg-[#2E0B4D]', ring: 'ring-[#2E0B4D]/30' },
    { bg: 'bg-[#4A7ED2]', ring: 'ring-[#4A7ED2]/30' },
    { bg: 'bg-[#D24A4A]', ring: 'ring-[#D24A4A]/30' },
    { bg: 'bg-[#8D6682]', ring: 'ring-[#8D6682]/30' },
  ],

  categories: [
    'Tops (124)',
    'Bottoms (78)',
    'Outerwear (104)',
    'Footwear (35)',
    'Accessories (517)',
  ],

  availability: ['In stock (459)', 'Out of stock (78)'],

  sizes: ['XS (45)', 'S (45)', 'M (75)', 'L (39)', 'XL (89)'],

  ratings: [
    { stars: 5, count: 12 },
    { stars: 4, count: 21 },
    { stars: 3, count: 14 },
    { stars: 2, count: 7 },
    { stars: 1, count: 2 },
  ],

  sortOptions: [
    'Featured',
    'Best selling',
    'Price, Low to high',
    'Price, high to low',
    'Alphabetically, A-Z',
    'Alphabetically, Z-A',
  ],
};

const StarIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path
        d="M6.99998 0.900391C7.22809 0.900491 7.43694 1.02992 7.53807 1.23438L9.18553 4.57227L12.8691 5.10742C13.0949 5.14028 13.2828 5.29969 13.3535 5.5166C13.4238 5.73361 13.3645 5.97156 13.2012 6.13086L10.5351 8.72852L11.165 12.3984C11.2036 12.6234 11.1113 12.8511 10.9267 12.9854C10.7421 13.1195 10.497 13.1373 10.2949 13.0313L6.99998 11.2988L3.70506 13.0313C3.50299 13.1375 3.25796 13.1194 3.07322 12.9854C2.88872 12.8511 2.79543 12.6234 2.83396 12.3984L3.46287 8.72852L0.797831 6.13086C0.634806 5.97153 0.576135 5.73347 0.646464 5.5166C0.717125 5.29962 0.905007 5.14028 1.13084 5.10742L4.81346 4.57227L6.46189 1.23438L6.50486 1.16113C6.61563 0.999486 6.80044 0.900449 6.99998 0.900391Z"
        fill="#FACC15"
      />
    </svg>
  );
};

const HalfStarIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="7"
      height="14"
      viewBox="0 0 7 14"
      fill="none"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M6.99998 0.900391C6.80044 0.900449 6.61563 0.999486 6.50486 1.16113L6.46189 1.23438L4.81346 4.57227L1.13084 5.10742C0.905007 5.14028 0.717125 5.29962 0.646464 5.5166C0.576135 5.73347 0.634806 5.97153 0.797831 6.13086L3.46287 8.72852L2.83396 12.3984C2.79543 12.6234 2.88872 12.8511 3.07322 12.9854C3.25796 13.1194 3.50299 13.1375 3.70506 13.0313L6.99998 11.2988V0.900391Z"
        fill="#FACC15"
      />
    </svg>
  );
};

type FilterSidebarProps = {
  isOpen: boolean;
  toggleSidebar: () => void;
};

type ProductListProps = {
  toggleSidebar: () => void;
};

const FilterSidebar = ({ isOpen, toggleSidebar }: FilterSidebarProps) => {
  const [selectedColor, setSelectedColor] = useState(0);
  const [price, setPrice] = useState(1278);

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 transform lg:rounded-xl ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } bg-background-50 z-50 overflow-y-auto px-5 transition-transform duration-300 sm:px-8 lg:static lg:col-span-4 lg:w-auto lg:translate-x-0 xl:col-span-3`}
    >
      <div className="divide-base-50 divide-y">
        {/* Header */}
        <div className="flex items-center justify-between py-8">
          <h4 className="text-title-50 text-base font-semibold">Filter By</h4>
          <button className="text-primary-500 hidden text-sm font-semibold sm:block">
            Clear All
          </button>
          <button
            onClick={toggleSidebar}
            className="text-text-100 bg-background-soft-100 inline-flex h-9 w-9 items-center justify-center rounded-lg sm:hidden"
          >
            <Xmark2x />
          </button>
        </div>
        {/* Category */}
        <div className="py-8">
          <h4 className="text-title-50 mb-6 text-base font-medium">Category</h4>
          <ul className="space-y-3">
            {filterData.categories.map((item, index) => (
              <li key={index} className="flex items-center justify-between">
                <div className="flex grow items-center gap-3">
                  <Checkbox
                    name="category"
                    id={`category-${index}`}
                    type="checkbox"
                    defaultChecked={item.includes('Footwear')}
                    label={item.split(' ')[0]}
                  />
                </div>
                <span className="text-text-100 text-xs">
                  {(() => {
                    const match = item.match(/\d+/);
                    return match ? match[0] : '';
                  })()}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {/* Availability */}
        <div className="py-8">
          <h4 className="text-title-50 mb-6 text-base font-medium">
            Availability
          </h4>
          <ul className="space-y-3">
            {filterData.availability.map((item, index) => (
              <li key={index} className="flex items-center justify-between">
                <div className="flex grow items-center gap-3">
                  <Checkbox
                    name="stock"
                    id={`availability-${index}`}
                    type="checkbox"
                    label={item.split(' ')[0]}
                  />
                </div>
                <span className="text-text-100 text-xs">
                  {(() => {
                    const match = item.match(/\d+/);
                    return match ? match[0] : '';
                  })()}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {/* Price Range */}
        <div className="py-8">
          <h4 className="text-title-50 mb-6 text-base font-medium">
            Price Range
          </h4>
          <div>
            <label className="text-text-50 mb-5 block text-sm">
              The highest price is ${price}.00
            </label>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="2000"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="[&::-moz-range-thumb]:border-primary-600 [&::-moz-range-thumb]:bg-background-50 [&::-webkit-slider-thumb]:bg-background-50 [&::-moz-range-track]:bg-background-soft-100 [&::-webkit-slider-runnable-track]:bg-background-soft-100 w-full cursor-pointer appearance-none bg-transparent focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-150 [&::-moz-range-thumb]:ease-in-out [&::-moz-range-track]:h-2 [&::-moz-range-track]:w-full [&::-moz-range-track]:rounded-full [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:w-full [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:-mt-0.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(37,99,235,1)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:ease-in-out"
              />
            </div>
            <div className="mt-6 flex items-center gap-2">
              <div className="text-title-50 border-base-200 flex-1 rounded-lg border px-4 py-2.5 text-center text-sm font-medium">
                $200.00
              </div>
              <span className="text-text-100">—</span>
              <div className="border-base-200 text-text-50 flex-1 rounded-lg border px-4 py-2.5 text-center text-sm">
                ${price}.00
              </div>
            </div>
          </div>
        </div>
        {/* Color */}
        <div className="py-8">
          <h4 className="text-title-50 mb-6 text-base font-medium">Color</h4>
          <div className="flex items-center gap-3">
            {filterData.colors.map((color, index) => (
              <div
                key={index}
                onClick={() => setSelectedColor(index)}
                className={`relative flex h-5 w-5 cursor-pointer items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-white transition-all duration-200 ${
                  color.bg
                } ${selectedColor === index ? color.ring : 'ring-transparent'}`}
              >
                {selectedColor === index && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M10.0517 3.26953L4.59172 8.72953L1.94922 6.08706"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* Size */}
        <div className="py-8">
          <h4 className="text-title-50 mb-6 text-base font-medium">Size</h4>
          <ul className="space-y-3">
            {filterData.sizes.map((item, index) => (
              <li key={index} className="flex items-center justify-between">
                <div className="flex grow items-center gap-3">
                  <Checkbox
                    name="size"
                    id={`size-${index}`}
                    type="checkbox"
                    label={item.split(' ')[0]}
                  />
                </div>
                <span className="text-text-100 text-xs">
                  {(() => {
                    const match = item.match(/\d+/);
                    return match ? match[0] : '';
                  })()}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {/* Rating */}
        <div className="py-8">
          <h4 className="text-title-50 mb-6 text-base font-medium">Rating</h4>

          <ul className="space-y-3">
            {filterData.ratings.map((rating, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-3"
              >
                {/* Left side */}
                <label
                  htmlFor={`rating-${index}`}
                  className="flex cursor-pointer items-center gap-3"
                >
                  <Checkbox
                    name="rating"
                    id={`rating-${index}`}
                    type="checkbox"
                  />

                  {/* Stars + text */}
                  <div className="text-text-50 flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-0.5">
                      {[...Array(rating.stars)].map((_, i) => (
                        <StarIcon key={i} />
                      ))}
                      {rating.stars < 5 && <HalfStarIcon />}
                    </div>
                    <span>Up</span>
                  </div>
                </label>

                {/* Right side count */}
                <span className="text-text-100 shrink-0 text-xs">
                  ({rating.count})
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
};

const ProductList = ({ toggleSidebar }: ProductListProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('Best selling');
  const [activeTab, setActiveTab] = useState('list');

  return (
    <div className="flex flex-col space-y-7 lg:col-span-8 xl:col-span-9">
      <div className="bg-background-50 flex items-center justify-between rounded-xl p-5">
        <div className="relative inline-block shrink-0 text-left">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            type="button"
            className="text-title-50 bg-background-50 border-base-200 hover:bg-background-soft-50 inline-flex h-10 cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm font-medium shadow-sm focus:outline-none sm:max-w-52 sm:min-w-33"
          >
            <span>{selectedSort}</span>
            <svg
              className={`ml-2 h-4 w-4 transform transition-transform ${
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
            <div className="ring-opacity-5 bg-background-50 absolute z-10 mt-2 w-56 origin-top-right rounded-lg shadow-md focus:outline-none">
              <ul className="text-text-50 p-1.5 text-sm">
                {filterData.sortOptions.map((option, index) => (
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
        <nav className="hidden gap-2 sm:flex">
          {[
            {
              tab: 'list',
              icon: <Row />,
            },
            {
              tab: 'columns',
              icon: <Column />,
            },
            {
              tab: 'grid',
              icon: <Layout5 />,
            },
          ].map(({ tab, icon }, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(tab)}
              className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-primary-100 text-primary-500'
                  : 'text-text-100 bg-transparent'
              }`}
            >
              {icon}
            </button>
          ))}
        </nav>
        <div className="block lg:hidden">
          <button
            onClick={toggleSidebar}
            className="text-title-50 hover:bg-background-soft-50 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-transparent px-3.5 py-2.5 text-sm"
          >
            <Funnel1 />
            Filter
          </button>
        </div>
      </div>
      <div className="bg-background-50 flex flex-1 items-center justify-center rounded-xl p-10">
        <p className="text-6xl opacity-15">Products</p>
      </div>
    </div>
  );
};

export default function Filter1() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <section className="bg-background-soft-100 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
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
}
