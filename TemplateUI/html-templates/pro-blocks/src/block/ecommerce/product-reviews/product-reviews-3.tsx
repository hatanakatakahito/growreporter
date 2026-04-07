import { StarIcon, ThumbsDown2, ThumbsUp2 } from '@tailgrids/icons';

interface ReviewProps {
  name: string;
  date: string;
  title: string;
  content: string;
  thumbsUp: number;
  thumbsDown: number;
}

const ReviewCard: React.FC<ReviewProps> = ({
  name,
  date,
  title,
  content,
  thumbsUp,
  thumbsDown,
}) => (
  <article className="border-base-100 rounded-xl border p-5 sm:p-8">
    <div>
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="shrink-0">
            <img
              className="h-14 w-14 rounded-full"
              src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/reviews/review-03/image-1.png"
              alt="avatar"
            />
          </div>
          <div className="space-y-1">
            <h4 className="text-title-50 text-base font-semibold">{name}</h4>

            <span className="bg-badge-success-background text-badge-success-text text-badge-success flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
              <span className="bg-badge-success-icon-color h-1.5 w-1.5 rounded-full" />
              Verified Purchase
            </span>
          </div>
        </div>
        <p className="text-text-100 text-sm">{date}</p>
      </div>
      <div className="mt-9 flex items-center gap-px">
        {[...Array(5)].map((_, i) => (
          <StarIcon className="size-4 text-yellow-500" key={i} />
        ))}
      </div>
      <h3 className="text-title-50 my-4 text-xl font-medium sm:text-2xl">
        {title}
      </h3>
      <p className="text-text-100 text-base leading-6 font-normal">{content}</p>
      <div className="mt-10 flex items-center gap-3">
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
  </article>
);

const reviews: ReviewProps[] = [
  {
    name: 'Zaire Franci',
    date: 'Jun 15, 2025',
    title: 'Great wireless earbuds in this price range',
    content:
      'I’ve tried several wireless earbuds in this price range, and these easily outperform them all. The bass is deep, the clarity is sharp, and they stay in place even during workouts. Battery life is excellent — lasted me almost 3 days on one charge',
    thumbsUp: 7,
    thumbsDown: 4,
  },
  {
    name: 'Kathryn Murphy',
    date: 'May 17, 2025',
    title: 'Feels premium for the price',
    content:
      'This smartwatch has completely changed my routine. It tracks my workouts, sleep, and even my stress levels with surprising accuracy. I love the customizable watch faces and how smoothly it syncs with my phone.',
    thumbsUp: 46,
    thumbsDown: 5,
  },
  {
    name: 'Eleanor Pena',
    date: 'Feb 14, 2025',
    title: 'I’m obsessed! Long time battery life',
    content:
      "This phone stand is surprisingly sturdy. I use it every day on my desk and even during video calls. It's minimal but stable — and the adjustable angle is a great touch. Great value!",
    thumbsUp: 4,
    thumbsDown: 4,
  },
  {
    name: 'Wade Warren',
    date: 'Feb 04, 2025',
    title: 'Nice support and solid build',
    content:
      "I bought this for travel and it hasn’t let me down once. Charges my phone almost 3 times fully and has a quick charge port that’s super useful. It's compact, well-designed, and feels durable in hand.",
    thumbsUp: 14,
    thumbsDown: 4,
  },
];

export default function ProductReviews3() {
  return (
    <section className="bg-background-50 py-10 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {reviews.map((review, index) => (
            <ReviewCard
              key={index}
              name={review.name}
              date={review.date}
              title={review.title}
              content={review.content}
              thumbsUp={review.thumbsUp}
              thumbsDown={review.thumbsDown}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
