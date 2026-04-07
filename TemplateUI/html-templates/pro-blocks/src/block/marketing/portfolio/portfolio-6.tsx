import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Filter {
  id: string;
  name: string;
}

interface PortfolioItem {
  image: string;
  title: string;
  link: string;
  description: string;
  tags: string[];
  categories: string[];
}

const filters: Filter[] = [
  { id: 'all', name: 'All' },
  { id: 'web-design', name: 'Web Design' },
  { id: 'app-design', name: 'App Design' },
  { id: 'development', name: 'Development' },
  { id: 'branding', name: 'Branding' },
  { id: 'saas', name: 'SaaS' },
];

const portfolioItems: PortfolioItem[] = [
  {
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-06/Image.jpg',
    title: 'SpendSync',
    link: '#',
    description:
      'Lorem ipsum dolor sit amet consectetur. Sit viverra dui eget lobortis ac id amet condimentum amet.',
    tags: ['Startup', 'Business'],
    categories: ['web-design', 'development'],
  },
  {
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-06/Image-1.jpg',
    title: 'Rezoom.AI',
    link: '#',
    description:
      'Lorem ipsum dolor sit amet consectetur. Sit viverra dui eget lobortis ac id amet condimentum amet.',
    tags: ['AI', 'SaaS', 'Productivity'],
    categories: ['saas', 'development'],
  },
  {
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-06/Image-2.jpg',
    title: 'Craftfolio',
    link: '#',
    description:
      'Lorem ipsum dolor sit amet consectetur. Sit viverra dui eget lobortis ac id amet condimentum amet.',
    tags: ['Creator Tools', 'Web App', 'No-Code'],
    categories: ['web-design', 'app-design'],
  },
  {
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-06/Image-3.jpg',
    title: 'PropBrowse',
    link: '#',
    description:
      'Lorem ipsum dolor sit amet consectetur. Sit viverra dui eget lobortis ac id amet condimentum amet.',
    tags: ['PropTech', 'Marketplace'],
    categories: ['web-design', 'development'],
  },
  {
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-06/Image.jpg',
    title: 'BrandForge',
    link: '#',
    description:
      'Lorem ipsum dolor sit amet consectetur. Sit viverra dui eget lobortis ac id amet condimentum amet.',
    tags: ['Identity', 'Visual Design'],
    categories: ['branding'],
  },
  {
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-06/Image-1.jpg',
    title: 'TaskFlow Mobile',
    link: '#',
    description:
      'Lorem ipsum dolor sit amet consectetur. Sit viverra dui eget lobortis ac id amet condimentum amet.',
    tags: ['Mobile', 'Productivity'],
    categories: ['app-design', 'development'],
  },
  {
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-06/Image-2.jpg',
    title: 'CloudMetrics',
    link: '#',
    description:
      'Lorem ipsum dolor sit amet consectetur. Sit viverra dui eget lobortis ac id amet condimentum amet.',
    tags: ['Analytics', 'Dashboard'],
    categories: ['saas', 'web-design'],
  },
  {
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-06/Image-3.jpg',
    title: 'NexaBrand',
    link: '#',
    description:
      'Lorem ipsum dolor sit amet consectetur. Sit viverra dui eget lobortis ac id amet condimentum amet.',
    tags: ['Logo', 'Brand Strategy'],
    categories: ['branding'],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0, 0, 0.2, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
};

export default function Portfolio6() {
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredItems =
    activeFilter === 'all'
      ? portfolioItems
      : portfolioItems.filter((item) => item.categories.includes(activeFilter));

  const handleFilterClick = (filterId: string) => {
    setActiveFilter(filterId);
  };

  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Featured Work
          </span>
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            Innovations We've Built
          </h2>
          <p className="text-text-100 px-5 text-center text-base sm:px-24">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="mx-auto max-w-3xl">
          <ul className="mb-16 flex flex-wrap justify-center gap-3">
            {filters.map((filter) => (
              <li key={filter.id} className="relative">
                <button
                  onClick={() => handleFilterClick(filter.id)}
                  className={`relative z-10 flex h-12 cursor-pointer items-center justify-center rounded-full px-5 py-3 text-base font-medium transition-colors duration-200 ${
                    activeFilter === filter.id
                      ? 'text-white-100'
                      : 'bg-background-soft-100 text-title-50 hover:bg-background-soft-500'
                  }`}
                >
                  {activeFilter === filter.id && (
                    <motion.span
                      layoutId="activeFilterTab"
                      className="bg-primary-500 absolute inset-0 z-[-1] rounded-full"
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 40,
                      }}
                    />
                  )}
                  {filter.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFilter}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="grid grid-cols-1 gap-10 md:grid-cols-2"
          >
            {filteredItems.map((item, index) => (
              <motion.article
                key={`${activeFilter}-${index}`}
                variants={itemVariants}
                className={`pb-10 ${
                  index < 2 ? 'border-base-100 border-b' : ''
                } ${index === 2 ? 'md:border-0' : ''}`}
              >
                <div className="mb-7 overflow-hidden rounded-3xl">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full rounded-3xl transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <h3 className="text-title-50 mb-3 text-2xl font-semibold sm:text-3xl">
                  <a href={item.link}>{item.title}</a>
                </h3>
                <p className="text-text-100 text-base font-normal">
                  {item.description}
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-2">
                  {item.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="bg-badge-neutral-background text-badge-neutral-text inline-flex h-7 items-center justify-center rounded-full px-3 py-1 text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.article>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
