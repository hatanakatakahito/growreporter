import { ChevronRight, Dribbble, Linkedin, Twitter } from '@tailgrids/icons';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';

// Interfaces
interface TeamMember {
  name: string;
  role: string;
  category: string;
  image: string;
  socialLinks: {
    url: string;
    icon: React.ElementType;
  }[];
}

interface Filter {
  label: string;
  value: string;
}

interface Teams7Props {
  title?: string;
  description?: string;
  badgeText?: string;
  teamMembers?: TeamMember[];
  filters?: Filter[];
  contactButtonText?: string;
  onFilterChange?: (filter: string) => void;
  onContact?: (member: TeamMember) => void;
  onSocialClick?: (
    social: { url: string; icon: React.ElementType },
    member: TeamMember,
  ) => void;
}

const defaultProps: Required<Teams7Props> = {
  title: 'Leadership & Experts',
  description:
    'There are many variations of available but the majority have suffered alteration in some form.',
  badgeText: 'Team',
  teamMembers: [
    {
      name: 'David Chen',
      role: 'CTO & Co-Founder',
      category: 'Leadership',
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-07/image-1.jpg',
      socialLinks: [
        { url: 'https://twitter.com/', icon: Twitter },
        { url: 'https://linkedin.com/', icon: Linkedin },
        { url: 'https://dribbble.com/', icon: Dribbble },
      ],
    },
    {
      name: 'Marcus Jhonson',
      role: 'Design Officer',
      category: 'Design',
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-07/image-2.jpg',
      socialLinks: [
        { url: 'https://twitter.com/', icon: Twitter },
        { url: 'https://linkedin.com/', icon: Linkedin },
        { url: 'https://dribbble.com/', icon: Dribbble },
      ],
    },
    {
      name: 'Sarah Johnson',
      role: 'Marketing Officer',
      category: 'Marketing',
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-07/image-3.jpg',
      socialLinks: [
        { url: 'https://twitter.com/', icon: Twitter },
        { url: 'https://linkedin.com/', icon: Linkedin },
        { url: 'https://dribbble.com/', icon: Dribbble },
      ],
    },
    {
      name: 'Marcus Jhonson',
      role: 'Engineer',
      category: 'Engineering',
      image:
        'https://cdn-tailgrids.b-cdn.net/3.0/marketing/team/team-07/image-4.jpg',
      socialLinks: [
        { url: 'https://twitter.com/', icon: Twitter },
        { url: 'https://linkedin.com/', icon: Linkedin },
        { url: 'https://dribbble.com/', icon: Dribbble },
      ],
    },
  ],
  filters: [
    { label: 'All', value: 'all' },
    { label: 'Leadership', value: 'leadership' },
    { label: 'Engineering', value: 'engineering' },
    { label: 'Design', value: 'design' },
    { label: 'Marketing', value: 'marketing' },
    { label: 'Video', value: 'video' },
  ],
  contactButtonText: 'Contact',
  onFilterChange: () => {},
  onContact: () => {},
  onSocialClick: () => {},
};

export default function Teams7(props: Teams7Props) {
  const {
    title,
    description,
    badgeText,
    teamMembers,
    filters,
    contactButtonText,
    onFilterChange,
    onContact,
    onSocialClick,
  } = { ...defaultProps, ...props };

  const [activeFilter, setActiveFilter] = useState('all');

  const filteredTeamMembers = useMemo(() => {
    if (activeFilter === 'all') {
      return teamMembers;
    }
    return teamMembers.filter(
      (member) => member.category.toLowerCase() === activeFilter,
    );
  }, [activeFilter, teamMembers]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    onFilterChange(filter);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Leadership: 'text-text-50 bg-background-soft-100',
      Design: 'text-blue-700 bg-blue-100',
      Marketing: 'text-green-700 bg-green-100',
      Engineering: 'text-purple-700 bg-purple-100',
      Video: 'text-orange-700 bg-orange-100',
    };
    return colors[category] || 'text-text-50 bg-background-soft-100';
  };

  const handleContact = (member: TeamMember) => {
    onContact(member);
  };

  const handleSocialClick = (
    social: { url: string; icon: React.ElementType },
    member: TeamMember,
  ) => {
    onSocialClick(social, member);
  };

  return (
    <section className="bg-background-soft-100 py-16 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-lg text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            {badgeText}
          </span>
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            {title}
          </h2>
          <p className="text-text-100 text-base lg:px-5">{description}</p>
        </div>
        <ul className="mb-16 flex flex-wrap items-center justify-center gap-3">
          {filters.map((filter, index) => (
            <li key={index}>
              <button
                onClick={() => handleFilterChange(filter.value)}
                className={`relative flex cursor-pointer items-center justify-center rounded-full px-5 py-3 font-medium transition ${
                  activeFilter === filter.value
                    ? 'text-white-100'
                    : 'bg-background-50 text-title-50 hover:bg-background-soft-200'
                }`}
              >
                {activeFilter === filter.value && (
                  <motion.span
                    layoutId="activeFilterBg"
                    className="bg-primary-500 absolute inset-0 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                  />
                )}
                <span className="relative z-10">{filter.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {filteredTeamMembers.map((member, index) => (
            <article
              key={index}
              className="bg-background-50 flex flex-col rounded-2xl transition-transform duration-200 xl:flex-row"
            >
              <div className="p-1.5">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full rounded-xl"
                />
              </div>
              <div className="grow p-5 pt-3.5 xl:p-7">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs leading-4 font-medium ${getCategoryColor(
                    member.category,
                  )}`}
                >
                  {member.category}
                </span>
                <div className="border-base-50 border-b pt-10 pb-5">
                  <h3 className="text-title-50 text-2xl font-semibold">
                    {member.name}
                  </h3>
                  <span className="text-text-100 text-sm">{member.role}</span>
                </div>
                <div className="flex items-center justify-between pt-5">
                  <div className="flex gap-4">
                    {member.socialLinks.map((social, socialIndex) => (
                      <a
                        key={socialIndex}
                        href={social.url}
                        className="hover:text-primary-500 text-text-100 transition"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSocialClick(social, member);
                        }}
                      >
                        <social.icon className="size-5" />
                      </a>
                    ))}
                  </div>
                  <button
                    onClick={() => handleContact(member)}
                    className="text-primary-500 hover:text-primary-600 group flex cursor-pointer items-center justify-center gap-2 text-base font-medium transition"
                  >
                    {contactButtonText}
                    <ChevronRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
