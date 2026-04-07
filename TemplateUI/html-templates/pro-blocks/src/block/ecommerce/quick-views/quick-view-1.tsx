import { Button } from '@/components/core/button';
import {
  Cart2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightSmall,
  HalfStarIcon,
  Heart,
  Minus,
  Plus,
  StarIcon,
  Xmark2x,
} from '@tailgrids/icons';
import { useState } from 'react';
import 'swiper/css';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

export default function QuickView1() {
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState(40);
  const [quantity, setQuantity] = useState(1);

  const images = [
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-01/p-lg-1.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-01/p-lg-2.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-01/p-lg-3.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-01/p-lg-4.jpg',
  ];

  const colors = [
    { bg: 'bg-[#DCB2AC]', ring: 'ring-[#DCB2AC]/30' },
    { bg: 'bg-black', ring: 'ring-black/30' },
    { bg: 'bg-[#2E0B4D]', ring: 'ring-[#2E0B4D]/30' },
    { bg: 'bg-[#4A7ED2]', ring: 'ring-[#4A7ED2]/30' },
    { bg: 'bg-[#8D6682]', ring: 'ring-[#8D6682]/30' },
  ];

  const sizes = [34, 36, 38, 40, 42, 44];

  const decreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  return (
    <section className="bg-background-50">
      <div className="relative mx-auto max-w-250">
        <button className="text-text-100 bg-background-soft-100 hover:bg-background-soft-200 absolute top-7 right-7 z-40 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg [&>svg]:size-6">
          <Xmark2x />
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center">
          {/* Image Slider */}
          <div className="p-4 lg:w-7/12 lg:p-6">
            <div className="grid">
              <div className="relative h-[480px] w-auto min-w-[470px] overflow-hidden rounded-xl sm:h-[698px]">
                <Swiper
                  spaceBetween={10}
                  navigation={{
                    prevEl: '.qv1-prev',
                    nextEl: '.qv1-next',
                  }}
                  modules={[Navigation]}
                  className="h-full w-full"
                >
                  {images.map((img, index) => (
                    <SwiperSlide key={index}>
                      <img
                        src={img}
                        className="h-full w-full rounded-xl object-cover"
                        alt={`Product image ${index + 1}`}
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>

                {/* Prev Button */}
                <button className="qv1-prev hover:text-primary-500 text-title-50 bg-background-50 border-base-200 absolute top-1/2 left-5 z-20 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border">
                  <ChevronLeft className="size-6" />
                </button>

                {/* Next Button */}
                <button className="qv1-next hover:text-primary-500 text-title-50 bg-background-50 border-base-200 absolute top-1/2 right-5 z-20 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border">
                  <ChevronRight className="size-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="p-4 lg:w-5/12 lg:p-6">
            <div className="space-y-8">
              {/* Info */}
              <div>
                <span className="text-text-100 mb-2 text-base uppercase">
                  MAISON NOIR
                </span>
                <h3 className="text-title-50 mb-2.5 text-3xl font-semibold sm:text-4xl sm:leading-10">
                  Structured Wool Blazer
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[...Array(4)].map((_, i) => (
                      <StarIcon key={i} className="size-3.5 text-yellow-400" />
                    ))}
                    <HalfStarIcon className="size-4 text-yellow-400 [clip-path:inset(0_50%_0_0)]" />
                  </div>
                  <p className="text-text-100">45 reviews</p>
                </div>
                <div className="my-5 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-title-50 text-2xl font-bold">
                      $1250.99
                    </span>
                    <span className="text-text-100 text-base font-normal -tracking-wide line-through">
                      $1555.00
                    </span>
                  </div>
                  <span className="text-badge-success-text bg-badge-success-background inline-block rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                    25% OFF
                  </span>
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-title-50 mb-4 block text-base font-medium">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  {colors.map((color, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedColor(index)}
                      className={`relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-white transition-all duration-200 ${
                        color.bg
                      } ${selectedColor === index ? color.ring : 'ring-transparent'}`}
                    >
                      {selectedColor === index && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check
                            className="text-white-100 size-3"
                            strokeWidth={2}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div className="space-y-4">
                <label className="text-title-50 mb-4 block text-base font-medium">
                  Size
                </label>
                <div className="flex flex-wrap gap-3">
                  {sizes.map((size) => (
                    <div key={size} className="relative">
                      <button
                        onClick={() => size !== 34 && setSelectedSize(size)}
                        disabled={size === 34}
                        className={`h-9 w-12 rounded-lg border text-sm font-medium transition focus:outline-none ${
                          size === 34
                            ? 'bg-background-50 border-base-100 text-text-50 relative cursor-not-allowed overflow-hidden'
                            : selectedSize === size
                              ? 'border-primary-500 bg-primary-500/5 text-primary-500 cursor-pointer'
                              : 'text-text-50 bg-background-50 border-base-100 cursor-pointer'
                        }`}
                      >
                        {size}
                        {size === 34 && (
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
                    onClick={decreaseQuantity}
                    className="hover:bg-background-soft-100 text-text-50 flex h-10 w-10 items-center justify-center transition"
                  >
                    <Minus className="text-text-100 size-5" />
                  </button>
                  <div className="text-text-50 flex flex-1 items-center justify-center">
                    {quantity}
                  </div>
                  <button
                    onClick={increaseQuantity}
                    className="hover:bg-background-soft-100 text-text-50 flex h-10 w-10 items-center justify-center transition"
                  >
                    <Plus className="text-text-100 size-5" />
                  </button>
                </div>

                <div className="mt-5 flex flex-col gap-4 sm:flex-row">
                  <Button className="h-12 w-full grow sm:w-auto">
                    <Cart2 className="size-5" />
                    Add to Cart
                  </Button>
                  <Button
                    appearance="outline"
                    className="h-12 w-full sm:w-auto"
                  >
                    <Heart className="size-6" />
                    Wishlist
                  </Button>
                </div>
              </div>

              <div>
                <a
                  href="javascript:void(0)"
                  className="text-title-50 flex items-center gap-2 text-base font-medium"
                >
                  View Full Product Details
                  <ChevronRightSmall className="size-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
