const statsData = [
  {
    title: '2M+',
    subtitle: 'Products Sold',
    description: 'We’ve helped over 2 million customers find the products',
  },
  {
    title: '98%',
    subtitle: '98 Sold',
    description: 'With a 98% satisfaction rate and glowing feedback.',
  },
  {
    title: '20%',
    subtitle: 'Growth Year Over Year',
    description: 'We’re leading the charge in innovation',
  },
  {
    title: '150+',
    subtitle: 'New Features Added',
    description: 'Over 150+ Features added to our all product',
  },
];

export default function Stats1() {
  return (
    <section className="bg-background-50 py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            Our Impact in Numbers
          </h2>
          <p className="text-text-100 text-center text-base lg:px-10 xl:px-16">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-y-0">
          {statsData.map((item, i) => (
            <div key={i + 1} className="border-base-200 border-l px-10">
              <h3 className="text-title-50 mb-5 text-6xl font-semibold">
                {item.title}
              </h3>
              <span className="text-text-50 mb-2 block text-base font-medium">
                {item.subtitle}
              </span>
              <p className="text-text-100 text-base">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
