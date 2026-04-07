import { BarChart2, Layers2, Link1AngularRight } from '@tailgrids/icons';

const features = [
  {
    title: 'Data-Driven Insights',
    description:
      'Lorem ipsum dolor sit amet consectetur. Metus lacus major some form.',
    icon: <BarChart2 className="size-6" />,
  },
  {
    title: 'Seamless Integration',
    description:
      'Lorem ipsum dolor sit amet consectetur. Metus lacus major some form.',
    icon: <Link1AngularRight className="size-6" />,
  },
  {
    title: 'Seamless Integration',
    description:
      'Lorem ipsum dolor sit amet consectetur. Metus lacus major some form.',
    icon: <Layers2 className="size-6" />,
  },
];

export default function Features1() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <span className="bg-primary-500/5 text-primary-500 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Features
          </span>
          <h2 className="text-title-50 mt-2 mb-4 text-4xl font-semibold sm:text-5xl">
            Why Businesses Choose Us
          </h2>
          <p className="text-text-100 mx-auto max-w-2xl sm:px-24">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="border-base-100 bg-background-soft-50 rounded-xl border p-7 text-center"
            >
              <div className="bg-primary-500 ring-primary-500/15 mx-auto -mt-15 mb-4 flex h-16 w-16 items-center justify-center rounded-full text-white ring-4">
                {feature.icon}
              </div>
              <h3 className="text-text-50 mb-2 text-2xl font-semibold">
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
