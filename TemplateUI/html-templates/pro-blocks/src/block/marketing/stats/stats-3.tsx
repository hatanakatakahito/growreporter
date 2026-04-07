const statsData = [
  {
    title: 'Total Users',
    subtitle: '12,487',
    description: '+4.2% from last month',
  },
  {
    title: 'Design Completed',
    subtitle: '329',
    description: '+12 this week',
  },
  {
    title: 'Avg. Task Completion Time',
    subtitle: '1.8 Days',
    description: '-0.5 day from last month',
  },
  {
    title: 'Client Satisfaction',
    subtitle: '94%',
    description: '+3.1% improvement',
  },
];

export default function Stats3() {
  return (
    <section className="bg-background-soft-300 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Achievement
          </span>
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            Track how your project or team is performing in real time.
          </h2>
          <p className="text-text-100 px-5 text-center text-base lg:px-36">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statsData.map((item, i) => (
            <div
              key={i}
              className="bg-background-soft-50 flex flex-col items-center rounded-2xl px-8 py-10"
            >
              <span className="text-text-100 text-lg">{item.title}</span>
              <h3 className="text-title-50 mt-8 mb-4 text-6xl font-medium">
                {item.subtitle}
              </h3>
              <span className="bg-primary-50 text-primary-500 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm font-medium">
                <span className="bg-primary-500 h-1.5 w-1.5 rounded-full"></span>
                {item.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
