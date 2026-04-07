import {
  BarChart2,
  Clouds,
  ColourPalette3,
  Gear1,
  Phone,
  UserMultiple1,
} from '@tailgrids/icons';

const features = [
  {
    title: 'Smart Automation',
    description:
      'Save time with intelligent workflows that handle repetitive tasks for you.',
    icon: <Gear1 />,
  },
  {
    title: 'Team Collaboration',
    description:
      'Keep everyone in sync with shared workspaces, and real-time updates.',
    icon: <UserMultiple1 />,
  },
  {
    title: 'Cloud Access',
    description:
      'Access your data from anywhere — securely stored and always synced.',
    icon: <Clouds />,
  },
  {
    title: 'Performance Tracking',
    description: '',
    icon: <BarChart2 />,
  },
  {
    title: 'Custom Branding',
    description:
      'Make the platform yours with logos, colors, and custom domains.',
    icon: <ColourPalette3 />,
  },
  {
    title: 'Mobile Friendly',
    description:
      'Use it on the go — fully optimized for mobile and tablet experiences.',
    icon: <Phone />,
  },
];

export default function Features3() {
  return (
    <section className="bg-background-soft-100 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-2xl">
          <h2 className="text-title-50 mb-2 text-center text-4xl font-semibold sm:text-5xl">
            Everything You Need to Grow Smarter
          </h2>
          <p className="text-text-100 text-center text-base sm:px-24">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-background-50 rounded-2xl px-5 py-7"
            >
              <div className="group-hover:bg-primary-500 text-text-50 bg-background-soft-100 group-hover:text-white-100 mb-8 inline-flex h-14 w-14 items-center justify-center rounded-lg transition-colors">
                {feature.icon}
              </div>
              <h3 className="group-hover:text-primary-500 text-title-50 mb-3 text-2xl font-semibold">
                {feature.title}
              </h3>
              <p className="text-text-100 text-base">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
