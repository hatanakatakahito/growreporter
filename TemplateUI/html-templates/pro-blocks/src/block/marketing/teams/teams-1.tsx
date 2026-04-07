import { Dribbble, Linkedin, Twitter } from '@tailgrids/icons';

const teamData = [
  {
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-01/team-1.jpg',
    name: 'Olivia Carter',
    title: 'CEO & Founder',
  },
  {
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-01/team-2.jpg',
    name: 'Liam Anderson',
    title: 'Chief Design Officer',
  },
  {
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-01/team-3.jpg',
    name: 'Ethan Bennett',
    title: 'Lead Developer',
  },
  {
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-01/team-4.jpg',
    name: 'Sophia Nguyen',
    title: 'Marketing Director',
  },
];

export default function Teams1() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-16 max-w-md">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Team
          </span>
          <h2 className="text-title-50 mb-4 text-3xl font-semibold sm:text-4xl">
            Meet Our Experts
          </h2>
          <p className="text-text-100 text-base">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {teamData.map((item, i) => (
            <article key={i}>
              <img src={item.image} className="w-full rounded-2xl" alt="" />
              <h3 className="text-title-50 mt-5 text-xl font-semibold">
                {item.name}
              </h3>
              <span className="text-text-100 text-sm">{item.title}</span>
              <div className="mt-8 flex gap-6">
                <a
                  href="http://"
                  className="hover:text-primary-500 text-text-100 transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter />
                </a>
                <a
                  href="http://"
                  className="hover:text-primary-500 text-text-100 transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin />
                </a>
                <a
                  href="http://"
                  className="hover:text-primary-500 text-text-100 transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Dribbble />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
