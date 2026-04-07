import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';

//@ts-ignore
import 'swiper/css';
import { Cart2, Heart } from '@tailgrids/icons';
import { Button } from '@/components/core/button';

interface ProductProps {
  imageSrc: string;
  title: string;
  description: string;
  price: string;
  link: string;
  isHotItem?: boolean; // Optional flag for "Hot Item" badge
  className?: string; // Optional additional Tailwind classes
}

interface SimpleProductSliderProps {
  products?: ProductProps[]; // Optional products array
  className?: string; // Optional additional Tailwind classes for the container
}

const ProductCard: React.FC<ProductProps> = ({
  imageSrc,
  title,
  description,
  price,
  link,
  isHotItem = false,
  className = '',
}) => {
  return (
    <article className={`relative ${className}`}>
      <a href={link} className="group relative block">
        <img src={imageSrc} className="w-full rounded-lg" alt={title} />
        <Button
          iconOnly
          appearance="outline"
          className="bg-background-50 text-title-50 absolute top-4 right-4 z-20 inline-flex h-10 w-10 translate-y-6 transform cursor-pointer rounded-full opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100"
        >
          <Heart className="size-4" />
        </Button>
        {isHotItem && (
          <span className="bg-badge-error-background text-badge-error-text absolute top-4 left-4 z-20 rounded-full px-3 py-1 text-sm font-medium">
            Hot Item
          </span>
        )}
      </a>
      <div className="mb-5 flex items-start pt-4">
        <div className="grow">
          <h3 className="text-title-50 mb-1 text-base font-semibold">
            <a href={link}>{title}</a>
          </h3>
          <p className="text-text-100 text-sm">{description}</p>
        </div>
        <div>
          <span className="text-title-50 cursor-pointer font-medium">
            {price}
          </span>
        </div>
      </div>
      <Button
        aria-label="Add to cart"
        appearance="outline"
        className="hover:bg-primary-500 hover:text-white-100 w-full"
      >
        <Cart2 />
        Add to cart
      </Button>
    </article>
  );
};

const ProductCarousels6: React.FC<SimpleProductSliderProps> = () => {
  const products = [
    {
      imageSrc:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-06/product-1.jpg',
      title: 'White Jacket',
      description: 'Lightweight & water-resistant',
      price: '$249.00',
      link: '#',
      isHotItem: true,
    },
    {
      imageSrc:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-06/product-2.jpg',
      title: 'Tote Bag',
      description: 'Spacious & stylish',
      price: '$209.00',
      link: '#',
    },
    {
      imageSrc:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-06/product-3.jpg',
      title: 'White Jacket',
      description: 'Lightweight & water-resistant',
      price: '$249.00',
      link: '#',
      isHotItem: true,
    },
    {
      imageSrc:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-06/product-4.jpg',
      title: 'Beige Cap',
      description: 'Soft breathable fabric',
      price: '$249.00',
      link: '#',
    },
    {
      imageSrc:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-06/product-1.jpg',
      title: 'Qua Watch',
      description: 'Modern rubber sole',
      price: '$249.00',
      link: '#',
    },
  ];
  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-lg text-center">
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            Handpicked Highlights
          </h2>
          <p className="text-text-100 text-base lg:px-5">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div>
          <Swiper
            modules={[Navigation, Pagination]}
            navigation={{
              prevEl: '.swiper-button-prev',
              nextEl: '.swiper-button-next',
            }}
            pagination={{
              el: '.swiper-pagination',
              clickable: true,
              bulletClass:
                'w-7 h-1.5 rounded-full transition-colors duration-300 cursor-pointer bg-gray-200 hover:bg-primary-500',
              bulletActiveClass: 'bg-primary-500',
            }}
            spaceBetween={28} // Matches gap-7 (7 * 4 = 28px)
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 2, spaceBetween: 28 }, // Matches sm:grid-cols-2
              1024: { slidesPerView: 3, spaceBetween: 28 }, // Matches lg:grid-cols-3
              1280: { slidesPerView: 4, spaceBetween: 28 }, // Matches xl:grid-cols-4
            }}
          >
            {products.map((product, index) => (
              <SwiperSlide key={index}>
                <ProductCard
                  imageSrc={product.imageSrc}
                  title={product.title}
                  description={product.description}
                  price={product.price}
                  link={product.link}
                  isHotItem={product.isHotItem}
                />
              </SwiperSlide>
            ))}
            <div className="swiper-pagination mt-11 flex justify-center gap-2"></div>
          </Swiper>
        </div>
      </div>
    </section>
  );
};
export default ProductCarousels6;
