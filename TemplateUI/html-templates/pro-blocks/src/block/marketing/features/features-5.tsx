import { ArrowRight } from '@tailgrids/icons';

const features = [
  {
    thumbnail:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/features/feature-05/image.jpg',
    title: 'Empowered Workflows',
    description:
      'Lorem ipsum dolor sit amet consectetur. Metus lacus morbi pellentesque elit dictumst ',
    href: 'href',
  },
  {
    thumbnail:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/features/feature-05/image-1.jpg',
    title: 'Flexible Scheduling',
    description:
      'Lorem ipsum dolor sit amet consectetur. Metus lacus morbi pellentesque elit dictumst ',
    href: 'href',
  },
  {
    thumbnail:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/features/feature-05/image-2.jpg',
    title: 'Performance Insights',
    description:
      'Lorem ipsum dolor sit amet consectetur. Metus lacus morbi pellentesque elit dictumst ',
    href: 'href',
  },
];

export default function Features5() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-5 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Features
          </span>
          <h2 className="text-title-50 mb-2 text-center text-4xl font-semibold sm:text-5xl">
            Everything You Need to Grow Smarter
          </h2>
          <p className="text-text-100 text-center text-base sm:px-20">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div key={index}>
              <div className="border-base-100 rounded-2xl border p-3.5">
                <img
                  src={feature.thumbnail}
                  alt={feature.title}
                  className="h-full w-full rounded-xl object-cover"
                />
              </div>
              <h3 className="mt-5 mb-3">
                <a
                  href={feature.href}
                  className="text-title-50 text-2xl font-semibold"
                >
                  {feature.title}
                </a>
              </h3>
              <p className="text-text-100 mb-8 line-clamp-2 text-base">
                {feature.description}
              </p>
              <a
                href={feature.href}
                className="text-primary-500 flex items-center gap-2 text-base font-medium"
              >
                Learn More
                <ArrowRight />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
