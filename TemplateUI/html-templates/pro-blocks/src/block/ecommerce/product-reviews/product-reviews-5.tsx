import {
  HalfStarIcon,
  Search1,
  StarIcon,
  ThumbsDown2,
  ThumbsUp2,
} from '@tailgrids/icons';

interface ReviewProps {
  date: string;
  title: string;
  content: string;
  name: string;
  thumbsUp: number;
  thumbsDown: number;
  imageUrl?: string;
}

const ReviewCard: React.FC<ReviewProps> = ({
  date,
  title,
  content,
  name,
  thumbsUp,
  thumbsDown,
  imageUrl,
}) => (
  <article className="bg-background-soft-50 rounded-2xl p-3">
    <div className="px-4 pt-6 pb-7">
      <div className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-px">
          {[...Array(4)].map((_, i) => (
            <StarIcon className="size-4 text-yellow-500" key={i} />
          ))}
          <HalfStarIcon className="size-4 text-yellow-500" />
        </div>
        <p className="text-text-100 text-sm">{date}</p>
      </div>
      <h3 className="text-title-50 mb-3 text-xl font-medium sm:text-2xl">
        {title}
      </h3>
      <p className="text-text-100 leading-6">{content}</p>
    </div>
    <div className="bg-background-50 flex flex-col justify-between gap-4 rounded-lg p-3 sm:flex-row">
      <div className="flex items-center gap-3">
        <img
          className="h-10 w-10 shrink-0 rounded-full"
          src={
            imageUrl ??
            ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-05/avatar-1.png'
          }
          alt={`${name} avatar`}
        />
        <h4 className="text-text-100 text-base font-medium">{name}</h4>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-text-100 text-base">This is helpful?</p>
        <div className="flex">
          <button className="text-text-100 flex cursor-pointer items-center gap-1 px-2.5 py-1 text-sm">
            <ThumbsUp2 className="size-4" />
            {thumbsUp}
          </button>
          <button className="text-text-100 flex cursor-pointer items-center gap-1 px-2.5 py-1 text-sm">
            <ThumbsDown2 className="size-4" />
            {thumbsDown}
          </button>
        </div>
      </div>
    </div>
  </article>
);

export default function ProductReviews5() {
  const reviews: ReviewProps[] = [
    {
      date: 'Jun 20, 2025',
      title: 'Great wireless earbuds in Budget',
      content:
        'I’ve tried several wireless earbuds in this price range, and these easily outperform them all. The bass is deep, the clarity is sharp, and they stay in place even during workouts. Battery life is excellent — lasted me almost 3 days on one charge.',
      name: 'Zaire Rose',
      thumbsUp: 12,
      thumbsDown: 1,
      imageUrl:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-05/avatar-1.png',
    },
    {
      date: 'Jun 15, 2025',
      title: 'Feels premium for the price.',
      content:
        'This smartwatch has completely changed my routine. It tracks my workouts, sleep, and even my stress levels with surprising accuracy. I love the customizable watch faces and how smoothly it syncs with my phone customizable watch.',
      name: 'Wade Warren',
      thumbsUp: 14,
      thumbsDown: 5,
      imageUrl:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-05/avatar-2.png',
    },
    {
      date: 'Apr 10, 2025',
      title: 'Finishing is a great touch. Great value!',
      content:
        'I’ve tried several wireless earbuds in this price range, and these easily outperform them all. The bass is deep, the clarity is sharp, and they stay in place even during workouts. Battery life is excellent — lasted me almost 3 days on one charge.',
      name: 'Kathryn Murphy',
      thumbsUp: 8,
      thumbsDown: 7,
      imageUrl:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-05/avatar-3.png',
    },
    {
      date: 'Jun 15, 2025',
      title: 'Nice support and solid build',
      content:
        'This smartwatch has completely changed my routine. It tracks my workouts, sleep, and even my stress levels with surprising accuracy. I love the customizable watch faces and how smoothly it syncs with my phone customizable watch.',
      name: 'Zaire Franci',
      thumbsUp: 45,
      thumbsDown: 4,
      imageUrl:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-05/avatar-4.png',
    },
  ];
  return (
    <section className="bg-background-50 py-10 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-11 max-w-md sm:mb-14">
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            Our Customer Says
          </h2>
          <p className="text-text-100 text-base leading-6 lg:pr-5">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="border-base-100 flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row">
          <div className="order-2 sm:order-1">
            <label className="text-text-100 mb-2 block text-base">
              Short By
            </label>
            <select className="border-base-200 bg-input-background text-title-50 flex h-11 w-full shrink-0 rounded-lg border px-3.5 py-2.5 pr-10 text-sm sm:w-auto">
              <option value="0">Most recent</option>
              <option value="1">15 Days</option>
              <option value="2">30 Days</option>
            </select>
          </div>
          <div className="order-1 sm:order-2">
            <label className="text-text-100 mb-2 block text-base">
              Search in review
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search for keyword, topic"
                className="focus:border-primary-300 bg-input-background focus:ring-primary-500/30 text-title-50 hover:placeholder:text-title-50 border-base-200 placeholder:text-input-placeholder-text h-11 w-full rounded-lg border px-4 py-2.5 pr-12 text-base ring-3 ring-transparent placeholder:text-sm focus:outline-0 lg:w-xs"
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2">
                <Search1 className="text-text-100 size-5" />
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 pt-8 lg:grid-cols-2">
          {reviews.map((review, index) => (
            <ReviewCard
              key={index}
              date={review.date}
              title={review.title}
              content={review.content}
              name={review.name}
              thumbsUp={review.thumbsUp}
              thumbsDown={review.thumbsDown}
              imageUrl={review.imageUrl}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
