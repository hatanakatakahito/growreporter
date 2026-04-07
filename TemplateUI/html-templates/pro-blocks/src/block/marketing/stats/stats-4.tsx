const statsData = [
  {
    title: '+120%',
    subtitle: 'Increase in user engagement',
    description:
      'After redesigning the dashboard experience for a SaaS platform.',
  },
  {
    title: '4.7/5',
    subtitle: 'Average user rating',
    description: 'Based on real-time feedback from customers on the platform.',
  },
  {
    title: '32%',
    subtitle: 'Bounce Rate',
    description: 'Compared to the previous flow, post-UX optimization.',
  },
];

export default function Stats4() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Achievement
          </span>
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            Smarter Work. Real Results
          </h2>
          <p className="text-text-100 text-center text-base lg:px-10">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          <div className="space-y-6">
            {statsData.map((item, i) => (
              <div
                key={i}
                className="bg-background-soft-100 rounded-2xl px-8 py-10"
              >
                <h3 className="text-title-50 mb-5 text-5xl font-semibold">
                  {item.title}
                </h3>
                <span className="text-text-50 mb-1 block text-lg font-medium">
                  {item.subtitle}
                </span>
                <p className="text-text-100 text-base">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="max-h-[660px]">
            <img
              src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/stats/stat-04/image.jpg"
              className="h-full w-full rounded-2xl object-cover"
              alt=""
            />
          </div>
        </div>
      </div>
    </section>
  );
}
