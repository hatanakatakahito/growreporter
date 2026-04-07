import { Checkbox } from '@/components/core/checkbox';
import { ChevronDown, Funnel1, Minus, Plus, Xmark2x } from '@tailgrids/icons';
import { useEffect, useRef, useState } from 'react';

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

interface FilterSidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  isOpen,
  toggleSidebar,
}) => {
  const [openSections, setOpenSections] = useState({
    color: true,
    price: true,
    size: true,
    rating: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
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
      bg: 'bg-blue-700',
      ring: 'ring-blue-700',
      label: 'Blue',
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
      className={`fixed top-0 right-0 h-full w-72 transform lg:rounded-xl ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } bg-background-soft-50 z-40 overflow-y-auto px-6 transition-transform duration-300 lg:static lg:col-span-4 lg:w-auto lg:translate-x-0 xl:col-span-3`}
    >
      <div className="divide-base-50 divide-y">
        {/* Header */}
        <div className="w-full py-7">
          <div className="mb-7 flex items-center justify-between lg:hidden">
            <h4 className="text-title-50 text-base font-semibold">Filter By</h4>
            <button
              onClick={toggleSidebar}
              className="text-text-100 bg-background-soft-100 inline-flex h-9 w-9 items-center justify-center rounded-lg"
            >
              <Xmark2x />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {['Blue', 'Size M', 'Clear all'].map((item, index) => (
              <span
                key={index}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium ${
                  item === 'Clear all'
                    ? 'text-text-50 bg-background-soft-100'
                    : 'bg-primary-100 text-primary-500'
                }`}
              >
                {item}
                <Xmark2x className="size-3 shrink-0 cursor-pointer" />
              </span>
            ))}
          </div>
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
                    <span className="text-text-100 flex items-center text-sm">
                      <span
                        className={`ring-1 ${color.bg} ${color.ring} mr-1 inline-block h-3.5 w-3.5 rounded-full`}
                      ></span>
                      {color.label}
                    </span>
                  </label>
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
                      size="sm"
                      label={item}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Rating */}
        <div className="py-7">
          <button
            onClick={() => toggleSection('rating')}
            className="text-title-50 flex w-full cursor-pointer items-center justify-between text-left text-base font-medium transition"
          >
            Rating
            {openSections.rating ? (
              <Minus className="text-text-50 h-6 w-6" />
            ) : (
              <Plus className="text-text-50 h-6 w-6" />
            )}
          </button>
          {openSections.rating && (
            <ul className="mt-5 space-y-3">
              {[{ stars: 5 }, { stars: 4 }, { stars: 3 }, { stars: 2 }].map(
                ({ stars }, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <label className="group flex w-full cursor-pointer items-center gap-3 select-none">
                      <Checkbox
                        name="rating"
                        type="checkbox"
                        size="sm"
                        className="!w-auto"
                      />
                      <span className="text-text-50 inline-flex items-center gap-1 text-sm">
                        <div className="flex items-center">
                          {Array(stars)
                            .fill(0)
                            .map((_, i) => (
                              <StarIcon key={i} />
                            ))}
                          {stars < 5 && <HalfStarIcon />}
                        </div>
                        &nbsp;up
                      </span>
                    </label>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
};

interface ProductListProps {
  toggleSidebar: () => void;
}

const ProductList: React.FC<ProductListProps> = ({ toggleSidebar }) => {
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [selectedShow, setSelectedShow] = useState<number>(10);
  const [selectedSort, setSelectedSort] = useState<string>('Featured');

  const showRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const showOptions: number[] = [10, 20, 30, 40, 50, 60];
  const sortOptions: string[] = [
    'Featured',
    'Best selling',
    'Price, Low to high',
    'Price, high to low',
    'Alphabetically, A-Z',
    'Alphabetically, Z-A',
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showRef.current && !showRef.current.contains(event.target as Node)) {
        setShowDropdownOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col space-y-6 lg:col-span-8 xl:col-span-9">
      <div className="bg-background-soft-50 col-span-full flex justify-between gap-5 rounded-lg p-6 lg:items-center">
        <div className="hidden sm:block">
          <p className="text-title-50 text-base font-medium">
            Mens T-shirt (245)
          </p>
        </div>
        <div className="block sm:hidden">
          <button
            onClick={toggleSidebar}
            className="text-title-50 bg-background-50 border-base-200 hover:bg-background-soft-50 inline-flex h-10 cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm font-medium shadow-sm focus:outline-none"
          >
            <Funnel1 className="size-5" />
            Filter
          </button>
        </div>
        <div className="flex gap-7">
          <div
            className="relative inline-flex items-center gap-2"
            ref={showRef}
          >
            <span className="text-text-100 text-sm font-normal">Show</span>
            <div className="relative inline-block">
              <button
                onClick={() => setShowDropdownOpen(!showDropdownOpen)}
                className="text-title-50 bg-background-50 border-base-200 hover:bg-background-soft-50 inline-flex h-10 cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm font-medium shadow-sm focus:outline-none sm:max-w-20 sm:min-w-20"
              >
                {selectedShow}

                <ChevronDown
                  className={`ml-2 h-4 w-4 transform transition-transform ${
                    showDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {showDropdownOpen && (
                <div className="ring-opacity-5 bg-background-50 absolute z-50 mt-2 w-20 origin-top-right rounded-lg shadow-md focus:outline-none">
                  <ul className="text-text-50 p-1.5 text-sm">
                    {showOptions.map((value, index) => (
                      <li key={index}>
                        <button
                          onClick={() => {
                            setSelectedShow(value);
                            setShowDropdownOpen(false);
                          }}
                          className="hover:text-title-50 text-text-100 hover:bg-background-soft-100 block w-full cursor-pointer rounded-lg px-4 py-2 text-left"
                        >
                          {value}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex" ref={sortRef}>
            <span className="text-text-100 text-sm font-normal">Sort by</span>
            <div className="relative inline-block">
              <button
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className="text-title-50 bg-background-50 border-base-200 hover:bg-background-soft-50 inline-flex h-10 min-w-26 cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm font-medium shadow-sm focus:outline-none"
              >
                {selectedSort}
                <ChevronDown
                  className={`ml-2 h-4 w-4 transform transition-transform ${
                    sortDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {sortDropdownOpen && (
                <div className="bg-background-50 absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-lg shadow-md focus:outline-none">
                  <ul className="text-text-50 p-1.5 text-sm">
                    {sortOptions.map((option, index) => (
                      <li key={index}>
                        <button
                          onClick={() => {
                            setSelectedSort(option);
                            setSortDropdownOpen(false);
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
        </div>
      </div>
      <div className="bg-background-soft-100 flex min-h-screen flex-1 items-center justify-center rounded-xl p-20">
        <p className="text-title-50 text-6xl opacity-15">Products</p>
      </div>
    </div>
  );
};

const Filter4: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div
            className={`fixed inset-0 z-30 bg-black/50 lg:hidden ${
              sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={() => setSidebarOpen(false)}
          ></div>

          <ProductList toggleSidebar={() => setSidebarOpen(true)} />
          <FilterSidebar
            isOpen={sidebarOpen}
            toggleSidebar={() => setSidebarOpen(false)}
          />
        </div>
      </div>
    </section>
  );
};

export default Filter4;
