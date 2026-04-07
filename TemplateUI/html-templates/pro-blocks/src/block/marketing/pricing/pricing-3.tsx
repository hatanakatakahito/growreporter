import { Check, FileText, Xmark2x } from '@tailgrids/icons';

// cn function definition
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Pricing3() {
  const plans = [
    {
      name: 'Free Lite',
      desc: 'It’s totally free',
      price: '0',
      features: [
        { label: 'Up to 5 User', enabled: true },
        { label: 'Lifetime access', enabled: true },
        { label: 'All UI Components', enabled: true },
        { label: 'Team Collaboration', enabled: false },
        { label: 'Downloadable Files', enabled: false },
      ],
      storage: '1',
    },
    {
      name: 'Plus',
      desc: 'For Scaling Business',
      price: '175',
      features: [
        { label: 'Up to 10 User', enabled: true },
        { label: 'Lifetime access', enabled: true },
        { label: 'All UI Components', enabled: true },
        { label: 'Team Collaboration', enabled: true },
        { label: 'Downloadable Files', enabled: true },
      ],
      isFeatured: true,
      storage: '10',
    },
    {
      name: 'Pro',
      desc: 'For Team and Organization',
      price: '349',
      features: [
        { label: 'Unlimited Projects', enabled: true },
        { label: 'Dedicated Account Manager', enabled: true },
        { label: 'Custom Integrations', enabled: true },
        { label: 'Priority Support', enabled: true },
        { label: 'SLA & Security Compliance', enabled: true },
      ],
      storage: '100',
    },
  ];
  return (
    <section className="bg-background-50 py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-12 max-w-lg text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Pricing
          </span>
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            Choose the Plan That Fits You Best
          </h2>
          <p className="text-text-100 text-center text-base">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((item, i) => (
            <div
              key={i}
              className="border-base-100 bg-background-50 rounded-3xl border p-2"
            >
              {item.isFeatured ? (
                <div className="from-primary-500 relative overflow-hidden rounded-2xl bg-linear-180 to-sky-400 px-5 py-10 pb-5">
                  <div className="relative z-20">
                    <span className="text-primary-500 absolute -top-5 right-0 rounded-full bg-white px-2.5 py-1 text-sm font-medium">
                      Most popular
                    </span>
                    <div className="px-5">
                      <h3 className="text-white-100 text-2xl font-semibold">
                        {item.name}
                      </h3>
                      <p className="text-white-100/90 mb-5 text-base">
                        {item.desc}
                      </p>
                      <span className="text-white-100 text-5xl font-bold">
                        ${item.price}
                        <span className="text-white-100 text-base font-normal">
                          /Lifetime
                        </span>
                      </span>
                    </div>
                    <a
                      href="javascript:void(0)"
                      className="text-title-50 hover:bg-background-soft-100 bg-background-50 border-base-200 mt-7 flex w-full items-center justify-center rounded-lg border px-5 py-3 font-medium transition"
                    >
                      Start Free Trial
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-background-soft-100 rounded-2xl px-5 py-10 pb-5">
                  <div className="px-5">
                    <h3 className="text-text-50 text-2xl font-semibold">
                      {item.name}
                    </h3>
                    <p className="text-text-100 mb-5 text-base">{item.desc}</p>
                    <span className="text-title-50 text-5xl font-bold">
                      ${item.price}
                      <span className="text-text-100 text-base font-normal">
                        /Lifetime
                      </span>
                    </span>
                  </div>
                  <a
                    href="javascript:void(0)"
                    className="border-base-100 bg-background-50 text-title-50 hover:bg-background-soft-100 mt-7 flex w-full items-center justify-center rounded-lg border px-5 py-3 font-medium transition"
                  >
                    Get Started
                  </a>
                </div>
              )}
              <div className="my-5 p-5">
                <ul className="space-y-4">
                  {item.features.map((feat, i) => (
                    <li
                      key={i}
                      className={cn(
                        'flex items-center gap-2 text-base font-medium',
                        feat.enabled ? 'text-text-50' : 'text-text-100',
                      )}
                    >
                      {feat.enabled ? <Check /> : <Xmark2x />}
                      {feat.label}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3.5">
                  <div className="bg-primary-500/10 inline-flex h-11 w-11 items-center justify-center rounded-full">
                    <FileText className="text-primary-500" />
                  </div>
                  <p className="text-text-100 font-medium">
                    <span className="text-primary-500">
                      {' '}
                      {item.storage} Gb Downloadable
                    </span>{' '}
                    file in this plan
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
