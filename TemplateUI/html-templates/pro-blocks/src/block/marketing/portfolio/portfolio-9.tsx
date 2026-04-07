import { Button } from '@/components/core/button';

const projects = [
  {
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-09/Image.jpg',
    category: 'Arimo/Marketing',
    title: 'Digital Transformation Strategy',
    description:
      'Lorem ipsum dolor sit amet consectetur. Sed erat egestas et mattis Lorem ipsum.',
  },
  {
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-09/Image-1.jpg',
    category: 'Kafahf/Ux Audit',
    title: 'B2B Platform UX Audit',
    description:
      'Lorem ipsum dolor sit amet consectetur. Sed erat egestas et mattis Lorem ipsum.',
  },
  {
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-09/Image-2.jpg',
    category: 'Brand Identity Refresh',
    title: 'Aztech/Branding',
    description:
      'Lorem ipsum dolor sit amet consectetur. Sed erat egestas et mattis Lorem ipsum.',
  },
];

export default function Portfolio9() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
              Featured Work
            </span>
            <h2 className="text-title-50 mb-4 text-left text-4xl font-semibold sm:text-5xl">
              Proven Work That Performs
            </h2>
            <p className="text-text-100 pr-5 text-left text-base sm:pr-44">
              There are many variations of available but the majority have
              suffered alteration in some form.
            </p>
          </div>
          <div>
            <Button className="h-12">
              <a href="javascript:void(0)" className="flex">
                Explore All Projects
              </a>
            </Button>
          </div>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <article key={index}>
              <div>
                <img
                  src={project.image}
                  className="block h-full w-full rounded-xl"
                  alt={project.title}
                />
              </div>
              <div className="mt-6 px-2.5">
                <span className="text-text-100 mb-2 inline-block">
                  {project.category}
                </span>
                <h3 className="text-title-50 text-2xl font-medium">
                  <a href="javascript:void(0)">{project.title}</a>
                </h3>
                <p className="text-text-100 mt-2 text-base">
                  {project.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
