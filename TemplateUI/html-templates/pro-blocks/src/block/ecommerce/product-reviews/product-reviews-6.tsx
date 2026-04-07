import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
//@ts-ignore
import { ChevronLeft, ChevronRight, StarIcon } from '@tailgrids/icons';
import { useState } from 'react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';

interface ReviewProps {
  name: string;
  content: string;
  tags: string[];
  company: string;
  imageUrl?: string;
  logoUrl?: string;
}

const ReviewCard: React.FC<ReviewProps> = ({
  name,
  content,
  tags,
  company,
  imageUrl,
  logoUrl,
}) => (
  <article className="bg-background-50 rounded-2xl p-7">
    <div className="mb-7 flex flex-col gap-8 sm:flex-row">
      <div className="flex-1">
        <div className="mb-7">
          <p className="text-text-100 mb-1 text-base">{name}</p>
          <div className="flex gap-px">
            {[...Array(5)].map((_, i) => (
              <StarIcon className="size-4 text-yellow-500" key={i} />
            ))}
          </div>
        </div>
        <p className="text-text-100 text-lg leading-7">{content}</p>
        <div className="flex flex-wrap gap-2 pt-7 text-sm">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="bg-background-soft-100 text-text-50 rounded-full px-2 py-0.5 text-xs leading-4 font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div>
        <img
          className="w-full rounded-lg"
          src={
            imageUrl ??
            'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-06/product-1.jpg'
          }
          alt={`${name} product`}
        />
      </div>
    </div>
    <div className="border-base-100 flex items-center gap-3.5 border-t pt-7">
      <img
        className="h-8 w-8 rounded-lg"
        src={
          logoUrl ??
          'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-06/logo.svg'
        }
        alt={`${company} logo`}
      />
      <h4 className="text-title-50 text-base font-semibold">{company}</h4>
    </div>
  </article>
);

export default function ProductReviews6() {
  const [isPrevDisabled, setIsPrevDisabled] = useState(true);
  const [isNextDisabled, setIsNextDisabled] = useState(false);

  const handleSlideChange = (swiper: SwiperType) => {
    setIsPrevDisabled(swiper.isBeginning);
    setIsNextDisabled(swiper.isEnd);
  };

  const reviews: ReviewProps[] = [
    {
      name: 'David L.',
      content:
        "I was really surprised by how comfortable this chair is for the price! I needed a replacement quickly and didn't want to spend a fortune.",
      tags: ['Comfort', 'Durability', 'Mobility'],
      company: 'Rools Limited',
      logoUrl:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-06/logo.svg',
      imageUrl:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-06/product-1.jpg',
    },
    {
      name: 'David L.',
      content:
        "I was really surprised by how comfortable this chair is for the price! I needed a replacement quickly and didn't want to spend a fortune.",
      tags: ['Adjustability', 'Durability', 'Aesthetics'],
      company: 'Amz Inc',
      logoUrl:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-06/logo-2.svg',
      imageUrl:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-06/product-2.jpg',
    },
    {
      name: 'Adward L.',
      content:
        "I was really surprised by how comfortable this chair is for the price! I needed a replacement quickly and didn't want to spend a fortune.",
      tags: ['Adjustability', 'Durability', 'Aesthetics'],
      company: 'Amz Inc',
      logoUrl:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-06/logo.svg',
      imageUrl:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-06/product-1.jpg',
    },
  ];
  return (
    <section className="bg-background-soft-100 py-10 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-10 flex justify-between">
          <div>
            <h2 className="text-text-50 mb-4 text-4xl font-semibold sm:text-5xl">
              What our customer says
            </h2>
          </div>
          <div className="flex items-center gap-3.5">
            <button
              className={`swiper-button-prev text-title-50 border-base-100 bg-background-50 inline-flex h-12 w-12 items-center justify-center rounded-full border transition-opacity ${
                isPrevDisabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'text-title-50 cursor-pointer'
              }`}
              disabled={isPrevDisabled}
            >
              <ChevronLeft />
            </button>
            <button
              className={`swiper-button-next text-title-50 border-base-100 bg-background-50 inline-flex h-12 w-12 items-center justify-center rounded-full border transition-opacity ${
                isNextDisabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'text-title-50 cursor-pointer'
              }`}
              disabled={isNextDisabled}
            >
              <ChevronRight />
            </button>
          </div>
        </div>
        <Swiper
          modules={[Navigation]}
          spaceBetween={28}
          slidesPerView={1}
          breakpoints={{
            1024: {
              slidesPerView: 2,
              spaceBetween: 28,
            },
          }}
          navigation={{
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          }}
          onSlideChange={handleSlideChange}
          onInit={handleSlideChange}
          className="mySwiper"
        >
          {reviews.map((review, index) => (
            <SwiperSlide key={index}>
              <ReviewCard
                name={review.name}
                content={review.content}
                tags={review.tags}
                company={review.company}
                imageUrl={review.imageUrl}
                logoUrl={review.logoUrl}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
