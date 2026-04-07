import { Button } from '@/components/core/button';
import { Progress } from '@/components/core/progress';
import {
  HalfStarIcon,
  StarIcon,
  ThumbsDown2,
  ThumbsUp2,
} from '@tailgrids/icons';

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

interface ReviewProps {
  name: string;
  date: string;
  rating: number; // Number of stars (e.g., 5 for 5 full stars)
  content: string;
  thumbsUp: number;
  thumbsDown: number;
  avatarSrc?: string; // Optional avatar image URL
  className?: string; // Optional additional Tailwind classes
}

interface CustomerReviewProps {
  reviews: ReviewProps[];
  className?: string; // Optional additional Tailwind classes for the container
  title?: string; // Optional title for the section
}

const ReviewCard: React.FC<ReviewProps> = ({
  name,
  date,
  rating,
  content,
  thumbsUp,
  thumbsDown,
  avatarSrc = 'https://placehold.co/100x100/png',
  className = '',
}) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <li className={`py-6 first:pt-0 last:pb-0 ${className}`}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div className="shrink-0">
          <img
            className="h-14 w-14 rounded-full"
            src={avatarSrc}
            alt="avatar"
          />
        </div>
        <div className="flex-1">
          <div className="mb-4 flex items-start justify-between">
            <div className="space-y-2">
              <h4 className="text-title-50 text-lg font-semibold">{name}</h4>
              <div className="flex items-center gap-px">
                {[...Array(fullStars)].map((_, i) => (
                  <StarIcon className="size-4 text-yellow-500" key={i} />
                ))}
                {hasHalfStar && (
                  <HalfStarIcon className="size-4 text-yellow-500" />
                )}
              </div>
            </div>
            <p className="text-text-100 text-sm">{date}</p>
          </div>
          <p className="text-text-100 text-lg leading-7">{content}</p>
          <div className="mt-5 flex items-center gap-3">
            <p className="text-text-100 text-sm">This is helpful?</p>
            <div className="flex">
              <button className="text-text-100 flex cursor-pointer items-center gap-1 px-2.5 py-1">
                <ThumbsUp2 className="size-4" />
                {thumbsUp}
              </button>
              <button className="text-text-100 flex cursor-pointer items-center gap-1 px-2.5 py-1">
                <ThumbsDown2 className="size-4" />
                {thumbsDown}
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

const CustomerReview: React.FC<CustomerReviewProps> = ({ reviews }) => {
  return (
    <ul className="divide-base-50 divide-y">
      {reviews.map((review, index) => (
        <ReviewCard
          key={index}
          name={review.name}
          date={review.date}
          rating={review.rating}
          content={review.content}
          thumbsUp={review.thumbsUp}
          thumbsDown={review.thumbsDown}
          avatarSrc={review.avatarSrc}
        />
      ))}
    </ul>
  );
};

export default function ProductReviews2() {
  const reviews: ReviewProps[] = [
    {
      name: 'Zaire Franci',
      date: 'Jun 15, 2025',
      rating: 5,
      content:
        'I’ve tried several wireless earbuds in this price range, and these easily outperform them all.',
      thumbsUp: 46,
      thumbsDown: 5,
      avatarSrc:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-02/image-1.png',
    },
    {
      name: 'Nolan Nasz',
      date: 'Apr 01, 2025',
      rating: 4.5,
      content:
        'It holds my tablet and phone securely and looks great on my workstation. Could be slightly heavier to avoid tipping, but no major complaints',
      thumbsUp: 14,
      thumbsDown: 4,
      avatarSrc:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-02/image-2.png',
    },
    {
      name: 'Jaydon Saris',
      date: 'May 24, 2025',
      rating: 4,
      content:
        'Reliable and easy to carry around. I’ve used it on flights, in cafes, and even while camping.',
      thumbsUp: 14,
      thumbsDown: 4,
      avatarSrc:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-02/image-3.png',
    },
  ];
  return (
    <section className="bg-background-50 py-10 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="bg-background-soft-100 flex flex-col gap-3 rounded-3xl p-3 lg:flex-row">
          <div className="bg-background-50 rounded-xl p-5 sm:p-7 lg:w-4/12">
            <div>
              <h3 className="text-title-50 mb-5 text-xl font-semibold sm:text-2xl">
                Average rating
              </h3>
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
            </div>
            <div className="my-10 space-y-4">
              {/* Rating Bar */}
              <RatingBar starRating={5} percentage={60} />
              <RatingBar starRating={4} percentage={60} />
              <RatingBar starRating={3} percentage={50} />
              <RatingBar starRating={2} percentage={20} />
              <RatingBar starRating={1} percentage={20} />
            </div>
            <div>
              <h3 className="text-title-50 mb-5 text-xl font-semibold sm:text-2xl">
                Write your review
              </h3>
              <p className="text-text-100 mb-6 text-lg leading-7">
                Your feedback helps us grow and improve — share your experience
                with this product.
              </p>
              <Button>Write your review</Button>
            </div>
          </div>
          <div className="bg-bakground-50 rounded-xl p-5 sm:p-7 lg:w-8/12">
            <div>
              <h3 className="text-title-50 mb-5 text-xl font-semibold sm:text-2xl">
                Customer feedback
              </h3>
              {/* <!-- Review --> */}
              <CustomerReview reviews={reviews} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
