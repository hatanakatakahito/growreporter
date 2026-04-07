import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
//@ts-ignore
import 'swiper/css';
import {
  Bolt1,
  Cart2,
  ChevronLeft,
  ChevronRight,
  HalfStarIcon,
  Heart,
  StarIcon,
} from '@tailgrids/icons';
import { Button } from '@/components/core/button';

interface ProductProps {
  imageSrc: string;
  title: string;
  description: string;
  price: string;
  rating: number; // Number of stars (e.g., 4.5 for 4 full stars and 1 half star)
  link: string;
  className?: string; // Optional additional Tailwind classes
}

interface ProductSliderProps {
  products?: ProductProps[]; // Optional products array
  className?: string; // Optional additional Tailwind classes for the container
  title?: string; // Optional section title
  description?: string; // Optional section description
}

const ProductCard: React.FC<ProductProps> = ({
  imageSrc,
  title,
  description,
  price,
  rating,
  link,
  className = '',
}) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <article className={`group border-base-100 rounded-xl border ${className}`}>
      <a
        href="javascript:void(0);"
        className="relative block h-[326px] overflow-hidden rounded-t-xl"
      >
        <img
          src={imageSrc}
          className="h-full w-full rounded-t-xl object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
          alt={title}
        />
        <Button
          iconOnly
          appearance="outline"
          className="bg-background-50 absolute top-4 right-4 inline-flex translate-y-6 transform items-center justify-center rounded-full opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100"
        >
          <Heart className="size-5" />
        </Button>
      </a>
      <div className="p-7">
        <h3 className="text-title-50 mb-2 text-base font-medium">
          <a href={link}>{title}</a>
        </h3>
        <p className="text-text-100 mb-5 line-clamp-2 text-base leading-5">
          {description}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-title-50 text-base font-semibold">{price}</p>
          <div className="flex items-center gap-0.5">
            {[...Array(fullStars)].map((_, i) => (
              <StarIcon key={i} className="size-3.5 text-yellow-400" />
            ))}
            {hasHalfStar && (
              <HalfStarIcon className="size-3.5 text-yellow-400" />
            )}
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <Button appearance="outline" className="w-full">
            <Bolt1 />
            Buy Now
          </Button>
          <Button iconOnly appearance="outline" className="shrink-0">
            <Cart2 className="size-6" />
          </Button>
        </div>
      </div>
    </article>
  );
};

const ProductCarousels2: React.FC<ProductSliderProps> = ({
  products = [
    {
      imageSrc:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-02/product-1.jpg',
      title: 'Retro Watch - White',
      description:
        'Bold and modern, this black watch features a sleek look with a subtle red accent for extra flair.',
      price: '$245.00',
      rating: 5,
      link: '#',
    },
    {
      imageSrc:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-02/product-2.jpg',
      title: 'Wave Retro Watch - Black',
      description:
        'Timeless elegance with a clean white dial and minimalist design. Perfect for any occasion.',
      price: '$279.99',
      rating: 4,
      link: '#',
    },
    {
      imageSrc:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-02/product-3.jpg',
      title: 'Retro Watch - Silver',
      description:
        'Classic sophistication with a silver finish and understated style. Ideal for both work and leisure.',
      price: '$249.00',
      rating: 4.5,
      link: '#',
    },
    {
      imageSrc:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-02/product-1.jpg',
      title: 'Wave Retro Watch - Black',
      description:
        'Timeless elegance with a clean white dial and minimalist design. Perfect for any occasion.',
      price: '$279.99',
      rating: 4,
      link: '#',
    },
    {
      imageSrc:
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-02/product-3.jpg',
      title: 'Retro Watch - Silver',
      description:
        'Classic sophistication with a silver finish and understated style. Ideal for both work and leisure.',
      price: '$249.00',
      rating: 4.5,
      link: '#',
    },
  ],
}) => {
  return (
    <section className="bg-background-50 py-14 lg:py-28">
      <div className={`mx-auto max-w-7xl px-4 xl:px-0`}>
        <div className="mb-11 flex flex-col justify-between gap-10 sm:mb-16 lg:flex-row lg:items-end">
          <div className="max-w-md">
            <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
              Step into Style
            </h2>
            <p className="text-text-100 text-base">
              There are many variations of available but the majority have
              suffered alteration in some form.
            </p>
          </div>
          <div className="flex gap-3.5">
            <button className="two-swiper-button-prev text-title-50 border-base-200 hover:bg-background-soft-200 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border transition-colors">
              <ChevronLeft />
            </button>
            <button className="two-swiper-button-next text-title-50 border-base-200 hover:bg-background-soft-200 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border transition-colors">
              <ChevronRight />
            </button>
          </div>
        </div>
        <Swiper
          modules={[Navigation, Pagination]}
          navigation={{
            prevEl: '.two-swiper-button-prev',
            nextEl: '.two-swiper-button-next',
          }}
          pagination={{
            el: '.two-swiper-pagination',
            clickable: true,
            bulletClass:
              'w-7 h-1.5 rounded-full transition-colors duration-300 cursor-pointer bg-background-soft-300 hover:bg-primary-500',
            bulletActiveClass: 'bg-primary-500',
          }}
          spaceBetween={28}
          slidesPerView={1}
          breakpoints={{
            640: { slidesPerView: 2, spaceBetween: 24 },
            1024: { slidesPerView: 3, spaceBetween: 28 },
          }}
        >
          {products.map((product, index) => (
            <SwiperSlide key={index}>
              <ProductCard
                imageSrc={product.imageSrc}
                title={product.title}
                description={product.description}
                price={product.price}
                rating={product.rating}
                link={product.link}
              />
            </SwiperSlide>
          ))}
          <div className="swiper-pagination mt-11 flex justify-center gap-2"></div>
        </Swiper>
      </div>
    </section>
  );
};

export default ProductCarousels2;
