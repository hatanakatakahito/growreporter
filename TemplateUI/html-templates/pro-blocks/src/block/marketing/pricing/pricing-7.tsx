import { Button } from '@/components/core/button';
import {
  CheckCircle1,
  Download1,
  InfoTriangle,
  RefreshCircle1Clockwise,
} from '@tailgrids/icons';
import { motion } from 'framer-motion';
import * as React from 'react';
import { useState } from 'react';

// Tab options for the pricing toggle
const tabs = [
  { id: 'monthly', label: 'Monthly', badge: undefined },
  { id: 'yearly', label: 'Yearly', badge: '20% Off' },
] as const;

interface PricingCardProps {
  title: string;
  description: string;
  features: string[];
  billing: 'monthly' | 'yearly';
}

const PricingCard: React.FC<PricingCardProps> = ({
  title,
  description,
  features,
}) => {
  // Define different SVG icons for each feature
  const featureIcons = [
    // Icon for "14-Day Rollback" (Clock-like icon)
    <RefreshCircle1Clockwise />,
    // Icon for "10,000 installs/mo" (Download-like icon)

    <Download1 key="installs" />,
    // Icon for "Real-time bug patching" (Bug-like icon)
    <InfoTriangle />,
    // Icon for "Smart deployment" (Checkmark-like icon)
    <CheckCircle1 />,
  ];

  return (
    <div className="p-6 lg:w-3/5">
      <div>
        <div>
          <h3 className="text-title-50 text-base font-semibold">{title}</h3>
          <p className="text-text-100 text-base">{description}</p>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-6 py-8 sm:grid-cols-2 sm:py-11">
        {features.map((feature, index) => (
          <li
            key={index}
            className="text-text-100 flex items-center gap-2 text-base"
          >
            {featureIcons[index % featureIcons.length]}
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button className="w-full" appearance="outline">
          <a href="javascript:void(0)">Request a demo</a>
        </Button>{' '}
        <Button className="w-full">
          <a href="javascript:void(0)">Deploy Now</a>
        </Button>
      </div>
    </div>
  );
};

interface PricingTierProps {
  builds: string;
  price: { monthly: string; yearly: string };
  billing: 'monthly' | 'yearly';
}

const PricingTier: React.FC<PricingTierProps> = ({
  builds,
  price,
  billing,
}) => {
  return (
    <li className="flex items-center justify-between py-4">
      <span className="text-text-100 text-base font-medium">{builds}</span>
      <span>
        <span className="text-text-50 text-base font-semibold">
          {billing === 'monthly' ? price.monthly : price.yearly}
        </span>
        <span className="text-text-50 font-normal">
          {billing === 'yearly' ? '/yr' : '/mo'}
        </span>
      </span>
    </li>
  );
};

const Pricing7: React.FC = () => {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');

  const pricingTiers = [
    { builds: '1,000', price: { monthly: 'Free', yearly: 'Free' } },
    { builds: '3,000', price: { monthly: '$29', yearly: '$100' } },
    { builds: '6,000', price: { monthly: '$49', yearly: '$200' } },
    { builds: '9,000', price: { monthly: '$79', yearly: '$350' } },
    { builds: '12,000', price: { monthly: '$129', yearly: '$800' } },
  ];

  return (
    <section className="bg-background-soft-300 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-16 flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
          <div className="max-w-lg text-left">
            <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
              Pricing
            </span>
            <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
              Choose Your Plan
            </h2>
            <p className="text-text-100 text-base lg:pr-10">
              There are many variations of available but the majority have
              suffered alteration in some form.
            </p>
          </div>
          <div>
            <div className="bg-background-soft-400 relative inline-flex h-11 items-center justify-center rounded-full p-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPlan(tab.id)}
                  className={`relative z-10 inline-flex h-[42px] cursor-pointer items-center justify-center rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                    plan === tab.id ? 'text-title-50' : 'text-text-100'
                  }`}
                >
                  {plan === tab.id && (
                    <motion.div
                      layoutId="pricing7-tab-indicator"
                      className="bg-background-50 absolute inset-0 rounded-full shadow-sm"
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 40,
                      }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-primary-700 relative z-10 ml-2 inline-flex h-6 items-center justify-center rounded-full px-2.5 py-1 text-sm font-medium ${
                        plan === tab.id
                          ? 'bg-background-soft-100'
                          : 'bg-background-50'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-background-50 flex flex-col gap-11 rounded-2xl p-2.5 lg:flex-row">
          <PricingCard
            title="StackIt Pricing"
            description="Perfect for solo founders & creators."
            features={[
              '14-Day Rollback',
              '10,000 installs/mo',
              'Real-time bug patching',
              'Smart deployment',
            ]}
            billing={plan}
          />
          <div className="bg-background-soft-100 rounded-lg p-1 lg:w-2/5">
            <div className="flex items-center justify-between px-6 py-4">
              <h3 className="text-title-50 text-base font-semibold">
                WEEKLY BUILDS
              </h3>
              <span className="text-title-50 text-base font-semibold">
                PRICE
              </span>
            </div>
            <ul className="divide-base-100 bg-background-50 divide-y rounded-lg px-6">
              {pricingTiers.map((tier, index) => (
                <PricingTier
                  key={index}
                  builds={tier.builds}
                  price={tier.price}
                  billing={plan}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing7;
