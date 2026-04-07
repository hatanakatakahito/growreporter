import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
//@ts-ignore
import 'swiper/css';
import { useState } from 'react';
import {
  ArrowBothDirectionHorizontal2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  StarIcon,
} from '@tailgrids/icons';
import { Button } from '@/components/core/button';
import { motion } from 'framer-motion';

interface Product {
  id: number;
  name: string;
  price: string;
  imageUrl: string;
  altText: string;
  status?: string;
  oldPrice?: string;
}

const products: Product[] = [
  {
    id: 1,
    name: 'Midnight Black Frames',
    price: '$42.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-01/product-1.jpg',
    altText: 'Midnight Black Frames Image',
    status: 'Sale!',
    oldPrice: '$60.00',
  },
  {
    id: 2,
    name: 'Lemon Zest Shades',
    price: '$44.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-01/product-2.jpg',
    altText: 'Lemon Zest Shades Image',
  },
  {
    id: 3,
    name: 'Frosted Blue Sunnies',
    price: '$49.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-01/product-3.jpg',
    altText: 'Frosted Blue Sunnies Image',
  },
  {
    id: 4,
    name: 'Blush Pink Cat-Eyes',
    price: '$59.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-01/product-4.jpg',
    altText: 'Blush Pink Cat-Eyes Image',
    status: 'Sale!',
    oldPrice: '$85.00',
  },
  {
    id: 5,
    name: 'Ocean Blue Ovals',
    price: '$38.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-01/product-1.jpg',
    altText: 'Ocean Blue Ovals Image',
  },
  {
    id: 6,
    name: 'Rose Gold Retro Frames',
    price: '$45.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-01/product-2.jpg',
    altText: 'Rose Gold Retro Frames Image',
  },
  {
    id: 7,
    name: 'Mint Green Vision',
    price: '$24.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-01/product-3.jpg',
    altText: 'Mint Green Vision Image',
    status: 'Sale!',
    oldPrice: '$35.00',
  },
  {
    id: 8,
    name: 'Lavender Dream Glasses',
    price: '$41.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-01/product-4.jpg',
    altText: 'Lavender Dream Glasses Image',
  },
];

interface TabProps {
  label: string;
  id: string;
  count?: number; // Optional count for the badge (e.g., 147 for "All")
  className?: string; // Optional additional Tailwind classes
}
interface ReviewTabsProps {
  tabs?: TabProps[]; // Optional custom tabs array
  className?: string; // Optional additional Tailwind classes for the container
  defaultTab?: string; // Optional default active tab ID
  onTabChange?: (tabId: string) => void; // Optional callback for tab change
}

const ReviewTabs: React.FC<ReviewTabsProps> = ({
  tabs = [
    { id: 'tab1', label: 'Best Seller', count: 147 },
    { id: 'tab2', label: 'New Arrivals' },
    { id: 'tab3', label: 'Special' },
    { id: 'tab4', label: 'Top Rated' },
  ],
  className = '',
  defaultTab = 'tab1',
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <div className={`mx-auto w-full ${className}`}>
      <nav className="border-base-100 mx-auto flex w-fit max-w-full overflow-x-auto border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`relative cursor-pointer p-3 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none ${
              activeTab === tab.id
                ? 'text-primary-500'
                : 'hover:text-primary-600 text-text-100'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="bg-primary-500 absolute right-0 bottom-0 left-0 h-0.5"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default function ProductCarousels1() {
  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            Trending Styles Right Now
          </h2>
          <p className="text-text-100 text-base lg:px-14">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
          <div className="mt-11">
            <ReviewTabs />
          </div>
        </div>
        <div>
          <Swiper
            modules={[Navigation]}
            navigation={{
              prevEl: '.swiper-button-prev',
              nextEl: '.swiper-button-next',
            }}
            spaceBetween={28} // Matches gap-7 (7 * 4 = 28px)
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 2, spaceBetween: 28 }, // Matches sm:grid-cols-2
              1024: { slidesPerView: 3, spaceBetween: 28 }, // Matches lg:grid-cols-3
              1280: { slidesPerView: 4, spaceBetween: 28 }, // Matches xl:grid-cols-4
            }}
          >
            {products.map((product) => (
              <SwiperSlide key={product.id}>
                <article className="relative cursor-pointer">
                  <div className="group relative overflow-hidden">
                    {product.status && (
                      <span className="bg-badge-error-background text-badge-error-text absolute top-4 left-4 rounded-full px-3 py-1 text-sm leading-5 font-medium">
                        {product.status}
                      </span>
                    )}
                    <a href="javascript:void(0)" className="block">
                      <img
                        src={product.imageUrl}
                        className="w-full rounded-xl"
                        alt={product.altText}
                      />
                    </a>
                    <div className="absolute right-4 bottom-4 left-4 translate-y-6 transform opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                      <Button appearance="outline" className="w-full">
                        Add to cart
                      </Button>
                    </div>
                    <div className="absolute top-4 right-4 flex translate-y-6 transform flex-col gap-2 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                      <Button
                        iconOnly
                        appearance="outline"
                        className="bg-background-50 rounded-full"
                      >
                        <Heart className="size-5" />
                      </Button>
                      <Button
                        iconOnly
                        appearance="outline"
                        className="bg-background-50 rounded-full"
                      >
                        <Eye className="size-5" />
                      </Button>
                      <Button
                        iconOnly
                        appearance="outline"
                        className="bg-background-50 rounded-full"
                      >
                        <ArrowBothDirectionHorizontal2 className="size-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="pt-6">
                    <h3 className="text-text-100 mb-3 text-base font-normal">
                      <a href="javascript:void(0)">{product.name}</a>
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-title-50 text-base font-medium">
                          {product.price}
                        </p>
                        {product.oldPrice && (
                          <p className="text-text-200 text-sm font-medium line-through">
                            {product.oldPrice}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <StarIcon className="size-3.5 text-yellow-400" />
                        <StarIcon className="size-3.5 text-yellow-400" />
                        <StarIcon className="size-3.5 text-yellow-400" />
                        <StarIcon className="size-3.5 text-yellow-400" />
                        <StarIcon className="size-3.5 text-yellow-400" />
                      </div>
                    </div>
                  </div>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
        <div className="mt-11 flex justify-center gap-3.5">
          <button className="swiper-button-prev text-title-50 hover:bg-background-soft-50 border-base-200 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border transition-colors">
            <ChevronLeft />
          </button>
          <button className="swiper-button-next text-title-50 hover:bg-background-soft-50 border-base-200 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border transition-colors">
            <ChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
}
