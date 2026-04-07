import { useState } from 'react';

interface PortfolioItem {
  id: number;
  image: string;
  title: string;
  description: string;
  client: string;
  role: string;
  rating: string;
}

export default function Portfolio8() {
  const [portfolioItems] = useState<PortfolioItem[]>([
    {
      id: 1,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-08/Image.jpg',
      title: 'MediSlot',
      description:
        'Lorem ipsum dolor sit amet consectetur. Sit viverra dui eget lobortis ac id amet condimentum amet. Vitae sit consectetur aliquam non tortor malesuada quisque in sit.',
      client: 'Medicare Health',
      role: 'Digital Manager',
      rating: '4.8/5',
    },
    {
      id: 2,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-08/Image-1.jpg',
      title: 'Learnify',
      description:
        'Lorem ipsum dolor sit amet consectetur. Sit viverra dui eget lobortis ac id amet condimentum amet. Vitae sit consectetur aliquam non tortor malesuada quisque in sit.',
      client: 'Medicare Health',
      role: 'Project Manager',
      rating: '4.5/5',
    },
  ]);

  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-14 max-w-2xl">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Featured Work
          </span>
          <h2 className="text-title-50 mb-4 text-left text-4xl font-semibold sm:text-5xl">
            From Vision to Reality
          </h2>
          <p className="text-text-100 pr-5 text-left text-base sm:pr-44">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="space-y-6">
          {portfolioItems.map((item) => (
            <article
              key={item.id}
              className="bg-background-soft-100 flex flex-col gap-3 rounded-xl p-3 sm:gap-6 sm:p-6 lg:flex-row"
            >
              <div className="lg:w-1/2">
                <img
                  src={item.image}
                  className="h-full w-full rounded-xl"
                  alt={item.title}
                />
              </div>
              <div className="bg-background-50 rounded-xl px-5 py-7 sm:p-10 lg:w-1/2">
                <h3 className="text-title-50 mb-5 text-3xl font-medium sm:text-4xl">
                  <a href="javascript:void(0)">{item.title}</a>
                </h3>
                <p className="text-text-100 mb-14">{item.description}</p>

                <ul className="divide-base-100 divide-y">
                  <li className="flex items-center justify-between py-5">
                    <span className="text-text-50 text-xl">Client</span>
                    <span className="text-text-100 text-xl">{item.client}</span>
                  </li>
                  <li className="flex items-center justify-between py-5">
                    <span className="text-text-50 text-xl">Role</span>
                    <span className="text-text-100 text-xl">{item.role}</span>
                  </li>
                  <li className="flex items-center justify-between py-5">
                    <span className="text-text-50 text-xl">Rating</span>
                    <span className="text-text-100 text-xl">{item.rating}</span>
                  </li>
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
