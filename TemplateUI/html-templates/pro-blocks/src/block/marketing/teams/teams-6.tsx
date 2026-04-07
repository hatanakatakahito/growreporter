import { Linkedin, Twitter } from '@tailgrids/icons';

interface Social {
  icon: React.ElementType;
  href: string;
}

interface TeamMember {
  name: string;
  role: string;
  image: string;
  socials: Social[];
}

const teamMembers: TeamMember[] = [
  {
    name: 'Oliva Carter',
    role: 'CEO & Founder',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-06/image-1.jpg',
    socials: [
      { icon: Twitter, href: '#' },
      { icon: Linkedin, href: '#' },
    ],
  },
  {
    name: 'James Wilson',
    role: 'Product Designer',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-06/image-2.jpg',
    socials: [
      { icon: Twitter, href: '#' },
      { icon: Linkedin, href: '#' },
    ],
  },
  {
    name: 'Emma Thompson',
    role: 'Lead Developer',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-06/image-3.jpg',
    socials: [
      { icon: Twitter, href: '#' },
      { icon: Linkedin, href: '#' },
    ],
  },
  {
    name: 'Michael Chen',
    role: 'Marketing Lead',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-06/image-4.jpg',
    socials: [
      { icon: Twitter, href: '#' },
      { icon: Linkedin, href: '#' },
    ],
  },
];

function TeamCard({ member }: { member: TeamMember }) {
  return (
    <article>
      <div className="relative overflow-hidden rounded-2xl">
        <img
          src={member.image}
          alt={member.name}
          className="h-full w-full rounded-2xl object-cover"
        />
        <div className="bg-white-90 absolute right-2 bottom-2 left-2 flex items-center justify-between rounded-lg px-5 py-2 backdrop-blur-sm">
          <div>
            <h3 className="text-base font-semibold text-gray-800">
              {member.name}
            </h3>
            <p className="text-text-100 text-xs">{member.role}</p>
          </div>
          <div className="flex items-center space-x-4">
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
      </div>
    </article>
  );
}

export default function Teams6() {
  return (
    <section className="bg-background-50 py-16 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-lg text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Team
          </span>
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            Your Team, Our Passion
          </h2>
          <p className="text-text-100 text-base lg:px-5">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teamMembers.map((member, index) => (
            <TeamCard key={index} member={member} />
          ))}
        </div>
        <div className="bg-background-soft-50 mt-6 flex flex-col items-center justify-between gap-10 rounded-xl p-6 lg:flex-row">
          <div className="flex flex-col items-center gap-7 sm:flex-row">
            <img
              src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-06/image-5.jpg"
              alt="Team"
              className="h-22 w-22 rounded-lg object-cover"
            />
            <div>
              <h3 className="text-title-50 mb-2 text-center text-2xl font-semibold sm:text-left">
                Join Our Team of Creative Minds
              </h3>
              <p className="text-text-100 text-center text-base sm:text-left">
                Be part of a passionate team shaping the future of design and
                technology
              </p>
            </div>
          </div>

          <a
            href="javascript:void(0)"
            className="bg-primary-500 hover:bg-primary-600 text-white-100 flex w-full items-center justify-center rounded-lg px-5 py-3 text-base font-medium transition sm:w-auto"
          >
            Join us today
          </a>
        </div>
      </div>
    </section>
  );
}
