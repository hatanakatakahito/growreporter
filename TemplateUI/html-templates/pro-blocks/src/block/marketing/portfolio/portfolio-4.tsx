import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const categories = [
  { label: 'All' },
  { label: 'Web Design', count: 12 },
  { label: 'App Design', count: 6 },
  { label: 'Development', count: 14 },
  { label: 'Branding', count: 8 },
  { label: 'SaaS', count: 4 },
];

const projects = [
  {
    title: 'E-Commerce Web Revamp',
    categories: ['Startup', 'Business', 'Web Design'],
    description:
      'Crafted a sleek, conversion-focused design for a growing DTC brand, resulting in a 32% boost in sales.',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-04/image.jpg',
  },
  {
    title: 'Mobile App Concept',
    categories: ['Startup', 'App Design'],
    description:
      'Designed a lightweight productivity app with a clean UI and gesture-based interactions for faster task flow.',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-04/image-1.jpg',
  },
  {
    title: 'Clean dashboard for all business',
    categories: ['SaaS', 'Development'],
    description:
      'Crafted a sleek, conversion-focused design for a growing DTC brand, resulting in a 32% boost in sales.',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-04/image-2.jpg',
  },
  {
    title: 'Personal brand identity',
    categories: ['Branding', 'E-commerce'],
    description:
      'Created a bold, animated portfolio site that increased personal client inquiries by 60% in two months',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-04/image-3.jpg',
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

export default function Portfolio4() {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredProjects =
    selectedCategory === 'All'
      ? projects
      : projects.filter((project) =>
          project.categories.includes(selectedCategory),
        );
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-12 max-w-2xl">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Featured Work
          </span>
          <h2 className="text-title-50 mb-4 text-left text-4xl font-semibold sm:text-5xl">
            Case Studies & Highlights
          </h2>
          <p className="text-text-100 pr-5 text-left text-base sm:pr-24">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <ul className="mb-16 flex flex-wrap gap-3">
          {categories.map((cat) => (
            <li key={cat.label} className="relative">
              <button
                onClick={() => setSelectedCategory(cat.label)}
                className={`${
                  selectedCategory === cat.label
                    ? 'text-white-100'
                    : 'text-title-50 hover:bg-background-soft-50 border-base-100 border'
                } relative z-10 flex h-11 cursor-pointer items-center gap-2.5 rounded-full px-5 py-2.5 font-medium transition-colors duration-200 ${
                  cat.label === 'All' ? 'text-base' : 'text-sm'
                }`}
              >
                {selectedCategory === cat.label && (
                  <motion.span
                    layoutId="activeTab"
                    className="bg-primary-500 absolute inset-0 z-[-1] rounded-full"
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 40,
                    }}
                  />
                )}
                {cat.label}
                {cat.count !== undefined && (
                  <span
                    className={`${
                      selectedCategory === cat.label
                        ? 'text-primary-500 bg-primary-50'
                        : 'bg-background-soft-100'
                    } -mr-2 rounded-2xl px-2 py-1 text-xs transition-colors duration-200`}
                  >
                    {String(cat.count).padStart(2, '0')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCategory}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="grid grid-cols-1 gap-8 md:grid-cols-2"
          >
            {filteredProjects.map((project, i) => (
              <motion.article
                key={`${selectedCategory}-${i}`}
                variants={itemVariants}
              >
                <div className="overflow-hidden rounded-2xl">
                  <motion.img
                    src={project.image}
                    className="block w-full rounded-2xl transition-transform duration-300 hover:scale-105"
                    alt={project.title}
                  />
                </div>
                <div className="mt-7 mb-5 flex items-center gap-2">
                  {project.categories.map((tag) => (
                    <span
                      key={tag}
                      className="bg-background-soft-100 rounded-full px-3 py-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="text-title-50 mb-3 text-2xl font-semibold sm:text-3xl">
                  <a href="javascript:void(0)">{project.title}</a>
                </h3>
                <p className="text-text-100 text-base font-normal">
                  {project.description}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
