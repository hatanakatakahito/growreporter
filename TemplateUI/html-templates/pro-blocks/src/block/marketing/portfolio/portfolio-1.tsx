const projects = [
  {
    title: 'Static Hosting platform',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-01/image.jpg',
    company: 'Static.run',
    category: 'Logo Branding',
    year: '2025',
    description:
      'Static.run is a high-performance fast, secure, and reliable deployment of static websites.',
  },
  {
    title: 'Build Smarter with AiAgent',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-01/image-1.jpg',
    company: 'Ai Agent',
    category: 'Web Design',
    year: '2025',
    description: 'Build Next-Gen AI Products with our Powerful Agent UI Kit',
  },
  {
    title: 'Bookly For Better books',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-01/image-2.jpg',
    company: 'Bookly',
    category: 'App Design',
    year: '2024',
    description:
      'Your Smart Companion for a Better Reading Experience in any subject',
  },
];

const ProjectCard = ({ project }: any) => (
  <article className="bg-background-50 rounded-2xl p-6">
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-title-50 text-sm font-medium">
          {project.company}
        </span>
        <span className="bg-text-100 h-1 w-1 rounded-full"></span>
        <span className="text-text-50 text-sm">{project.category}</span>
      </div>
      <div>
        <span className="text-text-100 text-sm">{project.year}</span>
      </div>
    </div>
    <div className="my-6">
      <img
        src={project.image}
        className="w-full rounded-xl"
        alt={project.title}
      />
    </div>
    <h3 className="text-title-50 mb-3 text-2xl font-semibold">
      <a href="javascript:void(0)">{project.title}</a>
    </h3>
    <p className="text-text-100 text-base">{project.description}</p>
  </article>
);

export default function Portfolio1() {
  return (
    <section className="bg-background-soft-100 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Featured Work
          </span>
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            Projects That Deliver Results
          </h2>
          <p className="text-text-100 px-5 text-center text-base sm:px-24">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:gap-8">
          {projects.map((project, idx) => (
            <ProjectCard key={idx} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
