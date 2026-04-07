import { ArrowAngularTopRight } from '@tailgrids/icons';

interface PortfolioItem {
  image: string;
  title: string;
  link: string;
  tags: string[];
}

const portfolioItems: PortfolioItem[] = [
  {
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-07/Card.jpg',
    title: 'RoboAi',
    link: '#',
    tags: ['AI', 'Product', 'Design'],
  },
  {
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-07/Card-1.jpg',
    title: 'Sprakel',
    link: '#',
    tags: ['Tech', 'Product', 'Brand'],
  },
];

export default function Portfolio7() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Featured Work
          </span>
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            Tech Projects & Solutions
          </h2>
          <p className="text-text-100 px-5 text-center text-base sm:px-24">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
          {portfolioItems.map((item, index) => (
            <article
              key={index}
              className="group relative overflow-hidden rounded-3xl"
            >
              <div className="bg-foreground-soft-500/20 absolute inset-0 z-10 h-full w-full rounded-3xl"></div>
              <img
                src={item.image}
                className="h-full w-full rounded-3xl transition-transform duration-300 group-hover:scale-105"
                alt={item.title}
              />
              <div className="absolute inset-0 z-20 flex flex-col justify-between p-7">
                <div className="flex items-center justify-between">
                  <h3 className="text-white-100 text-2xl font-semibold sm:text-3xl">
                    {item.title}
                  </h3>
                  <a
                    href={item.link}
                    className="bg-background-50 text-title-50 hover:bg-background-soft-100 group/arrow inline-flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-200"
                  >
                    <span className="relative flex h-5 w-5 items-center justify-center overflow-hidden">
                      <span className="absolute transition-all duration-300 ease-in-out group-hover/arrow:translate-x-5 group-hover/arrow:-translate-y-5">
                        <ArrowAngularTopRight />
                      </span>
                      <span className="absolute -translate-x-5 translate-y-5 transition-all duration-300 ease-in-out group-hover/arrow:translate-x-0 group-hover/arrow:translate-y-0">
                        <ArrowAngularTopRight />
                      </span>
                    </span>
                  </a>
                </div>
                <div className="mt-7 flex items-center gap-2.5">
                  {item.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="bg-badge-neutral-background text-badge-neutral-text inline-flex h-7 items-center justify-center rounded-full px-3 py-1 text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
