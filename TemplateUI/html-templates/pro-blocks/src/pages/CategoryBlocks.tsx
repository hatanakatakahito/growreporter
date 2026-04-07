import { useState, useMemo, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBlocks, type BlockInfo } from '../utils/blocks';

const PreviewContainer = ({
  block,
  defaultOpen = false,
}: {
  block: BlockInfo;
  defaultOpen?: boolean;
}) => {
  const [showPreview, setShowPreview] = useState(defaultOpen);
  const BlockComponent = block.component;

  if (!showPreview) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-4 rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
        <p className="text-sm text-gray-500">
          Preview hidden to improve performance
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPreview(true)}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:ring-gray-700 dark:hover:bg-gray-700"
          >
            Load Preview
          </button>
          <Link
            to={`/preview/${block.category}/${block.subcategory}/${block.name}`}
            target="_blank"
            className="bg-primary-500 hover:bg-primary-600 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            Full Screen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-40 items-center justify-center text-gray-400">
          Loading component...
        </div>
      }
    >
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={() => setShowPreview(false)}
            className="bg-background-50/80 hover:bg-background-100 border-base-100 rounded border p-1 text-xs backdrop-blur-sm transition"
            title="Hide Preview"
          >
            Hide
          </button>
        </div>
        <div className="max-h-[600px] overflow-x-hidden overflow-y-auto rounded-lg bg-white dark:bg-gray-900">
          <BlockComponent />
        </div>
        <div className="border-t border-gray-100 bg-gray-50 p-2 text-center dark:border-gray-800 dark:bg-gray-800/50">
          <Link
            to={`/preview/${block.category}/${block.subcategory}/${block.name}`}
            target="_blank"
            className="text-primary-600 hover:text-primary-500 text-xs font-medium"
          >
            Open in new tab
          </Link>
        </div>
      </div>
    </Suspense>
  );
};

const CategoryBlocks = () => {
  const { category } = useParams<{ category: string }>();
  const [activeSubcat, setActiveSubcat] = useState<string>('all');

  const allBlocks = useMemo(() => getBlocks(), []);

  // Organize blocks by subcategory
  const blocksBySubcat = useMemo(() => {
    const result: Record<string, BlockInfo[]> = {};

    allBlocks.forEach((block) => {
      if (block.category !== category) return;

      if (!result[block.subcategory]) {
        result[block.subcategory] = [];
      }
      result[block.subcategory].push(block);
    });

    return result;
  }, [category, allBlocks]);

  const subcategories = Object.keys(blocksBySubcat);

  /* switching to useEffect below */
  const [prevCategory, setPrevCategory] = useState(category);

  if (category !== prevCategory) {
    setPrevCategory(category);
    setActiveSubcat(
      category === 'ai' && subcategories.length > 0 ? subcategories[0] : 'all',
    );
  } else if (
    category === 'ai' &&
    activeSubcat === 'all' &&
    subcategories.length > 0
  ) {
    // Initial load handling
    setActiveSubcat(subcategories[0]);
  }

  const filteredSubcategories =
    activeSubcat === 'all'
      ? subcategories
      : subcategories.filter((sc) => sc === activeSubcat);

  return (
    <div className="bg-background-50 min-h-screen p-8">
      <div className="mb-8">
        <Link
          to="/"
          className="text-text-100 hover:text-primary-600 mb-4 inline-flex items-center text-sm font-medium transition-colors"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Categories
        </Link>
        <h1 className="text-title-100 mb-4 text-3xl font-bold capitalize">
          {category} Blocks
        </h1>

        {/* Subcategory Filter */}
        <div className="flex flex-wrap gap-2">
          {category !== 'ai' && (
            <button
              onClick={() => setActiveSubcat('all')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeSubcat === 'all'
                  ? 'bg-primary-500 text-white'
                  : 'bg-background-100 text-text-100 hover:bg-background-200'
              }`}
            >
              All
            </button>
          )}
          {subcategories.map((subcat) => (
            <button
              key={subcat}
              onClick={() => setActiveSubcat(subcat)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeSubcat === subcat
                  ? 'bg-primary-500 text-white'
                  : 'bg-background-100 text-text-100 hover:bg-background-200'
              }`}
            >
              {subcat.replace(/-/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-12">
        {filteredSubcategories.map((subcat) => (
          <div key={subcat} className="space-y-6">
            <h2 className="text-title-100 border-base-100 border-b pb-2 text-2xl font-semibold capitalize">
              {subcat.replace(/-/g, ' ')}
            </h2>
            <div className="grid gap-8">
              {blocksBySubcat[subcat].map((block, index) => {
                return (
                  <div
                    key={index}
                    className="bg-background-100 border-base-100 overflow-hidden rounded-xl border p-4 shadow-sm"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-title-100 text-lg font-medium capitalize">
                        {block.name.replace(/-/g, ' ')}
                      </h3>
                      <Link
                        to={`/preview/${category}/${subcat}/${block.name}`}
                        target="_blank"
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Open New Tab
                      </Link>
                    </div>

                    {/* Preview Area */}
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                      <PreviewContainer
                        block={block}
                        defaultOpen={
                          ![
                            'dashboard',
                            'application',
                            'marketing',
                            'ecommerce',
                            'ai',
                          ].includes(category || '')
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredSubcategories.length === 0 && (
          <div className="text-text-100 py-12 text-center">
            No blocks found for this category.
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryBlocks;
