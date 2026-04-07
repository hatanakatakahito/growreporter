import {
  Bolt1,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExpandSquare4,
  Heart,
  Minus,
  Plus,
  Xmark2x,
} from '@tailgrids/icons';
import { useState } from 'react';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
//@ts-ignore
import 'swiper/css';
//@ts-ignore
import { Button } from '@/components/core/button';
import { cn } from '@/utils/cn';

export default function ProductDetails4() {
  const images = [
    ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-04/p-lg-1.jpg',
    ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-04/p-lg-2.jpg',
    ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-04/p-lg-3.jpg',
    ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-04/p-lg-4.jpg',
  ];

  const [activeImage, setActiveImage] = useState<number>(0);
  const [colorIndex, setColorIndex] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  function prev() {
    setActiveImage((prevIdx) => (prevIdx - 1 + images.length) % images.length);
  }
  function next() {
    setActiveImage((prevIdx) => (prevIdx + 1) % images.length);
  }

  function toggleSection(id: string) {
    setOpenSection((current) => (current === id ? null : id));
  }

  return (
    <section className="bg-background-soft-100 p-8">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 lg:flex-row">
        <div className="bg-background-50 rounded-2xl p-8 lg:w-1/2 xl:w-7/12">
          <div className="grid gap-4 sm:gap-5">
            {/* <!-- Slider Wrapper --> */}
            <div className="relative h-[328px] overflow-hidden rounded-xl sm:h-[690px]">
              {images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  className={cn(
                    'absolute top-0 left-0 h-full w-full rounded-xl object-cover transition-transform duration-500 ease-in-out',
                    index === activeImage
                      ? 'z-10 translate-x-0'
                      : index > activeImage
                        ? 'z-0 translate-x-full'
                        : 'z-0 -translate-x-full',
                  )}
                  alt={`Slider image ${index + 1}`}
                />
              ))}
              <Button
                iconOnly
                appearance="outline"
                className="absolute top-6 right-6 z-20 rounded-full"
                onClick={() => setIsLightboxOpen(true)}
              >
                <ExpandSquare4 />
              </Button>
              {/* <!-- Prev Button --> */}
              <button
                onClick={prev}
                className="text-title-50 bg-background-50 border-base-200 absolute right-18 bottom-4 z-20 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border"
              >
                <ChevronLeft />
              </button>{' '}
              <button
                onClick={next}
                className="text-title-50 bg-background-50 border-base-200 absolute right-4 bottom-4 z-20 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border"
              >
                <ChevronRight />
              </button>
            </div>

            {/* <!-- Thumbnails --> */}
            <div className="grid grid-cols-4 gap-2 sm:gap-5">
              {images.map((img, index) => (
                <div
                  key={index}
                  onClick={() => setActiveImage(index)}
                  className={cn(
                    'cursor-pointer overflow-hidden rounded-lg transition',
                    activeImage === index
                      ? 'border-primary-500 border-2 ring-transparent'
                      : 'border-2 border-transparent',
                  )}
                >
                  <div
                    className="aspect-76/58 w-full rounded-lg"
                    style={{
                      background:
                        activeImage === index
                          ? `url(${img.replace('/830x613', '/76x58')}) lightgray 50% / cover no-repeat`
                          : `linear-gradient(0deg, rgba(0, 0, 0, 0.20) 0%, rgba(0, 0, 0, 0.20) 100%), url(${img.replace('/830x613', '/76x58')}) lightgray 50% / cover no-repeat`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-background-50 relative rounded-2xl p-8 lg:w-1/2 xl:w-5/12">
          <button className="bg-background-50 border-base-200 absolute top-8 right-8 inline-flex h-10 w-10 items-center justify-center rounded-full border">
            <Heart className="text-text-50 size-5" />
          </button>
          <div className="mb-10 space-y-9">
            <div>
              <h3 className="text-title-50 mb-2.5 inline-block text-3xl font-semibold sm:leading-9">
                Azure Wave Retro Shades
              </h3>
              <div className="flex">
                <div className="flex items-center">
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M7.99998 1.90039C7.80044 1.90045 7.61563 1.99949 7.50486 2.16113L7.46189 2.23438L5.81346 5.57227L2.13084 6.10742C1.90501 6.14028 1.71712 6.29962 1.64646 6.5166C1.57614 6.73347 1.63481 6.97153 1.79783 7.13086L4.46287 9.72852L3.83396 13.3984C3.79543 13.6234 3.88872 13.8511 4.07322 13.9854C4.25796 14.1194 4.50299 14.1375 4.70506 14.0313L7.99998 12.2988V1.90039Z"
                      fill="#FACC15"
                    />
                  </svg>
                </div>
                <p>4.5 (1247 reviews)</p>
              </div>
              <div className="my-5 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-title-50 text-2xl font-bold">
                    $42.99
                  </span>
                  <span className="text-text-100 text-base font-normal -tracking-wide line-through">
                    $59.00
                  </span>
                </div>
                <span className="bg-badge-error-background text-badge-error-text inline-block rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                  35% OFF
                </span>
              </div>
              <p className="text-text-100 text-base leading-6">
                Sleek and stylish, the Azure Wave Retro Shades bring a perfect
                mix of vintage vibes and modern edge. Crafted with UV400
                protection.
              </p>
            </div>
            <div>
              <h4 className="text-title-50 mb-4 text-base font-medium">
                Color
              </h4>
              <div className="flex items-center gap-2">
                {[
                  { bg: 'bg-[#313131]', ring: 'ring-[#313131]/30' },
                  { bg: 'bg-[#DCB2AC]', ring: 'ring-[#DCB2AC]/30' },
                  { bg: 'bg-[#4A7ED2]', ring: 'ring-[#4A7ED2]/30' },
                  { bg: 'bg-[#555]', ring: 'ring-[#555]/30' },
                  { bg: 'bg-[#738D66]', ring: 'ring-[#738D66]/30' },
                ].map((color, index) => (
                  <div
                    key={index}
                    onClick={() => setColorIndex(index)}
                    className={cn(
                      'relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-white transition-all duration-200',
                      color.bg,
                      colorIndex === index ? color.ring : 'ring-transparent',
                    )}
                  >
                    {colorIndex === index && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="text-white-100" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-title-50 mb-4 text-base font-medium">
                Quantity
              </h4>
              <div className="flex gap-4">
                <div className="border-base-100 divide-base-100 flex h-10 w-[130px] divide-x overflow-hidden rounded-lg border">
                  {/* <!-- Minus Button --> */}
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="hover:bg-background-soft-100 text-text-50 flex h-10 w-10 items-center justify-center transition"
                    aria-label="Decrease quantity"
                  >
                    <Minus />
                  </button>

                  {/* <!-- Input --> */}
                  <div className="text-text-50 flex flex-1 items-center justify-center">
                    {quantity}
                  </div>

                  {/* <!-- Plus Button --> */}
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="hover:bg-background-soft-100 text-text-50 flex h-10 w-10 items-center justify-center transition"
                    aria-label="Increase quantity"
                  >
                    <Plus />
                  </button>
                </div>
                <div className="grow">
                  <Button appearance="outline" className="h-10 w-full">
                    Add Gift Wrapping +$5
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button className="grow">
                <Bolt1 />
                Buy Now
              </Button>
              <Button appearance="outline" className="grow">
                Add to Cart
              </Button>
            </div>
          </div>

          <div className="border-base-100 border-t pt-9">
            <h3 className="text-title-50 mb-6 text-xl font-medium">
              Product Information
            </h3>
            <div className="divide-base-100 divide-y">
              <div className="py-4 first:pt-0 last:pb-0">
                <button
                  onClick={() => toggleSection('details')}
                  className="text-title-50 flex w-full cursor-pointer items-center justify-between text-left text-base"
                >
                  <span>Details</span>

                  <ChevronDown
                    className={cn(
                      openSection === 'details' ? 'rotate-180' : '',
                    )}
                  />
                </button>
                {openSection === 'details' && (
                  <div className="text-text-100 mt-4 text-base">
                    Product details go here.
                  </div>
                )}
              </div>
              <div className="py-4 first:pt-0 last:pb-0">
                <button
                  onClick={() => toggleSection('return')}
                  className="text-title-50 flex w-full cursor-pointer items-center justify-between text-left text-base"
                >
                  <span>Return & Shipping Info</span>
                  <ChevronDown
                    className={cn(openSection === 'return' ? 'rotate-180' : '')}
                  />
                </button>
                {openSection === 'return' && (
                  <div className="text-text-100 mt-4 cursor-pointer text-base">
                    Product details go here.
                  </div>
                )}
              </div>
              <div className="py-4 first:pt-0 last:pb-0">
                <button
                  onClick={() => toggleSection('sustainability')}
                  className="text-title-50 flex w-full cursor-pointer items-center justify-between text-left text-base"
                >
                  <span>Sustainability</span>

                  <ChevronDown
                    className={cn(
                      openSection === 'sustainability' ? 'rotate-180' : '',
                    )}
                  />
                </button>
                {openSection === 'sustainability' && (
                  <div className="text-text-100 mt-4 text-base">
                    Product details go here.
                  </div>
                )}
              </div>
              <div className="py-4 first:pt-0 last:pb-0">
                <button
                  onClick={() => toggleSection('tag')}
                  className="text-title-50 flex w-full cursor-pointer items-center justify-between text-left text-base"
                >
                  <span>Tags / Categories</span>

                  <ChevronDown
                    className={cn(openSection === 'tag' ? 'rotate-180' : '')}
                  />
                </button>
                {openSection === 'tag' && (
                  <div className="text-text-100 mt-4 text-base">
                    Product details go here.
                  </div>
                )}
              </div>
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
              initialSlide={activeImage}
              modules={[Navigation]}
              navigation
              className="h-full w-full"
              spaceBetween={20}
              slidesPerView={1}
            >
              {images.map((img, index) => (
                <SwiperSlide
                  key={index}
                  className="flex items-center justify-center"
                >
                  <div className="flex h-full w-full items-center justify-center">
                    <img
                      src={img}
                      className="max-h-full max-w-full object-contain"
                      alt={`Lightbox image ${index + 1}`}
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
