import React, { useState } from 'react';
import type { Swiper as SwiperType } from 'swiper';
import { Navigation, Thumbs } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
// Import Swiper styles
//@ts-ignore
import 'swiper/css';
//@ts-ignore
import { Button } from '@/components/core/button';
import {
  Cart2,
  Check,
  Heart,
  Minus,
  Plus,
  SearchPlus,
  Xmark2x,
} from '@tailgrids/icons';

// Interface for image data
interface Image {
  src: string;
  thumbnailSrc: string;
  alt: string;
}

// Interface for color option
interface ColorOption {
  bg: string;
  ring: string;
  name: string;
}

// Interface for size option
interface SizeOption {
  value: string;
  label: string;
}

// Interface for specification
interface Specification {
  label: string;
  value: string;
}

// Interface for product data
interface Product {
  name: string;
  rating: number;
  reviews: number;
  price: number;
  originalPrice: number;
  discount: number;
  description: string;
  images: Image[];
  colors: ColorOption[];
  sizes: SizeOption[];
  specifications: Specification[];
}

// Default product data
const defaultProduct: Product = {
  name: 'Premium Wireless Headphones',
  rating: 4.5,
  reviews: 1247,
  price: 239.0,
  originalPrice: 747.0,
  discount: 25,
  description:
    'Experience crystal-clear audio with our premium wireless headphones featuring advanced noise cancellation, 30-hour battery life, and premium comfort design. Perfect for music lovers, professionals, and anyone who demands the best audio experience.',
  images: [
    {
      src: 'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-02/p-lg-1.jpg',
      thumbnailSrc:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-02/p-lg-1.jpg',
      alt: 'Premium Wireless Headphones - View 1',
    },
    {
      src: 'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-02/p-lg-2.jpg',
      thumbnailSrc:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-02/p-lg-2.jpg',
      alt: 'Premium Wireless Headphones - View 2',
    },
    {
      src: 'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-02/p-lg-3.jpg',
      thumbnailSrc:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-02/p-lg-3.jpg',
      alt: 'Premium Wireless Headphones - View 3',
    },
    {
      src: 'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-02/p-lg-4.jpg',
      thumbnailSrc:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-02/p-lg-4.jpg',
      alt: 'Premium Wireless Headphones - View 4',
    },
    {
      src: 'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-02/p-lg-5.jpg',
      thumbnailSrc:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-02/p-lg-5.jpg',
      alt: 'Premium Wireless Headphones - View 5',
    },
  ],
  colors: [
    { bg: 'bg-[#313131]', ring: 'ring-[#313131]/30', name: 'Dark Gray' },
    { bg: 'bg-[#DCB2AC]', ring: 'ring-[#DCB2AC]/30', name: 'Rose' },
    { bg: 'bg-[#4A7ED2]', ring: 'ring-[#4A7ED2]/30', name: 'Blue' },
    { bg: 'bg-[#555]', ring: 'ring-[#555]/30', name: 'Gray' },
    { bg: 'bg-[#738D66]', ring: 'ring-[#738D66]/30', name: 'Olive' },
  ],
  sizes: [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ],
  specifications: [
    { label: 'Driver Size', value: '40mm Dynamic' },
    { label: 'Frequency Response', value: '20Hz - 20kHz' },
    { label: 'Impedance', value: '32Ω' },
    { label: 'Sensitivity', value: '98dB/mW' },
    { label: 'Battery Life', value: '30 hours' },
    { label: 'Charging Time', value: '2 hours' },
    { label: 'Bluetooth Version', value: '5.0' },
    { label: 'Weight', value: '250g' },
  ],
};

// Interface for component props

// Star Icon component
const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={filled ? 14 : 16}
    height={filled ? 14 : 16}
    viewBox={`0 0 ${filled ? 14 : 16} ${filled ? 14 : 16}`}
    fill="none"
    aria-hidden="true"
  >
    {filled ? (
      <path
        d="M6.99998 0.900391C7.22809 0.900491 7.43694 1.02992 7.53807 1.23438L9.18553 4.57227L12.8691 5.10742C13.0949 5.14028 13.2828 5.29969 13.3535 5.5166C13.4238 5.73361 13.3645 5.97156 13.2012 6.13086L10.5351 8.72852L11.165 12.3984C11.2036 12.6234 11.1113 12.8511 10.9267 12.9854C10.7421 13.1195 10.497 13.1373 10.2949 13.0313L6.99998 11.2988L3.70506 13.0313C3.50299 13.1375 3.25796 13.1194 3.07322 12.9854C2.88872 12.8511 2.79543 12.6234 2.83396 12.3984L3.46287 8.72852L0.797831 6.13086C0.634806 5.97153 0.576135 5.73347 0.646464 5.5166C0.717125 5.29962 0.905007 5.14028 1.13084 5.10742L4.81346 4.57227L6.46189 1.23438L6.50486 1.16113C6.61563 0.999486 6.80044 0.900449 6.99998 0.900391Z"
        fill="#FACC15"
      />
    ) : (
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.99998 1.90039C7.80044 1.90045 7.61563 1.99949 7.50486 2.16113L7.46189 2.23438L5.81346 5.57227L2.13084 6.10742C1.90501 6.14028 1.71712 6.29962 1.64646 6.5166C1.57614 6.73347 1.63481 6.97153 1.79783 7.13086L4.46287 9.72852L3.83396 13.3984C3.79543 13.6234 3.88872 13.8511 4.07322 13.9854C4.25796 14.1194 4.50299 14.1375 4.70506 14.0313L7.99998 12.2988V1.90039Z"
        fill="#FACC15"
      />
    )}
  </svg>
);

const ShieldIcon = ({ ...props }) => {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="29"
      height="28"
      viewBox="0 0 29 28"
      fill="none"
    >
      <path
        d="M6.07178 8.18676C6.07177 7.50195 6.4712 6.88006 7.09397 6.59526L13.7719 3.54133C14.2341 3.32997 14.7654 3.32997 15.2276 3.54133L21.9056 6.59527C22.5283 6.88007 22.9277 7.50193 22.9278 8.18672L22.9278 14.5626C22.9279 16.2022 22.4254 17.8057 21.3948 19.0808C19.5488 21.3648 16.4535 24.7918 14.4999 24.7918C12.5463 24.7918 9.45087 21.3647 7.6049 19.0807C6.57437 17.8057 6.07189 16.2022 6.07187 14.5628L6.07178 8.18676Z"
        fill="#16A34A"
      />
      <path
        d="M17.9728 10.785L13.2923 15.4655L11.0271 13.2003M14.4999 24.7918C16.4535 24.7918 19.5488 21.3648 21.3948 19.0808C22.4254 17.8057 22.9279 16.2022 22.9278 14.5626L22.9278 8.18672C22.9277 7.50193 22.5283 6.88007 21.9056 6.59527L15.2276 3.54133C14.7654 3.32997 14.2341 3.32997 13.7719 3.54133L7.09397 6.59526C6.4712 6.88006 6.07177 7.50195 6.07178 8.18676L6.07187 14.5628C6.07189 16.2022 6.57437 17.8057 7.6049 19.0807C9.45087 21.3647 12.5463 24.7918 14.4999 24.7918Z"
        stroke="white"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};

export default function ProductDetails2() {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [selectedColor, setSelectedColor] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState<string>('small');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Use defaultProduct as product
  const product = defaultProduct;

  // Handler functions
  const onAddToCart = (qty: number) => {
    alert(`Added ${qty} item(s) to cart!`);
  };

  const onPurchase = () => {
    alert('Proceeding to purchase!');
  };

  const onAddToWishlist = () => {
    alert('Added to wishlist!');
  };

  const handleColorSelect = (index: number): void => {
    setSelectedColor(index);
  };

  const handleSizeSelect = (size: string): void => {
    setSelectedSize(size);
  };

  const handleQuantityChange = (delta: number): void => {
    setQuantity((prev) => {
      const newQuantity = prev + delta;
      return newQuantity < 1 ? 1 : newQuantity > 99 ? 99 : newQuantity;
    });
  };

  const handleAddToCart = (): void => {
    if (quantity < 1) {
      alert('Quantity must be at least 1');
      return;
    }
    onAddToCart(quantity);
  };

  // Calculate stars
  const fullStars = Math.floor(product.rating);
  const hasHalfStar = product.rating % 1 >= 0.5;

  return (
    <section className="bg-background-soft-100 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="bg-background-50 mb-8 flex flex-col gap-9 rounded-2xl p-5 lg:flex-row">
          {/* Image Slider */}
          <div className="lg:w-1/2 xl:w-7/12">
            <div className="relative">
              {/* Main Slider */}
              <Swiper
                modules={[Thumbs, Navigation]}
                thumbs={{ swiper: thumbsSwiper }}
                spaceBetween={20}
                slidesPerView={1}
                onSlideChange={(swiper) => setActiveSlide(swiper.activeIndex)}
              >
                {product.images.map((image: Image, index: number) => (
                  <SwiperSlide key={index}>
                    <div className="relative overflow-hidden rounded-xl">
                      <img
                        src={image.src}
                        className="w-full rounded-xl object-cover"
                        alt={image.alt}
                        loading={index === 0 ? 'eager' : 'lazy'}
                      />
                      <div className="absolute top-5 right-4 flex items-center justify-center gap-2">
                        <button
                          className="text-title-50 bg-background-50 border-base-200 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border"
                          onClick={() => setIsLightboxOpen(true)}
                          aria-label="Zoom image"
                        >
                          <SearchPlus />
                        </button>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* Thumbnail Slider */}
              <Swiper
                modules={[Thumbs]}
                watchSlidesProgress
                onSwiper={setThumbsSwiper}
                spaceBetween={20}
                slidesPerView={4}
                breakpoints={{
                  640: {
                    spaceBetween: 20,
                    slidesPerView: 4,
                  },
                  1024: {
                    spaceBetween: 20,
                    slidesPerView: 5,
                  },
                }}
                className="mt-5"
                role="region"
                aria-label="Thumbnail navigation"
              >
                {product.images.map((image: Image, index: number) => (
                  <SwiperSlide key={index}>
                    <div
                      className={`relative cursor-pointer overflow-hidden rounded-xl transition-all duration-200 ${
                        activeSlide === index
                          ? 'border-primary-500 border-2'
                          : 'border-2 border-transparent'
                      }`}
                    >
                      <img
                        src={image.thumbnailSrc}
                        className="w-full rounded-xl object-cover transition-opacity duration-300 lg:h-24"
                        alt={`Thumbnail: ${image.alt}`}
                        loading="lazy"
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>

          {/* Product Details */}
          <div className="lg:w-1/2 lg:p-8 xl:w-5/12">
            <div className="space-y-10">
              <div>
                <h3 className="text-title-50 mb-2.5 text-3xl font-semibold sm:text-4xl sm:leading-10">
                  {product.name}
                </h3>
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center"
                    aria-label={`Rating: ${product.rating} out of 5`}
                  >
                    {[...Array(fullStars)].map((_, index) => (
                      <StarIcon key={index} filled={true} />
                    ))}
                    {hasHalfStar && <StarIcon filled={false} />}
                    {[...Array(5 - fullStars - (hasHalfStar ? 1 : 0))].map(
                      (_, index) => (
                        <StarIcon
                          key={index + fullStars + (hasHalfStar ? 1 : 0)}
                          filled={false}
                        />
                      ),
                    )}
                  </div>
                  <p>
                    {product.rating} ({product.reviews.toLocaleString()}{' '}
                    reviews)
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
                  <span className="bg-badge-error-background text-badge-error-text inline-block rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                    {product.discount}% OFF
                  </span>
                </div>
                <p className="text-text-100 text-base leading-6">
                  {product.description}
                </p>
              </div>
              <div className="space-y-6">
                {/* Color Selector */}
                <div>
                  <h4 className="text-title-50 mb-4 text-base font-medium">
                    Color:
                  </h4>
                  <div
                    className="flex items-center gap-2"
                    role="radiogroup"
                    aria-label="Select color"
                  >
                    {product.colors.map((color: ColorOption, index: number) => (
                      <button
                        key={index}
                        className={`relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-white transition-all duration-200 ${
                          color.bg
                        } ${
                          selectedColor === index
                            ? color.ring
                            : 'ring-transparent'
                        }`}
                        onClick={() => handleColorSelect(index)}
                        aria-checked={selectedColor === index}
                        role="radio"
                        title={color.name}
                      >
                        {selectedColor === index && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Size Selector */}
                <div>
                  <h4 className="text-title-50 mb-4 text-base font-medium">
                    Size:
                  </h4>
                  <div
                    className="flex gap-2"
                    role="radiogroup"
                    aria-label="Select size"
                  >
                    {product.sizes.map((size: SizeOption, index: number) => (
                      <button
                        key={index}
                        className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border px-3.5 py-2 text-sm leading-5 font-medium transition ${
                          selectedSize === size.value
                            ? 'bg-primary-50 text-primary-500 border-primary-500'
                            : 'text-text-50 bg-background-50 hover:bg-background-soft-100 border-base-100'
                        }`}
                        onClick={() => handleSizeSelect(size.value)}
                        aria-checked={selectedSize === size.value}
                        role="radio"
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Quantity Selector */}
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
                </div>
              </div>
              <div>
                <div className="flex gap-4">
                  <Button
                    onClick={onPurchase}
                    aria-label="Purchase now"
                    className="grow"
                  >
                    Purchase Now
                  </Button>
                  <Button
                    iconOnly
                    appearance="outline"
                    size="lg"
                    onClick={handleAddToCart}
                    aria-label="Add to cart"
                  >
                    <Cart2 className="size-5" />
                  </Button>
                  <Button
                    iconOnly
                    appearance="outline"
                    size="lg"
                    onClick={onAddToWishlist}
                    aria-label="Add to wishlist"
                  >
                    <Heart className="size-5" />
                  </Button>
                </div>
                <div className="mt-5">
                  <p className="text-text-100 space-x-1 text-center align-middle text-base -tracking-tight sm:flex-row">
                    <ShieldIcon className="inline size-5 shrink-0" />
                    <span>
                      Secure checkout with encrypted payment processing
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications */}
        <div className="bg-background-50 rounded-2xl px-5 py-6 sm:p-8">
          <h3 className="text-title-50 mb-6 text-3xl font-semibold sm:mb-8">
            Specifications
          </h3>
          <div className="flex flex-col sm:flex-row sm:gap-12">
            <div className="sm:w-1/2">
              <ul className="divide-base-100 space-y-1 divide-y">
                {product.specifications
                  .slice(0, Math.ceil(product.specifications.length / 2))
                  .map((spec: Specification, index: number) => (
                    <li
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-text-50 py-2.5 text-base font-normal">
                        {spec.label}
                      </span>
                      <span className="text-text-50 py-2.5 text-base font-medium">
                        {spec.value}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="sm:w-1/2">
              <ul className="divide-base-100 space-y-1 divide-y">
                {product.specifications
                  .slice(Math.ceil(product.specifications.length / 2))
                  .map((spec: Specification, index: number) => (
                    <li
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-text-50 py-2.5 text-base font-normal">
                        {spec.label}
                      </span>
                      <span className="text-text-50 py-2.5 text-base font-medium">
                        {spec.value}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            className="text-white-100 hover:text-text-300 absolute top-4 right-4 z-10 transition-colors"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close gallery"
          >
            <Xmark2x className="size-10" />
          </button>
          <div className="h-full w-full max-w-5xl">
            <Swiper
              initialSlide={activeSlide}
              modules={[Navigation]}
              navigation
              className="h-full w-full"
              spaceBetween={20}
              slidesPerView={1}
            >
              {product.images.map((image, index) => (
                <SwiperSlide
                  key={index}
                  className="flex items-center justify-center"
                >
                  <div className="flex h-full w-full items-center justify-center">
                    <img
                      src={image.src}
                      className="max-h-full max-w-full object-contain"
                      alt={image.alt}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      )}
    </section>
  );
}
