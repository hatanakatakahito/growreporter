import { Button } from '@/components/core/button';
import {
  ArrowBothDirectionHorizontal2,
  Cart2,
  Check,
  Heart,
  Minus,
  Plus,
  QuestionMarkCircle,
  Ruler4,
} from '@tailgrids/icons';
import { useRef, useState } from 'react';
import type { Swiper as SwiperType } from 'swiper';
import { Navigation, Thumbs } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
//@ts-ignore
import 'swiper/css';
//@ts-ignore
import 'swiper/css/navigation';

export default function ProductDetails5() {
  const images = [
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-05/p-lg-1.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-05/p-lg-2.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-05/p-lg-3.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-05/p-lg-4.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-05/p-lg-5.jpg',
  ];
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const [activeImage, setActiveImage] = useState(0);

  const colorSwatches = [
    { bg: 'bg-[#1F295B]', ring: 'ring-[#1F295B]/30' },
    { bg: 'bg-[#000]', ring: 'ring-[#000]/30' },
    { bg: 'bg-[#523320]', ring: 'ring-[#523320]/30' },
    { bg: 'bg-[#9C9C9C]', ring: 'ring-[#9C9C9C]/30' },
    { bg: 'bg-[#2C442D]', ring: 'ring-[#2C442D]/30' },
  ];
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState<number | null>(40);
  const sizes = [36, 38, 40, 42, 44];
  const [quantity, setQuantity] = useState(1);
  return (
    <section className="bg-background-50 px-4">
      <div className="mx-auto flex max-w-[1440px] flex-col xl:flex-row">
        <div className="bg-background-soft-100 min-w-0 xl:w-7/12">
          <div className="px-4 py-10 sm:px-12 sm:py-12">
            {/* <!-- Slider Wrapper --> */}
            <div className="relative overflow-hidden rounded-xl">
              <Swiper
                modules={[Navigation, Thumbs]}
                thumbs={{ swiper: thumbsSwiper }}
                onSlideChange={(swiper) => setActiveImage(swiper.activeIndex)}
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
                className="w-full rounded-xl"
              >
                {images.map((img, index) => (
                  <SwiperSlide key={index}>
                    <img
                      src={img}
                      className="h-[328px] w-full object-cover sm:h-[749px]"
                      alt={`Slider image ${index}`}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* <!-- Prev Button --> */}
              <button
                ref={prevRef}
                className="text-title-50 bg-background-50 border-base-200 absolute top-1/2 left-2 z-20 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M15.25 6L9 12.25L15.25 18.5"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* <!-- Next Button --> */}
              <button
                ref={nextRef}
                className="text-title-50 bg-background-50 border-base-200 absolute top-1/2 right-2 z-20 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M8.75 19L15 12.75L8.75 6.5"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* <!-- Thumbnails --> */}
            <div className="mt-6">
              <Swiper
                onSwiper={setThumbsSwiper}
                modules={[Thumbs]}
                watchSlidesProgress
                spaceBetween={12}
                slidesPerView={5}
                breakpoints={{
                  640: {
                    spaceBetween: 24,
                  },
                }}
              >
                {images.map((img, index) => (
                  <SwiperSlide key={index}>
                    <div
                      className={`h-14 w-full cursor-pointer overflow-hidden rounded-xl transition sm:h-30 ${
                        activeImage === index ? 'opacity-100' : 'opacity-50'
                      }`}
                    >
                      <img
                        src={img.replace('/830x613', '/76x58')}
                        className="h-full w-full object-cover"
                        alt={`Thumbnail ${index}`}
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        </div>
        <div className="xl:w-5/12">
          <div className="bg-background-50 px-4 py-14 sm:px-12 sm:py-28">
            <div>
              <p className="text-text-100 text-base font-medium">
                Premium Collection
              </p>
              <h3 className="text-title-50 mb-3 inline-block text-3xl font-semibold sm:leading-9">
                Air Mesh Performance Sneaker
              </h3>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-title-50 text-2xl font-semibold">
                    $169.99
                  </span>
                  <span className="text-text-100 text-2xl font-medium -tracking-wide line-through">
                    $220.00
                  </span>
                </div>
                <span className="text-badge-success-text bg-badge-success-background inline-block rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                  Saving 20%
                </span>
              </div>
              <p className="text-text-100 text-base leading-6">
                Crafted with premium materials and innovative cushioning
                technology, these limited edition high-tops deliver exceptional
                comfort and style. Features a breathable knit upper, responsive
                midsole, and signature traction pattern.
              </p>
              <div className="my-11 space-y-9">
                {/* Color */}
                <div>
                  <label className="text-title-50 mb-4 block text-base font-medium">
                    Color
                  </label>
                  <div className="flex items-center space-x-3">
                    {colorSwatches.map((color, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedColor(index)}
                        className={`relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-all duration-200 ${color.bg} ${
                          selectedColor === index
                            ? `ring-2 ring-offset-2 ring-offset-white ${color.ring}`
                            : 'ring-0'
                        }`}
                        aria-selected={selectedColor === index}
                      >
                        {selectedColor === index && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="text-white-100" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {/* <!-- Size --> */}
                <div className="space-y-4">
                  <label className="text-title-50 mb-4 block text-base font-medium">
                    Size
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {/* Disabled Option */}
                    <div className="relative">
                      <button
                        className="bg-background-50 border-base-100 text-text-50 relative h-9 w-12 cursor-not-allowed overflow-hidden rounded-lg border text-sm font-medium"
                        disabled
                      >
                        34
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
                      </button>
                    </div>

                    {/* <!-- Active Options --> */}
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`h-9 w-12 cursor-pointer overflow-hidden rounded-lg border text-sm font-medium transition focus:outline-none ${
                          selectedSize === size
                            ? 'border-primary-500 bg-primary-500/5 text-primary-500'
                            : 'text-text-50 bg-background-50 border-base-100'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-title-50 mb-5 text-sm font-medium">
                    Hurry up! Only 
                    <span className="ml-1 inline-block text-red-500">
                      20 item(s)
                    </span>{' '}
                    left in stock
                  </p>
                  <div className="flex gap-4">
                    {/* Quantity */}
                    <div className="border-base-100 divide-base-100 flex h-12 w-[130px] divide-x overflow-hidden rounded-lg border">
                      {/* <!-- Minus Button --> */}
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="hover:bg-background-soft-100 text-text-50 flex h-12 w-10 items-center justify-center transition"
                      >
                        <Minus className="size-5" />
                      </button>

                      {/* <!-- Input --> */}
                      <div className="text-text-50 flex flex-1 items-center justify-center">
                        {quantity}
                      </div>

                      {/* <!-- Plus Button --> */}
                      <button
                        onClick={() => setQuantity((q) => q + 1)}
                        className="hover:bg-background-soft-100 text-text-50 flex h-12 w-10 items-center justify-center transition"
                      >
                        <Plus className="size-5" />
                      </button>
                    </div>
                    <div>
                      <div className="flex flex-wrap gap-4 sm:flex-row">
                        <Button className="h-12 shrink-0">
                          <Cart2 className="size-6" />
                          Add to Cart
                        </Button>
                        <Button
                          iconOnly
                          appearance="outline"
                          className="h-12 shrink-0"
                        >
                          <Heart className="size-6" />
                        </Button>
                        <Button
                          iconOnly
                          appearance="outline"
                          className="h-12 shrink-0"
                        >
                          <ArrowBothDirectionHorizontal2 className="size-6" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-base-100 border-t pt-11">
                <h4 className="text-title-50 mb-5 text-base font-medium">
                  Key features
                </h4>
                <ul className="text-text-100 list-inside list-disc text-base">
                  <li>
                    Responsive Pro cushioning with 20% more energy return than
                    standard
                  </li>
                  <li>
                    Breathable knit upper with reinforced support zones for
                    dynamic movement
                  </li>
                  <li>
                    Signature outsole pattern with multi-directional traction
                    for enhanced grip
                  </li>
                  <li>
                    Reflective details for increased visibility in low-light
                    conditions
                  </li>
                </ul>
              </div>
              <div className="border-base-100 border-b py-6">
                <ul className="text-text-100 grid grid-cols-2 gap-3.5">
                  <li>
                    <p className="text-xs">Collar</p>
                    <p className="text-base">Padded Textile</p>
                  </li>
                  <li>
                    <p className="text-xs">Midsole</p>
                    <p className="text-base">Midsole Responsive Pro Foam</p>
                  </li>
                  <li>
                    <p className="text-xs">Upper</p>
                    <p className="text-base">Premium Engineered Knit</p>
                  </li>
                  <li>
                    <p className="text-xs">Outsole</p>
                    <p className="text-base">High-Abrasion Rubber</p>
                  </li>
                </ul>
              </div>
              <div className="flex items-center justify-between pt-6">
                <p className="text-text-100 text-base">SKU: EP-HT22-BL-9</p>
                <ul className="flex items-center gap-5">
                  <li className="text-text-100 flex items-center gap-1 text-base">
                    <QuestionMarkCircle className="size-5" />
                    Ask a Question
                  </li>
                  <li className="text-text-100 flex items-center gap-1 text-base">
                    <Ruler4 className="size-5" />
                    Size Guide
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
