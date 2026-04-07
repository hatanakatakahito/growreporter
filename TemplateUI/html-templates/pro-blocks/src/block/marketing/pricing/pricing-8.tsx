import { Check } from '@tailgrids/icons';
import { motion } from 'framer-motion';
import * as React from 'react';
import { useState } from 'react';

// Tab options for the pricing toggle
const tabs = [
  { id: 'monthly', label: 'Monthly', badge: undefined },
  { id: 'yearly', label: 'Yearly', badge: '-20% Off' },
] as const;

interface PricingCardProps {
  title: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  features: string[];
  billing: 'monthly' | 'yearly';
  isHighlighted?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({
  title,
  description,
  monthlyPrice,
  yearlyPrice,
  features,
  billing,
  isHighlighted = false,
}) => {
  return (
    <article>
      <div className="bg-background-100 rounded-2xl px-6 pt-5 pb-7">
        <div>
          <span className="bg-badge-neutral-background text-badge-neutral-text inline-flex h-6 items-center justify-center rounded-full px-2.5 py-1 text-sm">
            {title}
          </span>
          <p className="text-text-100 mt-4 text-base">{description}</p>
          <div className="border-base-100 border-b border-dashed py-6">
            <span className="text-title-50 text-5xl font-bold">
              {billing === 'monthly' ? monthlyPrice : yearlyPrice}
              <span className="text-text-100 text-base font-normal">
                {billing === 'monthly' ? '/month' : '/yearly'}
              </span>
            </span>
          </div>
        </div>
        <ul className="mt-10 space-y-4">
          {features.map((feature, index) => (
            <li
              key={index}
              className="text-text-100 flex items-center gap-2 font-normal"
            >
              <Check />
              {feature}
            </li>
          ))}
        </ul>
        <a
          href="javascript:void(0)"
          className={`mt-7 flex w-full items-center justify-center rounded-lg border px-5 py-3 font-medium transition ${isHighlighted ? 'bg-primary-500 border-primary-500 hover:bg-primary-600 text-white-100' : 'border-base-100 text-title-50 hover:bg-background-soft-100'}`}
        >
          {title === 'Free' ? 'Use It Free' : 'Choose Plan'}
        </a>
      </div>
    </article>
  );
};

const Pricing8: React.FC = () => {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section className="bg-background-soft-300 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-12 max-w-lg text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Pricing
          </span>
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            Flexible Pricing for Every Stage
          </h2>
          <p className="text-text-100 px-5 text-base lg:px-5">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="mb-16 flex justify-center">
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
                    layoutId="pricing8-tab-indicator"
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <PricingCard
            title="Free"
            description="Just getting started"
            monthlyPrice="$0"
            yearlyPrice="$0"
            features={[
              '1 design task/month',
              'View-only Figma file',
              'Basic components access',
            ]}
            billing={plan}
          />
          <PricingCard
            title="Mini"
            description="For small personal projects"
            monthlyPrice="$9"
            yearlyPrice="$80"
            features={[
              '3 design task/month',
              'Editable Figma export',
              'Access to design system',
              'Email Support',
            ]}
            billing={plan}
          />
          <PricingCard
            title="Basic"
            description="For Scaling Business"
            monthlyPrice="$29"
            yearlyPrice="$200"
            features={[
              'Unlimited design tasks',
              '1-page no-code Dev',
              'Component library access',
              'Priority email support',
              '48-hour delivery',
            ]}
            billing={plan}
          />
          <PricingCard
            title="Pro"
            description="For Scaling Business"
            monthlyPrice="$59"
            yearlyPrice="$500"
            features={[
              'Unlimited design',
              'Multi-page exports',
              'Slack + Notion workspace',
              'Custom UI kit',
              'Revisions included',
              '24-hour delivery',
            ]}
            billing={plan}
            isHighlighted={true}
          />
        </div>
      </div>
    </section>
  );
};

export default Pricing8;
