import { Button } from '@/components/core/button';
import { CheckCircle1, XmarkCircle2x } from '@tailgrids/icons';
import { motion } from 'framer-motion';
import { useState } from 'react';

// cn function definition
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// Tab options for the pricing toggle
const tabs = [
  { id: 'monthly', label: 'Monthly', badge: undefined },
  { id: 'yearly', label: 'Yearly', badge: '20% Off' },
] as const;

export default function Pricing2() {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Starter',
      monthly: { original: '$122', discounted: '$59' },
      yearly: { original: '$500', discounted: '$300' },
      features: [
        { label: 'Up to 5 User', enabled: true },
        { label: 'Lifetime access', enabled: true },
        { label: 'All UI Components', enabled: true },
        { label: 'No Team Collaboration', enabled: false },
        { label: 'Downloadable Files', enabled: false },
      ],
    },
    {
      name: 'Pro',
      monthly: { original: '$546', discounted: '$199' },
      yearly: { original: '$800', discounted: '$500' },
      features: [
        { label: 'Up to 10 User', enabled: true },
        { label: 'Lifetime access', enabled: true },
        { label: 'All UI Components', enabled: true },
        { label: 'No Team Collaboration', enabled: true },
        { label: 'Downloadable Files', enabled: true },
      ],
      isFeatured: true,
    },
    {
      name: 'Enterprise',
      monthly: { original: '$1165', discounted: '$299' },
      yearly: { original: '$1400', discounted: '$1000' },
      features: [
        { label: 'Unlimited Projects', enabled: true },
        { label: 'Lifetime access', enabled: true },
        { label: 'All UI Components', enabled: true },
        { label: 'Team Collaboration', enabled: true },
        { label: 'Downloadable Files', enabled: true },
      ],
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
        <div>
          <div className="mb-16 flex justify-center">
            <div className="bg-background-soft-100 relative inline-flex h-11 items-center justify-center rounded-full p-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPlan(tab.id)}
                  className={cn(
                    'relative z-10 inline-flex h-[42px] cursor-pointer items-center justify-center rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                    plan === tab.id ? 'text-title-50' : 'text-text-100',
                  )}
                >
                  {plan === tab.id && (
                    <motion.div
                      layoutId="pricing-tab-indicator"
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
                      className={cn(
                        'text-primary-700 relative z-10 ml-2 inline-flex h-6 items-center justify-center rounded-full px-2.5 py-1 text-sm font-medium',
                        plan === tab.id
                          ? 'bg-background-soft-100'
                          : 'bg-background-50',
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  'rounded-2xl p-7',
                  item.isFeatured
                    ? 'border-primary-500 border-2'
                    : 'border-base-100 border',
                )}
              >
                <h3 className="text-text-50 mb-7 text-2xl font-semibold">
                  {item.name}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-text-100 text-3xl font-semibold line-through">
                    {item[plan].original}
                  </span>
                  <span className="text-title-50 text-5xl font-bold">
                    {item[plan].discounted}
                  </span>
                </div>
                <div className="py-7">
                  <p className="text-text-50 mb-2 font-medium">
                    One time payment
                  </p>
                  <p className="text-text-100">
                    {item.name === 'Starter'
                      ? 'For small personal projects'
                      : item.name === 'Pro'
                        ? 'For Scaling your Business'
                        : 'For Team and Organization'}
                  </p>

                  <Button
                    className="mt-7 h-12 w-full"
                    appearance={item.isFeatured ? 'fill' : 'outline'}
                  >
                    <a href="javascript:void(0)">Get Started</a>
                  </Button>
                </div>
                <div>
                  <span className="text-title-50 text-xl font-medium">
                    What’s Included?
                  </span>
                  <ul className="mt-6 space-y-4">
                    {item.features.map((feat, i) => (
                      <li
                        key={i}
                        className={cn(
                          'flex items-center gap-3 text-base',
                          feat.enabled ? 'text-text-50' : 'text-text-100',
                        )}
                      >
                        {feat.enabled ? <CheckCircle1 /> : <XmarkCircle2x />}

                        {feat.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-col items-center justify-center">
          <p className="bg-background-soft-50 text-text-50 rounded-full px-8 py-2.5">
            30-day money-back guarantee, no questions asked
          </p>
          <p className="text-text-100 mt-5 text-center font-normal">
            Need a custom solution for your business? {''}
            <a
              href="javascript:void(0)"
              className="text-primary-500 font-medium"
            >
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
