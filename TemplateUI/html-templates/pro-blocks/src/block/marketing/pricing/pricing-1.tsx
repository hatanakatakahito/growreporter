import { Button } from '@/components/core/button';
import { CertificateBadge1, Check, Globe2 } from '@tailgrids/icons';
import type { ReactNode } from 'react';

// Types
interface PlanFeature {
  text: string;
}

interface PricingPlan {
  icon: ReactNode;
  title: string;
  description: string;
  features: PlanFeature[];
  price: string;
  priceLabel: string;
  variant: 'light' | 'dark';
}

// Feature List Item Component
const FeatureItem = ({
  text,
  variant,
}: {
  text: string;
  variant: 'light' | 'dark';
}) => (
  <li
    className={`flex items-center gap-2 border-b py-3 ${
      variant === 'light' ? 'border-base-100' : 'border-base-100'
    }`}
  >
    <span className="bg-primary-500 text-white-100 inline-flex size-4 shrink-0 items-center justify-center rounded-full">
      <Check />
    </span>
    <span
      className={`text-base ${variant === 'light' ? 'text-text-100' : 'text-text-100'}`}
    >
      {text}
    </span>
  </li>
);

// Pricing Card Component
const PricingCard = ({
  icon,
  title,
  description,
  features,
  price,
  priceLabel,
  variant,
}: PricingPlan) => {
  const isLight = variant === 'light';

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-2 ${
        isLight ? 'bg-background-50' : 'bg-black'
      }`}
    >
      {/* Background decorations for dark variant */}
      {!isLight && (
        <>
          <svg
            className="absolute -top-[100px] -right-[100px] z-0 h-[489px] w-[489px]"
            width="578"
            height="578"
            viewBox="0 0 578 578"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g filter="url(#filter0_f_9190_11759)">
              <circle cx="494.602" cy="82.6021" r="244.602" fill="#1D4ED8" />
            </g>
            <defs>
              <filter
                id="filter0_f_9190_11759"
                x="0"
                y="-412"
                width="989.203"
                height="989.204"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend
                  mode="normal"
                  in="SourceGraphic"
                  in2="BackgroundImageFix"
                  result="shape"
                />
                <feGaussianBlur
                  stdDeviation="125"
                  result="effect1_foregroundBlur_9190_11759"
                />
              </filter>
            </defs>
          </svg>
          <svg
            className="absolute top-[100px] -left-[100px] z-0 h-[377px] w-[377px]"
            width="503"
            height="801"
            viewBox="0 0 503 801"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g filter="url(#filter0_f_9190_11760)">
              <circle cx="64.5" cy="438.5" r="188.5" fill="#1D4ED8" />
            </g>
            <defs>
              <filter
                id="filter0_f_9190_11760"
                x="-374"
                y="0"
                width="877"
                height="877"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend
                  mode="normal"
                  in="SourceGraphic"
                  in2="BackgroundImageFix"
                  result="shape"
                />
                <feGaussianBlur
                  stdDeviation="125"
                  result="effect1_foregroundBlur_9190_11760"
                />
              </filter>
            </defs>
          </svg>
        </>
      )}

      {/* Card Content */}
      <div
        className={`rounded-2xl px-5 py-8 sm:p-8 ${
          isLight
            ? 'bg-background-soft-50'
            : 'bg-background-soft-50 relative z-10'
        }`}
      >
        <span className="text-text-50 size-10">{icon}</span>
        <h3 className="text-title-50 my-6 text-4xl font-semibold">{title}</h3>
        <p className="bg-background-soft-200 text-text-50 rounded-xl px-3 py-4 text-lg">
          {description}
        </p>
        <ul className="mt-7">
          {features.map((feature, index) => (
            <FeatureItem key={index} text={feature.text} variant={variant} />
          ))}
        </ul>
      </div>

      {/* Pricing Footer */}
      <div className="flex items-center justify-between px-5 pt-9 pb-7 sm:px-7">
        <div>
          <span
            className={`flex items-end text-5xl font-bold ${
              isLight ? 'text-title-50' : 'text-white-100'
            }`}
          >
            {price}
            <span
              className={`text-base font-normal ${
                isLight ? 'text-text-100' : 'text-white-80'
              }`}
            >
              {priceLabel}
            </span>
          </span>
        </div>
        <Button className="h-12">
          <a href="javascript:void(0)">Get Started today</a>
        </Button>
      </div>
    </div>
  );
};

// Pricing Plans Data
const pricingPlans: PricingPlan[] = [
  {
    icon: <CertificateBadge1 className="text-text-50 size-10" />,
    title: 'Design Essentials',
    description:
      'Designed for freelancers, entrepreneurs, and lean teams who need just the right set of features.',
    features: [
      { text: 'UI/UX audit & consultation' },
      { text: '3–5 custom-designed screens' },
      { text: 'Responsive web/mobile layout' },
      { text: 'Design handoff via Figma' },
      { text: '2 revision rounds' },
      { text: 'Timeline: 1–2 weeks' },
    ],
    price: '$999',
    priceLabel: '/one time',
    variant: 'light',
  },
  {
    icon: <Globe2 className="text-text-50 size-10" />,
    title: 'Full Product Build',
    description:
      'End-to-end design + development for MVPs, SaaS, or web apps together in one place.',
    features: [
      { text: 'Full UI/UX design (up to 10 pages)' },
      { text: 'Interactive prototype' },
      { text: 'Frontend dev (React/Webflow/Framer)' },
      { text: 'CMS integration (if needed)' },
      { text: 'QA & responsive testing' },
      { text: 'Timeline: 3–5 weeks' },
    ],
    price: '$2999',
    priceLabel: '/project',
    variant: 'dark',
  },
];

// Main Component
export default function Pricing1() {
  return (
    <section className="bg-background-soft-100 py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-lg text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Pricing
          </span>
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            Flexible Pricing for Every Stage
          </h2>
          <p className="text-text-100 text-center text-base">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {pricingPlans.map((plan, index) => (
            <PricingCard key={index} {...plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
