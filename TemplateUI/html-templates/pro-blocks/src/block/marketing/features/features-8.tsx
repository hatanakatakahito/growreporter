import { Folder1, Row, UserPencil } from '@tailgrids/icons';

type Feature = {
  title: string;
  desc: string;
  icon: React.ReactNode;
};

const features: Feature[] = [
  {
    title: 'Service That Goes Beyond Expectations',
    desc: 'Lorem ipsum dolor sit amet consectetur. Dolor eget ante ut non scelerisque ullamcorper lectus sodales.',
    icon: <UserPencil />,
  },
  {
    title: 'A curated collection of recent work',
    desc: 'Lorem ipsum dolor sit amet consectetur. Dolor eget ante ut non scelerisque ullamcorper lectus sodales.',
    icon: <Row />,
  },
  {
    title: 'Simple. Functional. Beautiful.',
    desc: 'Lorem ipsum dolor sit amet consectetur. Dolor eget ante ut non scelerisque ullamcorper lectus sodales.',
    icon: <Folder1 />,
  },
];

function FeatureItem({ feature }: { feature: Feature }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div>
        <div className="bg-primary-500 text-white-100 inline-flex h-14 w-14 items-center justify-center rounded-xl">
          {feature.icon}
        </div>
      </div>
      <div>
        <h3 className="text-title-50 mb-3 text-2xl font-medium">
          {feature.title}
        </h3>
        <p className="text-text-100">{feature.desc}</p>
      </div>
    </div>
  );
}

export default function Features8(): React.ReactElement {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-5 inline-block rounded-lg px-3.5 py-1 text-base">
            Features
          </span>
          <h2 className="text-title-50 mb-2 text-center text-4xl font-semibold sm:text-5xl">
            Everything You Need in One Place
          </h2>
          <p className="text-text-100 text-center text-base sm:px-20">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>

        <div className="flex flex-col items-center gap-10 lg:flex-row">
          <div className="order-2 lg:order-1 lg:w-1/2">
            <div className="space-y-10">
              {features.map((f, i) => (
                <FeatureItem key={i} feature={f} />
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2 lg:w-1/2">
            <div className="relative">
              <img
                src=" https://cdn-tailgrids.b-cdn.net/3.0/marketing/features/feature-08/image.jpg"
                alt="Person with headphones"
                className="h-full w-full rounded-3xl object-cover"
              />
              <button
                aria-label="Play video"
                className="bg-foreground-soft-500/40 absolute top-1/2 left-1/2 flex h-30 w-30 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur-sm"
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="60"
                  height="61"
                  viewBox="0 0 60 61"
                  fill="none"
                >
                  <path
                    d="M16.9375 13.9876L16.9375 47.0126C16.9375 49.3582 19.5084 50.7965 21.5073 49.5691L48.399 33.0566C50.306 31.8857 50.306 29.1145 48.399 27.9436L21.5073 11.4311C19.5084 10.2037 16.9375 11.642 16.9375 13.9876Z"
                    fill="#F9FAFB"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
