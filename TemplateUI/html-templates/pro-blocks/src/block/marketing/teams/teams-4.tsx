import { Facebook, Linkedin, Twitter } from '@tailgrids/icons';

interface Social {
  icon: React.ElementType;
  href: string;
}

interface TeamMember {
  name: string;
  role: string;
  description: string;
  image: string;
  socials: Social[];
}

const teamMembers: TeamMember[] = [
  {
    name: "Debbie O'Kon",
    role: 'CEO & Founder',
    description:
      'Lorem ipsum dolor sit amet consectetur. Phasellus dictum eget maecenas morbi suspendisse.',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-04/team-1.jpg',
    socials: [
      { icon: Linkedin, href: '#' },
      { icon: Twitter, href: '#' },
      { icon: Facebook, href: '#' },
    ],
  },
  {
    name: 'Olivia Greene',
    role: 'CO-Founder',
    description:
      'Lorem ipsum dolor sit amet consectetur. Phasellus dictum eget maecenas morbi suspendisse.',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-04/team-2.jpg',
    socials: [
      { icon: Linkedin, href: '#' },
      { icon: Twitter, href: '#' },
      { icon: Facebook, href: '#' },
    ],
  },
  {
    name: 'Noah Kim',
    role: 'Project Manager',
    description:
      'Lorem ipsum dolor sit amet consectetur. Phasellus dictum eget maecenas morbi suspendisse.',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-04/team-3.jpg',
    socials: [
      { icon: Linkedin, href: '#' },
      { icon: Twitter, href: '#' },
      { icon: Facebook, href: '#' },
    ],
  },
  {
    name: 'Chloe Wagner',
    role: 'Motion Designer',
    description:
      'Lorem ipsum dolor sit amet consectetur. Phasellus dictum eget maecenas morbi suspendisse.',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-04/team-4.jpg',
    socials: [
      { icon: Linkedin, href: '#' },
      { icon: Twitter, href: '#' },
      { icon: Facebook, href: '#' },
    ],
  },
  {
    name: 'Jackson Lee',
    role: 'Lead Developer',
    description:
      'Lorem ipsum dolor sit amet consectetur. Phasellus dictum eget maecenas morbi suspendisse.',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-04/team-5.jpg',
    socials: [
      { icon: Linkedin, href: '#' },
      { icon: Twitter, href: '#' },
      { icon: Facebook, href: '#' },
    ],
  },
  {
    name: 'Emily Chen',
    role: 'Brand Designer',
    description:
      'Lorem ipsum dolor sit amet consectetur. Phasellus dictum eget maecenas morbi suspendisse.',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-04/team-6.jpg',
    socials: [
      { icon: Linkedin, href: '#' },
      { icon: Twitter, href: '#' },
      { icon: Facebook, href: '#' },
    ],
  },
];

function TeamCard({ member }: { member: TeamMember }) {
  return (
    <article className="hover:border-primary-500 bg-background-soft-50 rounded-2xl border-2 border-transparent p-7 transition">
      <div className="flex items-center justify-between">
        <div>
          <img
            src={member.image}
            className="h-16 w-16 rounded-lg object-cover"
            alt={member.name}
          />
        </div>
        <div className="flex gap-4">
          {member.socials.map((social, index) => {
            const Icon = social.icon;
            return (
              <a
                key={index}
                href={social.href}
                className="hover:text-primary-500 text-text-100 transition"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon className="size-5" />
              </a>
            );
          })}
        </div>
      </div>
      <div className="divide-base-200 mt-6 mb-4 flex items-center divide-x">
        <h3 className="text-title-50 pr-3 text-base font-semibold">
          {member.name}
        </h3>
        <span className="text-text-100 pl-3 text-base">{member.role}</span>
      </div>
      <p className="text-text-100 text-base">{member.description}</p>
    </article>
  );
}

export default function Teams4() {
  return (
    <section className="bg-background-50 py-16 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-md text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Team
          </span>
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            Our Core Team
          </h2>
          <p className="text-text-100 text-base">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member, index) => (
            <TeamCard key={index} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
}
