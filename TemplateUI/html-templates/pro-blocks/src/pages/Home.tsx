import { Link } from 'react-router-dom';

const categories = [
  {
    key: 'ai',
    title: 'AI Blocks',
    description: 'AI-powered components and widgets',
    color: 'bg-purple-500',
  },
  {
    key: 'application',
    title: 'Application UI',
    description: 'Core application building blocks',
    color: 'bg-blue-500',
  },
  {
    key: 'dashboard',
    title: 'Dashboard',
    description: 'Analytics, stats, and dashboard layouts',
    color: 'bg-indigo-500',
  },
  {
    key: 'ecommerce',
    title: 'E-commerce',
    description: 'Online store components and flows',
    color: 'bg-green-500',
  },
  {
    key: 'marketing',
    title: 'Marketing',
    description: 'Landing pages, heroes, and features',
    color: 'bg-orange-500',
  },
];

const Home = () => {
  return (
    <div className="bg-background-50 px-6 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-title-100 mb-8 text-center text-4xl font-extrabold tracking-tight">
          Blocks Categories
        </h1>
        <p className="text-text-100 mx-auto mb-16 max-w-2xl text-center text-lg">
          Browse our extensive collection of Tailwind CSS components organized
          by category.
        </p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.key}
              to={`/category/${category.key}`}
              className="bg-background-100 hover:bg-background-200 border-base-100 group flex flex-col overflow-hidden rounded-xl border shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className={`h-2 w-full ${category.color}`} />
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-title-100 group-hover:text-primary-600 mb-2 text-xl font-bold transition-colors">
                  {category.title}
                </h3>
                <p className="text-text-100 flex-1 text-sm leading-relaxed">
                  {category.description}
                </p>
                <div className="text-primary-600 mt-4 flex items-center text-sm font-semibold">
                  Browse Blocks
                  <svg
                    className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
