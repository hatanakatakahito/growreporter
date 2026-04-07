const teamData = [
  {
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-02/team-1.png',
    name: 'Olivia Carter',
    title: 'CEO & Founder',
  },
  {
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-02/team-2.png',
    name: 'Liam Anderson',
    title: 'Chief Design Officer',
  },
  {
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-02/team-3.png',
    name: 'Ethan Bennett',
    title: 'Lead Developer',
  },
  {
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-02/team-4.png',
    name: 'Sophia Nguyen',
    title: 'Marketing Director',
  },
  {
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-02/team-5.png',
    name: 'Mia Roberts',
    title: 'Project Manager',
  },
  {
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-02/team-6.png',
    name: 'Ava Thompson',
    title: 'Customer Success Manager',
  },
];

export default function Teams2() {
  return (
    <section className="bg-background-50 py-16 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="flex flex-col gap-5 lg:flex-row lg:gap-10">
          <div className="mb-5 max-w-md lg:mb-0 lg:w-2/5">
            <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
              Team
            </span>
            <h2 className="text-title-50 mb-4 text-3xl font-semibold sm:text-4xl">
              Our Creative Minds
            </h2>
            <p className="text-text-100 text-base lg:pr-10">
              There are many variations of available but the majority have
              suffered alteration in some form.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:w-3/5 xl:gap-8 xl:pl-16">
            {teamData.map((item, i) => (
              <article key={i}>
                <div className="flex items-center gap-5">
                  <div className="shrink-0">
                    <img
                      src={item.image}
                      className="ring-background-soft-400 h-20 w-20 rounded-full ring-4"
                      alt=""
                    />
                  </div>
                  <div className="grow">
                    <h3 className="text-title-50 text-xl font-semibold">
                      {item.name}
                    </h3>
                    <span className="text-text-100 text-sm">{item.title}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
