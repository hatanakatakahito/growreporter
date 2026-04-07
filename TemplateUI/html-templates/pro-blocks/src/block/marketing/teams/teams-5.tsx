import { Dribbble, Linkedin, Twitter } from '@tailgrids/icons';

interface Social {
  icon: React.ElementType;
  href: string;
}

interface TeamMember {
  name: string;
  role: string;
  description: string;
  image: string;
  profileLink: string;
  socials: Social[];
}

const teamMembers: TeamMember[] = [
  {
    name: "Debbie O'Kon",
    role: 'CTO & Co-Founder',
    description:
      'Strategic visionary with 15+ years of industry experience leading organizational growth.',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-05/image-1.jpg',
    profileLink: '#',
    socials: [
      { icon: Twitter, href: '#' },
      { icon: Linkedin, href: '#' },
      { icon: Dribbble, href: '#' },
    ],
  },
  {
    name: 'Eleanor Hessel',
    role: 'Project Manager',
    description:
      'Strategic visionary with 15+ years of industry experience leading organizational growth.',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-05/image-2.jpg',
    profileLink: '#',
    socials: [
      { icon: Twitter, href: '#' },
      { icon: Linkedin, href: '#' },
      { icon: Dribbble, href: '#' },
    ],
  },
  {
    name: 'Charlotte Bednar',
    role: 'Business Lead',
    description:
      'Strategic visionary with 15+ years of industry experience leading organizational growth.',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-05/image-3.jpg',
    profileLink: '#',
    socials: [
      { icon: Twitter, href: '#' },
      { icon: Linkedin, href: '#' },
      { icon: Dribbble, href: '#' },
    ],
  },
];

function TeamCard({ member }: { member: TeamMember }) {
  return (
    <article className="border-base-100 rounded-2xl border">
      <div className="to-primary-700 rounded-t-2xl bg-linear-to-r from-black p-8 backdrop-blur-[125px]">
        <img
          className="ring-background-50 -mb-20 h-33 w-33 rounded-xl object-cover ring-4"
          src={member.image}
          alt={member.name}
        />
      </div>
      <div className="px-8 pt-18 pb-8 text-left">
        <div className="border-base-50 border-b pb-4">
          <h2 className="text-title-50 text-2xl font-semibold">
            {member.name}
          </h2>
          <p className="text-text-100 text-base font-medium">{member.role}</p>
          <p className="text-text-100 mt-6 text-base">{member.description}</p>
        </div>
        <div className="flex items-center justify-between pt-6">
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
          <a
            href={member.profileLink}
            className="bg-primary-500 hover:bg-primary-600 text-white-100 flex h-10 cursor-pointer items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition"
          >
            View Profile
          </a>
        </div>
      </div>
    </article>
  );
}

export default function Teams5() {
  return (
    <section className="bg-background-50 py-16 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-md text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Team
          </span>
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            Who We Are
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
