import { useState } from 'react';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';

import { Badge } from '@/components/core/badge';
import { Button } from '@/components/core/button';
import {
  ArrowBothDirectionHorizontal2,
  Cart2,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  Xmark,
} from '@tailgrids/icons';

export default function QuickView5() {
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState<number | null>(40);
  const [quantity, setQuantity] = useState(1);

  const images = [
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-05/p-lg-1.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-05/p-lg-2.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-05/p-lg-3.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-05/p-lg-4.jpg',
  ];

  const colorSwatches = [
    { bg: 'bg-[#1F295B]', ring: 'ring-[#1F295B]/30' },
    { bg: 'bg-black', ring: 'ring-black/30' },
    { bg: 'bg-[#523320]', ring: 'ring-[#523320]/30' },
    { bg: 'bg-[#9C9C9C]', ring: 'ring-[#9C9C9C]/30' },
    { bg: 'bg-[#2C442D]', ring: 'ring-[#2C442D]/30' },
  ];

  const sizes = [34, 36, 38, 40, 42, 44, 46];

  return (
    <section className="bg-background-50 relative">
      <div className="mx-auto max-w-[1000px] overflow-hidden">
        <Button
          variant="ghost"
          iconOnly
          size="sm"
          className="absolute top-4 right-4 z-40"
        >
          <Xmark className="size-6" />
        </Button>

        <div className="flex flex-col lg:flex-row">
          {/* Left Column: Swiper */}
          <div className="bg-background-soft-100 flex flex-col p-4 lg:w-7/12 lg:p-6">
            <div className="relative h-full w-full">
              <Swiper
                spaceBetween={10}
                navigation={{
                  prevEl: '.custom-prev',
                  nextEl: '.custom-next',
                }}
                modules={[Navigation]}
                className="bg-background-50 h-full w-full overflow-hidden rounded-xl"
              >
                {images.map((img, index) => (
                  <SwiperSlide key={index}>
                    <div>
                      <img
                        src={img}
                        alt={`Slide ${index}`}
                        className="block h-full w-full object-cover"
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* Custom Navigation Buttons */}
              <button className="custom-prev hover:text-primary-500 text-title-50 bg-background-50 border-base-200 absolute top-1/2 left-4 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-md disabled:opacity-50">
                <ChevronLeft className="size-6" />
              </button>
              <button className="custom-next hover:text-primary-500 text-title-50 bg-background-50 border-base-200 absolute top-1/2 right-4 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-md disabled:opacity-50">
                <ChevronRight className="size-6" />
              </button>
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="p-6 sm:p-10 lg:w-5/12 lg:p-12">
            <p className="text-text-100 mb-2 text-base font-normal">
              Premium Collection
            </p>
            <h2 className="text-title-50 mb-4 text-3xl font-semibold">
              Air Mesh Performance Sneaker
            </h2>

            <div className="mb-6 flex items-center gap-3">
              <span className="text-title-50 text-2xl font-medium">
                $169.00
              </span>
              <span className="text-text-100 text-xl font-medium line-through">
                $220.00
              </span>
              <Badge color="success" className="font-medium">
                Saving 20%
              </Badge>
            </div>

            {/* Color */}
            <div className="mb-6">
              <h3 className="text-title-50 mb-3 text-sm font-medium">Color</h3>
              <div className="flex items-center gap-2">
                {colorSwatches.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedColor(index)}
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full focus:outline-none ${color.bg} ${
                      selectedColor === index
                        ? `ring-background-soft-500 ring-2 ring-offset-2`
                        : ''
                    }`}
                  >
                    {selectedColor === index && (
                      <Check className="text-white-100 size-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="mb-8">
              <h3 className="text-title-50 mb-3 text-sm font-medium">Size</h3>
              <div className="flex flex-wrap gap-2">
                {/* Disabled Example */}
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

            <div className="text-text-100 mb-6 text-sm">
              Hurry up! Only <span className="text-red-500">20 item(s)</span>{' '}
              left in stock
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="border-base-100 divide-base-100 flex h-10 w-[130px] divide-x overflow-hidden rounded-lg border">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="hover:bg-background-soft-100 flex h-10 w-10 items-center justify-center transition"
                  >
                    <Minus className="text-text-100 size-5" />
                  </button>
                  <div className="text-title-50 flex flex-1 items-center justify-center font-medium">
                    {quantity}
                  </div>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="hover:bg-background-soft-100 flex h-10 w-10 items-center justify-center transition"
                  >
                    <Plus className="text-text-100 size-5" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="h-12 grow gap-2">
                  <Cart2 className="size-5" />
                  Add to Cart
                </Button>
                <Button
                  appearance="outline"
                  className="h-12 w-12 shrink-0 px-0"
                >
                  <Heart className="size-5" />
                </Button>
                <Button
                  appearance="outline"
                  className="h-12 w-12 shrink-0 px-0"
                >
                  <ArrowBothDirectionHorizontal2 className="size-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
