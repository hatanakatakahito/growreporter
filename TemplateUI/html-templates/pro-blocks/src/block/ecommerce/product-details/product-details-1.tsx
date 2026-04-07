// Import Swiper React components
import type { Swiper as SwiperType } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';

// Import Swiper styles
import 'swiper/css';

import { Button } from '@/components/core/button';
import {
  Cart2,
  ChevronLeft,
  ChevronRight,
  HalfStarIcon,
  Heart,
  Minus,
  Plus,
  StarIcon,
} from '@tailgrids/icons';
import { useRef, useState } from 'react';
import { Navigation, Thumbs } from 'swiper/modules';

interface ColorOption {
  bg: string;
  ring: string;
  name: string; // Added for accessibility
}

// Interface for size options
interface SizeOption {
  value: number;
  disabled: boolean;
}

// Interface for product details
interface Product {
  brand: string;
  name: string;
  rating: number;
  reviews: number;
  price: number;
  originalPrice: number;
  discount: number;
  description: string;
  materials: string[];
}

// Interface for ProductDetails props
// Removed unused ProductDetailsProps interface

// Default product data
const defaultProduct: Product = {
  brand: 'MAISON NOIR',
  name: 'Structured Wool Blazer',
  rating: 4.5,
  reviews: 1247,
  price: 1250.99,
  originalPrice: 1555.0,
  discount: 25,
  description:
    'This meticulously tailored blazer embodies timeless sophistication. Crafted from premium Italian wool with a smooth hand-feel, it features structured shoulders and a defined waist for an elegant silhouette. The perfect versatile piece to transition effortlessly from boardroom to dinner.',
  materials: [
    '100% virgin wool Back vent ensures ease of movement',
    'Relaxed fit through the shoulders',
    'Silk-blend twill for comfort',
    'Back vent ensures ease of movement',
  ],
}; // Used as product

// Color options
const colorOptions: ColorOption[] = [
  { bg: 'bg-[#DCB2AC]', ring: 'ring-[#DCB2AC]/30', name: 'Rose' },
  { bg: 'bg-black', ring: 'ring-black/30', name: 'Black' },
  { bg: 'bg-[#2E0B4D]', ring: 'ring-[#2E0B4D]/30', name: 'Navy' },
  { bg: 'bg-[#4A7ED2]', ring: 'ring-[#4A7ED2]/30', name: 'Blue' },
  { bg: 'bg-[#8D6682]', ring: 'ring-[#8D6682]/30', name: 'Plum' },
];

// Size options
const sizeOptions: SizeOption[] = [
  { value: 34, disabled: true },
  { value: 36, disabled: false },
  { value: 38, disabled: false },
  { value: 40, disabled: false },
  { value: 42, disabled: false },
  { value: 44, disabled: false },
];

// Interface for slide data
interface Slide {
  src: string;
  alt: string;
}

// Slide data for main and thumbnail sliders
const slides: Slide[] = [
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-01/p-lg-1.jpg',
    alt: 'Structured Wool Blazer - Front View',
  },
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-01/p-lg-2.jpg',
    alt: 'Structured Wool Blazer - Side View',
  },
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-01/p-lg-3.jpg',
    alt: 'Structured Wool Blazer - Back View',
  },
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-01/p-lg-4.jpg',
    alt: 'Structured Wool Blazer - Back View',
  },
];

export default function ProductDetails1() {
  const [activeThumbIndex, setActiveThumbIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState<number>(40);
  const [quantity, setQuantity] = useState<number>(1);

  // Use defaultProduct as product
  const product = defaultProduct;

  // Swiper refs for navigation
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Dummy handlers for demo (remove errors)
  const onAddToCart = (qty: number) => {
    alert(`Added ${qty} item(s) to cart.`);
  };
  const onAddToWishlist = () => {
    alert('Added to wishlist.');
  };

  const handleColorSelect = (index: number): void => {
    setSelectedColor(index);
  };

  const handleSizeSelect = (size: SizeOption): void => {
    if (!size.disabled) {
      setSelectedSize(size.value);
    }
  };

  const handleQuantityChange = (delta: number): void => {
    setQuantity((prev) => {
      const newQuantity = prev + delta;
      return newQuantity < 1 ? 1 : newQuantity > 99 ? 99 : newQuantity; // Limit quantity between 1 and 99
    });
  };

  const handleAddToCart = (): void => {
    if (quantity < 1) {
      alert('Quantity must be at least 1');
      return;
    }
    onAddToCart(quantity);
  };
  // Calculate number of full and half stars
  const fullStars = Math.floor(product.rating);
  const hasHalfStar = product.rating % 1 >= 0.5;

  // store thumbs swiper instance
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);

  return (
    <section className="bg-background-50 px-4 sm:px-12">
      <div className="mx-auto flex max-w-[1440px] flex-col xl:flex-row">
        <div className="py-10 xl:w-1/2 xl:py-28 xl:pr-5">
          <div className="relative">
            <Swiper
              modules={[Thumbs, Navigation]}
              thumbs={{ swiper: thumbsSwiper }}
              slidesPerView={1}
              navigation={{
                prevEl: prevRef.current,
                nextEl: nextRef.current,
              }}
              onBeforeInit={(swiper) => {
                if (typeof swiper.params.navigation !== 'boolean') {
                  if (swiper.params.navigation) {
                    swiper.params.navigation.prevEl = prevRef.current;
                    swiper.params.navigation.nextEl = nextRef.current;
                  }
                }
              }}
              onSlideChange={(swiper) =>
                setActiveThumbIndex(swiper.activeIndex)
              }
            >
              {slides.map((slide, index) => (
                <SwiperSlide key={index}>
                  <div className="border-base-100 relative overflow-hidden rounded-xl border">
                    <img
                      src={slide.src}
                      className="h-[328px] w-full rounded-xl object-cover transition-transform duration-500 ease-in-out sm:h-[749px]"
                      alt={slide.alt}
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                </SwiperSlide>
              ))}
              {/* <!-- Prev Button --> */}
              <button
                ref={prevRef}
                className="text-title-50 bg-background-50 border-base-200 hover:bg-background-soft-50 absolute top-1/2 left-2 z-20 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft />
              </button>

              {/* <!-- Next Button --> */}
              <button
                ref={nextRef}
                className="text-title-50 bg-background-50 border-base-200 hover:bg-background-soft-50 absolute top-1/2 right-2 z-20 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight />
              </button>
            </Swiper>
            {/* Thumbnail Slider */}
            <Swiper
              modules={[Thumbs]}
              watchSlidesProgress
              onSwiper={setThumbsSwiper}
              spaceBetween={24}
              slidesPerView={4}
              breakpoints={{
                640: {
                  spaceBetween: 16,
                },
                1024: {
                  spaceBetween: 24,
                },
              }}
            >
              {slides.map((slide, index) => (
                <SwiperSlide key={index}>
                  <div
                    className={`relative mt-6 cursor-pointer overflow-hidden rounded-xl border transition-all duration-300 ${
                      activeThumbIndex === index
                        ? 'border-primary-500 ring-primary-500/30 ring-2'
                        : 'border-base-100 hover:border-base-200'
                    }`}
                  >
                    <img
                      src={slide.src}
                      className="w-full rounded-xl object-cover transition-opacity duration-300 lg:h-[160px]"
                      alt={`Thumbnail: ${slide.alt}`}
                      loading="lazy"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
        <div className="bg-background-50 py-10 xl:w-5/12 xl:py-28 xl:pl-8">
          <div className="space-y-8 pb-10">
            {/* Info */}
            <div>
              <span className="text-text-100 mb-2 uppercase">
                {product.brand}
              </span>
              <h3 className="text-title-50 mb-2.5 text-3xl font-semibold sm:text-4xl sm:leading-10">
                {product.name}
              </h3>
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-0.5"
                  aria-label={`Rating: ${product.rating} out of 5`}
                >
                  {[...Array(fullStars)].map((_, index) => (
                    <StarIcon
                      key={index}
                      className="size-3.5 text-yellow-400"
                    />
                  ))}
                  {hasHalfStar && (
                    <HalfStarIcon className="size-3.5 text-yellow-400" />
                  )}
                </div>
                <p>
                  {product.rating} ({product.reviews.toLocaleString()} reviews)
                </p>
              </div>
              <div className="my-5 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-title-50 text-2xl font-bold">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="text-text-100 text-base font-normal -tracking-wide line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                </div>
                <span className="text-badge-success-text bg-badge-success-background inline-block rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                  {product.discount}% OFF
                </span>
              </div>
            </div>

            {/* Color */}
            <div>
              <label
                className="text-title-50 mb-4 block text-base font-medium"
                htmlFor="color-select"
              >
                Color
              </label>
              <div
                className="flex items-center gap-2"
                role="radiogroup"
                id="color-select"
              >
                {colorOptions.map((color, index) => (
                  <button
                    key={index}
                    className={`relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-white transition-all duration-200 ${
                      color.bg
                    } ${
                      selectedColor === index ? color.ring : 'ring-transparent'
                    }`}
                    onClick={() => handleColorSelect(index)}
                    aria-checked={selectedColor === index}
                    role="radio"
                    title={color.name}
                  >
                    {selectedColor === index && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          aria-hidden="true"
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
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="space-y-4">
              <label
                className="text-title-50 mb-4 block text-base font-medium"
                htmlFor="size-select"
              >
                Size
              </label>
              <div
                className="flex flex-wrap gap-3"
                role="radiogroup"
                id="size-select"
              >
                {sizeOptions.map((size, index) => (
                  <div key={index} className="relative">
                    <button
                      className={`h-9 w-12 overflow-hidden rounded-lg border text-sm font-medium transition focus:outline-none ${
                        size.disabled
                          ? 'bg-background-50 border-base-100 text-text-50 cursor-not-allowed'
                          : selectedSize === size.value
                            ? 'border-primary-500 bg-primary-500/5 text-primary-500'
                            : 'text-text-50 bg-background-50 border-base-100'
                      }`}
                      onClick={() => handleSizeSelect(size)}
                      disabled={size.disabled}
                      aria-checked={selectedSize === size.value}
                      role="radio"
                    >
                      {size.value}
                      {size.disabled && (
                        <div className="pointer-events-none absolute inset-0 h-full w-full">
                          <svg
                            className="text-text-300 h-full w-full"
                            width="41"
                            height="31"
                            viewBox="0 0 41 31"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <line
                              x1="0.3"
                              y1="0.6"
                              x2="40.3"
                              y2="30.6"
                              stroke="currentColor"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <h4 className="text-title-50 mb-4 text-base font-medium">
                Quantity:
              </h4>
              <div className="border-base-100 divide-base-100 flex h-10 w-[130px] divide-x overflow-hidden rounded-lg border">
                <button
                  className="hover:bg-background-soft-100 text-text-50 flex h-10 w-10 items-center justify-center transition"
                  onClick={() => handleQuantityChange(-1)}
                  aria-label="Decrease quantity"
                >
                  <Minus />
                </button>
                <div
                  className="text-text-50 flex flex-1 items-center justify-center"
                  aria-live="polite"
                >
                  {quantity}
                </div>
                <button
                  className="hover:bg-background-soft-100 text-text-50 flex h-10 w-10 items-center justify-center transition"
                  onClick={() => handleQuantityChange(1)}
                  aria-label="Increase quantity"
                >
                  <Plus />
                </button>
              </div>
              <div className="mt-5 flex flex-col gap-4 sm:flex-row">
                <Button
                  className="h-12 grow"
                  onClick={handleAddToCart}
                  aria-label="Add to cart"
                >
                  <Cart2 className="size-5" />
                  Add to Cart
                </Button>
                <Button
                  appearance="outline"
                  className="h-12"
                  onClick={onAddToWishlist}
                  aria-label="Add to wishlist"
                >
                  <span
                    style={{ display: 'inline-flex', verticalAlign: 'middle' }}
                  >
                    <Heart className="size-5" />
                  </span>
                  Wishlist
                </Button>
              </div>
            </div>
          </div>

          {/* About and Materials */}
          <div className="border-base-100 space-y-8 border-t pt-10">
            <div>
              <h4 className="text-title-50 mb-3 text-base font-medium">
                About the Piece
              </h4>
              <p className="text-text-100 leading-6">{product.description}</p>
            </div>
            <div>
              <h4 className="text-title-50 mb-3 text-base font-medium">
                Materials & Fit
              </h4>
              <ul className="list-inside list-disc space-y-1">
                {product.materials.map((item: string, index: number) => (
                  <li key={index} className="text-text-100 text-base">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
