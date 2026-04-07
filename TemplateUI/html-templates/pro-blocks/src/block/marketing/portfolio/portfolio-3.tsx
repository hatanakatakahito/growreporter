import { Button } from '@/components/core/button';

const projects = [
  {
    name: 'Bengo',
    logo: ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-03/logo.svg',
    description:
      'Bengo provides machine learning platforms for predictive analytics, empowering businesses to forecast trends and automate workflows.',
    tags: ['Python', 'TensorFlow', 'AWS'],
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-03/image.jpg',
    link: '#',
  },
  {
    name: 'Cloudly',
    logo: ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-03/logo-1.svg',
    description:
      'Cloudly helps businesses deploy, manage, and scale their cloud infrastructure with custom DevOps pipelines and 24/7 support.',
    tags: ['Kubernetes', 'Jenkins', 'AWS'],
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-03/image-1.jpg',
    link: '#',
  },
];

type ProjectCardProps = {
  logo: string;
  description: string;
  tags: string[];
  image: string;
  link: string;
};

const ProjectCard = ({
  logo,
  description,
  tags,
  image,
  link,
}: ProjectCardProps) => (
  <article className="bg-background-50 flex flex-col rounded-xl md:flex-row">
    <div className="flex-1 px-5 py-7 lg:px-16 lg:py-14">
      <div>
        <img src={logo} className="mb-5" alt="Project Logo" />
        <p className="text-text-100 mb-5 text-base">{description}</p>
        <div className="mb-8 flex items-center gap-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="bg-badge-neutral-background text-badge-neutral-text rounded-full px-3 py-1"
            >
              {tag}
            </span>
          ))}
        </div>

        <Button>
          <a href={link}>Visit Website</a>
        </Button>
      </div>
    </div>
    <div className="p-1.5">
      <img
        src={image}
        className="block h-full w-full rounded-xl"
        alt="Project Preview"
      />
    </div>
  </article>
);

export default function Portfolio3() {
  return (
    <section className="bg-background-soft-100 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Featured Work
          </span>
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            What We’ve Been Building
          </h2>
          <p className="text-text-100 px-5 text-center text-base sm:px-24">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="mx-auto max-w-[992px]">
          <div className="space-y-6">
            {projects.map((project, index) => (
              <ProjectCard key={index} {...project} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
