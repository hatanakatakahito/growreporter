import { Button } from '@/components/core/button';
import { Progress } from '@/components/core/progress';
import { HalfStarIcon, Pencil1, StarIcon, ThumbsUp2 } from '@tailgrids/icons';
import React, { useState } from 'react';
interface RatingBarProps {
  starRating: number;
  percentage: number;
  starLabel?: string; // Optional custom label for stars (e.g., "3 Star" or "Three Stars")
  className?: string; // Optional additional Tailwind classes for the container
}

const RatingBar: React.FC<RatingBarProps> = ({
  starRating,
  percentage,
  starLabel = `${starRating} Star`,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="shrink-0">
        <span className="text-text-100 text-sm">{starLabel}</span>
      </div>
      <Progress
        progress={percentage}
        className="w-full"
        barColor="var(--color-yellow-400)"
      />
      <div className="shrink-0">
        <span className="text-text-100 text-sm">{percentage}%</span>
      </div>
    </div>
  );
};

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

import { motion } from 'framer-motion';

const ReviewTabs: React.FC<ReviewTabsProps> = ({
  tabs = [
    { id: 'tab1', label: 'All', count: 147 },
    { id: 'tab2', label: '5 star' },
    { id: 'tab3', label: '4 star' },
    { id: 'tab4', label: '3 star' },
    { id: 'tab5', label: '2 star' },
    { id: 'tab6', label: '1 star' },
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
    <div className={`hidden w-fit max-w-md sm:block ${className}`}>
      <nav className="border-base-100 flex items-end border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`relative cursor-pointer p-3 text-sm font-medium transition-colors focus:outline-none ${
              activeTab === tab.id ? 'text-primary-500' : 'text-text-100'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="bg-primary-50 text-primary-500 ml-2 inline-block w-fit items-center justify-center rounded-full px-2 py-0.5 text-center text-xs font-medium">
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="bg-primary-500 absolute right-0 bottom-0 left-0 h-0.5"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

interface ReviewProps {
  rating: number; // Number of stars (e.g., 5 for 5 full stars)
  date: string;
  title: string;
  content: string;
  name: string;
  thumbsUp: number;
  thumbsDown: number;
  avatarSrc?: string; // Optional avatar image URL
  className?: string; // Optional additional Tailwind classes
}

const ReviewCard: React.FC<ReviewProps> = ({
  rating,
  date,
  title,
  content,
  name,
  thumbsUp,
  thumbsDown,
  avatarSrc = 'https://placehold.co/100x100/png',
  className = '',
}) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <article className={`bg-background-50 rounded-2xl p-5 sm:p-8 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-px">
          {[...Array(fullStars)].map((_, i) => (
            <StarIcon key={i} className="size-4 text-yellow-400" />
          ))}
          {hasHalfStar && <HalfStarIcon className="size-4 text-yellow-400" />}
        </div>
        <p className="text-text-100 text-sm">{date}</p>
      </div>
      <div className="my-7">
        <h4 className="text-title-50 mb-2 text-lg font-semibold">{title}</h4>
        <p className="text-text-100 text-base leading-6">{content}</p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            className="h-10 w-10 rounded-full"
            src={avatarSrc}
            alt="avatar"
          />
          <h4 className="text-text-100 text-base font-medium">{name}</h4>
        </div>
        <div className="flex">
          <button className="text-text-100 flex cursor-pointer items-center gap-1 px-2.5 py-1 text-sm">
            <ThumbsUp2 className="size-4" />
            {thumbsUp}
          </button>
          <button className="text-text-100 flex cursor-pointer items-center gap-1 px-2.5 py-1 text-sm">
            <ThumbsUp2 className="size-4 rotate-180" />
            {thumbsDown}
          </button>
        </div>
      </div>
    </article>
  );
};

export default function ProductReviews4() {
  const reviews = [
    {
      rating: 5,
      date: 'Jun 15, 2025',
      title: 'Great wireless earbuds in Budget',
      content:
        'I’ve tried several wireless earbuds in this price range, and these easily outperform them all. The bass is deep, the clarity is sharp, and they stay in place even during workouts.',
      name: 'Zaire Rose',
      thumbsUp: 14,
      thumbsDown: 4,
      avatarSrc:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-04/avatar-1.png',
    },
    {
      rating: 5,
      date: 'Jun 10, 2025',
      title: 'Feels premium for the price',
      content:
        'This smartwatch has completely changed my routine. It tracks my workouts, sleep, and even my stress levels with surprising accuracy. I love the customizable watch faces.',
      name: 'Wade Warren',
      thumbsUp: 12,
      thumbsDown: 2,
      avatarSrc:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-04/avatar-2.png',
    },
    {
      rating: 5,
      date: 'Jun 5, 2025',
      title: 'Solid build and great value',
      content:
        'These earbuds are a great value for the price. The sound quality is excellent, and the battery life is impressive, lasting almost 3 days on a single charge.',
      name: 'Kathryn Murphy',
      thumbsUp: 10,
      thumbsDown: 3,
      avatarSrc:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-04/avatar-3.png',
    },
  ];
  return (
    <section className="bg-background-soft-100 py-10 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="space-y-6 sm:space-y-12">
          {/* <!-- Top --> */}
          <div className="divide-base-100 bg-background-50 flex flex-col divide-y rounded-xl p-5 sm:p-8 lg:flex-row lg:divide-x lg:divide-y-0">
            <div className="pb-8 lg:w-1/2 lg:pr-8 lg:pb-0">
              <div className="border-base-100 flex flex-col gap-6 border-b pb-6 sm:flex-row sm:items-center">
                <div className="shrink-0">
                  <img
                    className="w-full rounded-lg sm:h-24 sm:w-24"
                    src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-04/chair.png"
                    alt="avatar"
                  />
                </div>
                <div>
                  <h3 className="text-title-50 mb-1 text-2xl font-semibold">
                    ErgoFlex Pro Office Chair
                  </h3>
                  <p className="text-text-100 text-base">
                    Premium Office Furniture
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-between gap-5 pt-6 sm:flex-row sm:items-center">
                <h4 className="text-title-50 text-xl font-semibold">
                  Write your review
                </h4>
                <Button>
                  <Pencil1 className="size-4" />
                  Your review
                </Button>
              </div>
            </div>
            <div className="pt-8 lg:w-1/2 lg:pt-0 lg:pl-8">
              <div className="flex flex-col gap-10 sm:flex-row">
                <div className="space-y-3.5">
                  <h4 className="text-title-50 text-3xl font-semibold">
                    Average rating
                  </h4>
                  <div className="flex items-center">
                    <div className="flex items-center gap-px">
                      <StarIcon className="size-4 text-yellow-500" />
                      <StarIcon className="size-4 text-yellow-500" />
                      <StarIcon className="size-4 text-yellow-500" />
                      <StarIcon className="size-4 text-yellow-500" />
                      <StarIcon className="size-4 text-yellow-500" />
                    </div>
                    <p className="text-title-50 ml-2 text-base font-medium">
                      (4 out of 5)
                    </p>
                  </div>
                  <p className="text-text-100 text-base">Based on 35k users</p>
                </div>
                <div className="flex-1 space-y-3">
                  <RatingBar starRating={5} percentage={60} />
                  <RatingBar starRating={4} percentage={60} />
                  <RatingBar starRating={3} percentage={50} />
                  <RatingBar starRating={2} percentage={20} />
                  <RatingBar starRating={1} percentage={20} />
                </div>
              </div>
            </div>
          </div>
          {/* <!-- Bottom --> */}
          <div className="space-y-6 sm:space-y-12">
            {/* <!-- Tab --> */}
            <div className="bg-background-50 flex justify-between gap-5 rounded-xl p-5">
              <ReviewTabs />
              <div className="flex shrink-0 items-center gap-2 sm:hidden">
                <select className="border-base-200 flex h-10 shrink-0 rounded-lg border bg-transparent px-3.5 py-2.5 pr-10 text-sm">
                  <option value="0">All</option>
                  <option value="1">5 Star</option>
                  <option value="2">4 Star</option>
                  <option value="3">3 Star</option>
                  <option value="3">2 Star</option>
                  <option value="3">1 Star</option>
                </select>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label className="text-text-100 hidden text-base sm:block">
                  Short By :
                </label>
                <select className="border-base-200 flex h-10 shrink-0 rounded-lg border bg-transparent px-3.5 py-2.5 pr-10 text-sm">
                  <option value="0">Newest</option>
                  <option value="1">Oldest</option>
                  <option value="2">Highest rated</option>
                  <option value="3">Lowest rated</option>
                  <option value="4">Most helpful</option>
                </select>
              </div>
            </div>
            {/* <!-- Reviews --> */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {reviews.map((review, index) => (
                <ReviewCard
                  key={index}
                  rating={review.rating}
                  date={review.date}
                  title={review.title}
                  content={review.content}
                  name={review.name}
                  thumbsUp={review.thumbsUp}
                  thumbsDown={review.thumbsDown}
                  avatarSrc={review.avatarSrc}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
