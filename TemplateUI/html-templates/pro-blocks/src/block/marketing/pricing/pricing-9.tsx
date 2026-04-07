'use client';

import { Button } from '@/components/core/button';
import { cn } from '@/utils/cn';
import { Check } from '@tailgrids/icons';
import { motion } from 'framer-motion';
import { useState } from 'react';
// cn function definition

const PLANS = ['Basic', 'Pro', 'Business'] as const;

// Tab options for the pricing toggle
const tabs = [
  { id: 'monthly', label: 'Monthly', badge: undefined },
  { id: 'yearly', label: 'Yearly', badge: '20% Off' },
] as const;

const PRICES = {
  monthly: { Basic: '$0', Pro: '$49', Business: '$129' },
  yearly: { Basic: '$0', Pro: '$39', Business: '$99' },
};

const FEATURES = [
  ['Projects Limit', ['2', '10', 'Unlimited']],
  ['Templates Access', ['Limited', 'All Templates', 'All Templates + Custom']],
  ['Team Collaboration', ['—', 'Up to 3 members', 'Unlimited Members']],
  ['Support Type', ['Community', 'Priority Email', '24/7 Premium Support']],
  ['Analytics Dashboard', ['—', '—', '✔']],
  ['Dedicated Account Manager', ['—', '—', '✔']],
  ['White Label Option', ['—', '—', '✔']],
  ['Custom Workflow Setup', ['—', '—', '✔']],
  ['Free Trial Available', ['✔', '✔', 'Contact Sales']],
];

export default function Pricing9() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        {/* Header */}
        <div className="mx-auto mb-12 max-w-lg text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Pricing
          </span>
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            Choose the Plan That Fits You Best
          </h2>
          <p className="text-text-100 px-5 text-base lg:px-10">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>

        {/* Pricing Table */}
        <div className="border-base-100 overflow-x-auto rounded-2xl border">
          <table className="divide-base-100 w-full table-auto divide-y text-sm">
            <thead>
              <tr className="divide-base-100 text-title-50 divide-x">
                {/* Billing Toggle */}
                <th className="px-10 py-5 whitespace-nowrap">
                  <div className="bg-background-soft-100 relative inline-flex h-11 shrink-0 items-center justify-center rounded-full p-0.5">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setBilling(tab.id)}
                        className={cn(
                          'relative z-10 inline-flex h-[42px] cursor-pointer items-center justify-center rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                          billing === tab.id
                            ? 'text-title-50'
                            : 'text-text-100',
                        )}
                      >
                        {billing === tab.id && (
                          <motion.div
                            layoutId="pricing9-tab-indicator"
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
                              billing === tab.id
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
                </th>

                {/* Plan Headers */}
                {PLANS.map((plan) => (
                  <th
                    key={plan}
                    className={cn(
                      'px-10 py-5 whitespace-nowrap',
                      plan === 'Pro' && 'bg-background-soft-50',
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className="border-base-100 text-text-50 inline-flex h-7 items-center rounded-full border px-3 py-1 text-base font-medium">
                        {plan}
                      </span>
                      <div className="mt-4 mb-6 flex items-end text-center">
                        <span className="text-title-50 text-3xl font-bold lg:text-5xl">
                          {PRICES[billing][plan]}
                        </span>
                        <div className="text-text-100 text-sm font-normal">
                          /Month
                        </div>
                      </div>

                      <Button
                        appearance={plan === 'Pro' ? 'fill' : 'outline'}
                        className="px-10"
                      >
                        <a href="javascript:void(0)">Choose Plan</a>
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Features */}
            <tbody className="divide-base-100 divide-y">
              {FEATURES.map(([feature, values], rowIndex) => (
                <tr key={rowIndex} className="divide-base-100 divide-x">
                  <td className="text-text-50 px-10 py-5 text-lg font-medium">
                    {feature}
                  </td>
                  {(values as string[]).map((val, i) => (
                    <td
                      key={i}
                      className={cn(
                        'px-10 py-5 text-center text-lg',
                        i === 1 && 'bg-background-soft-50',
                        'text-text-100',
                      )}
                    >
                      <div className="flex items-center justify-center">
                        {val === '✔' ? <Check /> : val}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
