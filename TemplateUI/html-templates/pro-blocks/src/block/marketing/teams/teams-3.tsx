import { Button } from '@/components/core/button';
import { Dribbble, Linkedin, Twitter } from '@tailgrids/icons';

interface Social {
  icon: React.ElementType;
  href: string;
}

interface TeamMember {
  name: string;
  role: string;
  description: string;
  location: string;
  image: string;
  socials: Social[];
}

const teamMembers: TeamMember[] = [
  {
    name: 'Ethan Carter',
    role: 'Founder & CEO',
    description:
      'Leads the vision and strategy while building a strong and innovative culture.',
    location: 'California, USA',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-03/image-1.jpg',
    socials: [
      { icon: Twitter, href: '#' },
      { icon: Linkedin, href: '#' },
      { icon: Dribbble, href: '#' },
    ],
  },
  {
    name: 'Olivia Bennett',
    role: 'Product Designer',
    description:
      'Crafts intuitive user experiences through thoughtful design and research.',
    location: 'New York, USA',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-03/image-2.jpg',
    socials: [
      { icon: Twitter, href: '#' },
      { icon: Linkedin, href: '#' },
      { icon: Dribbble, href: '#' },
    ],
  },
  {
    name: 'Mason Brooks',
    role: 'Lead Developer',
    description:
      'Architects scalable solutions and mentors the engineering team.',
    location: 'Austin, USA',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-03/image-3.jpg',
    socials: [
      { icon: Twitter, href: '#' },
      { icon: Linkedin, href: '#' },
      { icon: Dribbble, href: '#' },
    ],
  },
  {
    name: 'Sophia Williams',
    role: 'Marketing Lead',
    description:
      'Drives growth strategies and builds meaningful brand connections.',
    location: 'Seattle, USA',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-03/image.jpg',
    socials: [
      { icon: Twitter, href: '#' },
      { icon: Linkedin, href: '#' },
      { icon: Dribbble, href: '#' },
    ],
  },
];

function TeamCard({ member }: { member: TeamMember }) {
  return (
    <article className="bg-background-soft-100 flex flex-col gap-2.5 rounded-2xl p-2.5 xl:flex-row">
      <div className="h-[256px] xl:w-3/5">
        <img
          src={member.image}
          className="h-full w-full rounded-xl object-cover"
          alt={member.name}
        />
      </div>
      <div className="space-y-2.5 xl:w-4/6">
        <div className="bg-background-50 rounded-xl p-6">
          <h3 className="text-title-50 text-2xl font-semibold">
            {member.name}
          </h3>
          <span className="text-text-100 text-base">{member.role}</span>
          <p className="text-text-100 mt-6 text-base">{member.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-background-50 rounded-lg px-5 py-2.5">
            <p className="text-title-50 text-sm font-medium">
              {member.location}
            </p>
          </div>
          <div className="bg-background-50 flex items-center justify-between gap-5 rounded-lg px-5 py-2.5">
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

export default function Teams3() {
  return (
    <section className="bg-background-50 py-16 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto max-w-xl text-center">
          <div className="px-2.5 py-10 sm:p-16">
            <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
              Team
            </span>
            <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
              Built by These Faces
            </h2>
            <p className="text-text-100 text-base lg:px-5">
              There are many variations of available but the majority have
              suffered alteration in some form.
            </p>
            <div className="mt-10 flex w-full flex-col justify-center gap-3 sm:flex-row">
              <Button>
                <a href="javascript:void(0)">Join Our Team</a>
              </Button>
              <Button appearance="outline">
                <a href="javascript:void(0)"> Learn more about us</a>
              </Button>
            </div>
          </div>
        </div>
        <div className="grid gap-7 sm:grid-cols-2">
          {teamMembers.map((member, index) => (
            <TeamCard key={index} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
}
