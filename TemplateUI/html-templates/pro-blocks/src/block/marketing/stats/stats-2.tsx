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

export default function Stats2() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:gap-8">
          <div>
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/marketing/stats/stat-02/image.png"
              className="w-full rounded-xl"
              alt=""
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:gap-8">
            {statsData.map((item, i) => (
              <div
                key={i}
                className="bg-background-soft-100 rounded-2xl px-8 py-10"
              >
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
      </div>
    </section>
  );
}
