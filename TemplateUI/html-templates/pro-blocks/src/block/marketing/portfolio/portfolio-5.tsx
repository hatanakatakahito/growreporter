import { ChevronRight } from '@tailgrids/icons';

const projects = [
  {
    id: 1,
    title: 'AI Support Bot Platform',
    description:
      'Lorem ipsum dolor sit amet consectetur. Sit viverra dui eget lobortis ac id amet condimentum amet. Vitae sit consectetur aliquam non tortor malesuada quisque in sit.',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-05/image.jpg',
    link: '#',
  },
  {
    id: 2,
    title: 'Developer API Portal',
    description:
      'Lorem ipsum dolor sit amet consectetur. Sit viverra dui eget lobortis ac id amet condimentum amet. Vitae sit consectetur aliquam non tortor malesuada quisque in sit.',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-05/image-1.jpg',
    link: '#',
  },
];

export default function Portfolio5() {
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
          {projects.map((project, index) => (
            <article
              key={project.id}
              className="bg-background-soft-100 flex flex-col gap-3 rounded-xl p-3 lg:flex-row"
            >
              <div className="flex-1">
                <img
                  src={project.image}
                  className="h-full w-full rounded-xl object-cover"
                  alt={project.title}
                />
              </div>
              <div className="bg-background-50 flex-1 rounded-xl px-5 py-7 sm:p-10">
                <span className="text-text-100 mb-12 inline-block text-base">
                  {String(index + 1).padStart(2, '0')}/
                </span>
                <h3 className="text-title-50 mb-5 text-3xl font-semibold sm:text-4xl">
                  <a href={project.link}>{project.title}</a>
                </h3>
                <p className="text-text-100 mb-14">{project.description}</p>
                <a
                  href={project.link}
                  className="bg-primary-500 hover:bg-primary-600 group inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-center text-sm font-medium text-white transition-all duration-200"
                >
                  Visit Website
                  <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                    <ChevronRight />
                  </span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
