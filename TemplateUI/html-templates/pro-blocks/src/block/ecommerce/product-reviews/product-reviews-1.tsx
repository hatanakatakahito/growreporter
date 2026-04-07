import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { Progress } from '@/components/core/progress';
import { TextArea } from '@/components/core/text-area';
import {
  HalfStarIcon,
  Link1AngularRight,
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
        barColor="var(--color-yellow-400)"
        className="w-full"
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
  rating: number; // Number of stars (e.g., 4.5 for 4 full stars and 1 half star)
  content: string;
  images?: string[]; // Optional array of image URLs
  thumbsUp: number;
  thumbsDown: number;
  className?: string; // Optional additional Tailwind classes
}

interface CustomerReviewsProps {
  reviews: ReviewProps[];
  className?: string; // Optional additional Tailwind classes for the container
  title?: string; // Optional title for the section
}
const ReviewCard: React.FC<ReviewProps> = ({
  name,
  date,
  rating,
  content,
  images = [],
  thumbsUp,
  thumbsDown,
  className = '',
}) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <li className={`py-8 first:pt-0 last:pb-0 ${className}`}>
      <div className="mb-5 flex justify-between">
        <div className="flex items-center gap-3.5">
          <img
            className="h-14 w-14 rounded-full"
            src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-01/avatar.png"
            alt="avatar"
          />
          <div>
            <h4 className="text-title-50 text-lg font-semibold">{name}</h4>
            <p className="text-text-100 text-sm">{date}</p>
          </div>
        </div>
        <div className="mb-5 flex items-center gap-px">
          {[...Array(fullStars)].map((_, i) => (
            <StarIcon className="size-4 text-yellow-400" key={i} />
          ))}
          {hasHalfStar && <HalfStarIcon className="size-4 text-yellow-400" />}
        </div>
      </div>
      <p className="text-text-100 mb-4 text-lg leading-7">{content}</p>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((image, index) => (
            <img
              key={index}
              className="h-17 w-17 rounded-lg"
              src={image}
              alt="product"
            />
          ))}
        </div>
      )}
      <div className="mt-8 flex gap-3">
        <p className="text-text-100 text-base">This is helpful?</p>
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
    </li>
  );
};

const CustomerReviews: React.FC<CustomerReviewsProps> = ({
  reviews,
  className = '',
  title = 'What our customers say',
}) => {
  return (
    <div className={`mx-auto max-w-7xl px-4 xl:px-0 ${className}`}>
      <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
        {title}
      </h2>
      <ul className="divide-base-50 divide-y">
        {reviews.map((review, index) => (
          <ReviewCard
            key={index}
            name={review.name}
            date={review.date}
            rating={review.rating}
            content={review.content}
            images={review.images}
            thumbsUp={review.thumbsUp}
            thumbsDown={review.thumbsDown}
          />
        ))}
      </ul>
    </div>
  );
};

export default function ProductReviews1() {
  const reviews: ReviewProps[] = [
    {
      name: 'Zaire Franci',
      date: '2 Days Ago',
      rating: 5,
      content:
        'I’ve tried several wireless earbuds in this price range, and these easily outperform them all.',
      images: [
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-01/product-1.png',
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-01/product-2.png',
        'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-01/product-3.png',
      ],
      thumbsUp: 46,
      thumbsDown: 5,
    },
    {
      name: 'Nolan Nasz',
      date: '12 June 2025',
      rating: 4.5,
      content:
        'Reliable and easy to carry around. I’ve used it on flights, in cafes, and even while camping. Would’ve loved a built-in cable, but otherwise it’s perfect.',
      images: [],
      thumbsUp: 46,
      thumbsDown: 5,
    },
  ];

  return (
    <section className="bg-background-50 py-10 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="space-y-10">
          <div className="bg-background-soft-50 flex flex-col justify-between gap-10 rounded-xl p-5 sm:p-10 lg:flex-row">
            <div>
              <h3 className="text-title-50 mb-5 text-xl font-semibold sm:text-2xl">
                Customer reviews and rating
              </h3>
              <div className="flex items-center">
                <StarIcon className="size-5 text-yellow-400" />
                <h2 className="text-title-50 mr-2 ml-3 text-5xl font-semibold">
                  4,6
                </h2>
                <span className="text-text-100 text-3xl">/5.0</span>
              </div>
              <div className="bg-background-50 mt-4 rounded-lg px-3 py-2">
                <p className="text-text-50 mb-1 text-sm font-medium">
                  Recommended
                </p>
                <p className="text-text-100 text-sm">
                  (87%) Buyer recommended this product
                </p>
              </div>
            </div>
            <div className="max-w-md flex-1 space-y-5">
              <RatingBar starRating={5} percentage={60} />
              <RatingBar starRating={4} percentage={60} />
              <RatingBar starRating={3} percentage={50} />
              <RatingBar starRating={2} percentage={20} />
              <RatingBar starRating={1} percentage={20} />
            </div>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {/* <!-- Header --> */}
              <div className="bg-background-soft-50 mb-8 flex flex-col justify-between gap-5 rounded-xl p-4 sm:flex-row sm:items-center">
                <div className="shrink-0">
                  <p className="text-title-50 text-base">
                    Showing 1-8 of 23 Reviews
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="text-text-100 text-base">Short By :</label>
                  <select className="border-base-200 text-title-50 bg-input-background flex h-10 shrink-0 rounded-lg border px-3.5 py-2.5 pr-10 text-sm">
                    <option value="0">Recent</option>
                    <option value="1">Old</option>
                  </select>
                </div>
              </div>
              {/* <!-- Header End --> */}
              {/* <!-- Review --> */}
              <ul className="divide-base-50 divide-y">
                {/* <!-- Single Review --> */}
                <CustomerReviews reviews={reviews} />
                {/* <!-- Single Review End --> */}
              </ul>
              {/* <!-- Review End --> */}
            </div>
            <div className="bg-background-soft-50 rounded-xl p-5 sm:p-8 lg:col-span-1">
              <h4 className="text-title-50 mb-3 font-semibold">
                Write a review
              </h4>
              <div className="mb-5 flex items-center justify-between">
                <p className="text-text-100 text-base font-medium">
                  Click on star to rate
                </p>
                <div className="flex items-center gap-px">
                  <StarIcon className="size-4 text-yellow-400" />
                  <StarIcon className="size-4 text-yellow-400" />
                  <StarIcon className="size-4 text-yellow-400" />
                  <StarIcon className="size-4 text-yellow-400" />
                  <StarIcon className="size-4 text-yellow-400" />
                </div>
              </div>
              <form action="#">
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label
                      htmlFor="review"
                      className="text-text-50 mb-2 block text-sm font-medium"
                    >
                      Full name
                    </label>
                    <Input type="text" placeholder="Adrio tate" />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="text-text-50 mb-2 block text-sm font-medium"
                    >
                      Email
                    </label>
                    <Input type="text" placeholder="info@gmail.com" />
                  </div>
                  <div>
                    <label
                      htmlFor="review"
                      className="text-text-50 mb-2 block text-sm font-medium"
                    >
                      Review
                    </label>
                    <TextArea
                      name="review"
                      id="review"
                      placeholder="Type your message"
                    ></TextArea>
                  </div>
                </div>
                <div className="my-6">
                  <label
                    htmlFor="image"
                    className="text-text-100 flex items-center gap-2 font-medium"
                  >
                    <input
                      type="file"
                      name="image"
                      id="image"
                      className="hidden"
                    />
                    <Link1AngularRight />
                    Add Image
                  </label>
                </div>
                <div>
                  <Button>Submit your review</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
