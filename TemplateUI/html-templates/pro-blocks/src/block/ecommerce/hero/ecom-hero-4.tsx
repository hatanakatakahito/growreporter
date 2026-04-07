// Import Swiper styles
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';

import { Button } from '@/components/core/button';

export default function EcomHero4() {
  const products = [
    {
      id: 1,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-04/sl-1.png',
      name: 'Air Max 75',
      price: '$159',
    },
    {
      id: 2,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-04/sl-2.png',
      name: 'Air Max 75',
      price: '$159',
    },
    {
      id: 3,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-04/sl-3.png',
      name: 'Air Max 75',
      price: '$159',
    },
    {
      id: 4,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-04/sl-4.png',
      name: 'Air Max 75',
      price: '$159',
    },
    {
      id: 5,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-04/sl-1.png',
      name: 'Air Max 75',
      price: '$159',
    },
  ];

  return (
    <section className="bg-background-50 p-6">
      <div className="mx-auto max-w-[1440px]">
        <div className="bg-background-soft-100 rounded-lg px-4 py-10 sm:px-7 lg:pt-24 lg:pb-14 xl:px-14">
          <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-center">
            <div className="order-2 lg:order-2 lg:max-w-md">
              <h1 className="text-title-50 mb-5 text-4xl font-semibold lg:text-7xl">
                FIND YOUR PERFECT FIT
              </h1>
              <p className="text-text-100 text-xl lg:pr-5">
                Experience the legendary Air Max 95 in a fresh, all-white design
                with a classic gum sole.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4 lg:mt-12">
                <Button>
                  <a href="javascript:void(0)"> Buy Now For $199</a>
                </Button>
                <Button appearance="outline" className="bg-background-50">
                  <a href="javascript:void(0)"> Explore collection</a>
                </Button>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="mx-auto">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-04/shoe.png"
                  className="w-full -rotate-30"
                  width="582"
                  height="385"
                  alt="shoe"
                />
              </div>
            </div>
          </div>

          {/* Swiper */}
          <div className="relative pt-8 lg:pt-20">
            <Swiper
              modules={[Pagination]}
              spaceBetween={16}
              slidesPerView={1}
              loop={true}
              breakpoints={{
                640: {
                  slidesPerView: 2,
                },
                1024: {
                  slidesPerView: 4,
                },
              }}
              pagination={{
                clickable: true,
                el: '.slider-pagination',
                bulletClass:
                  'w-4 h-1.5 rounded-full transition-all duration-300 cursor-pointer bg-background-soft-500 hover:bg-background-soft-500',
                bulletActiveClass: 'bg-foreground-50 w-5',
              }}
              className="mySwiper"
            >
              {products.map((product) => (
                <SwiperSlide key={product.id}>
                  <div className="bg-background-50 flex items-center gap-5 rounded-lg p-3">
                    <div className="bg-background-soft-100 flex w-1/2 items-center justify-center rounded">
                      <img
                        src={product.image}
                        className="h-23 w-23"
                        alt={product.name}
                      />
                    </div>
                    <div className="w-1/2 space-y-4">
                      <p className="text-text-100">{product.name}</p>
                      <h3 className="text-title-50 text-base font-medium">
                        {product.price}
                      </h3>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
            {/* Pagination container for mobile */}
            <div className="slider-pagination mt-4 flex justify-center gap-1 lg:hidden"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
