import { Button } from '@/components/core/button';
import { Check } from '@tailgrids/icons';
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
  monthlyPrice?: string;
  yearlyPrice?: string;
  originalMonthlyPrice?: string;
  originalYearlyPrice?: string;
  features: string[];
  billing: 'monthly' | 'yearly';
  isCustom?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({
  title,
  description,
  monthlyPrice,
  yearlyPrice,
  originalMonthlyPrice,
  originalYearlyPrice,
  features,
  billing,
  isCustom = false,
}) => {
  // Define different SVG icons for each feature

  return (
    <div
      className={` ${isCustom ? 'bg-gray-900' : 'bg-background-soft-300'} border-base-100 rounded-2xl border px-7 py-10`}
    >
      <div>
        <h3
          className={`text-2xl font-semibold ${isCustom ? 'text-white-80' : 'text-text-50'} mb-8`}
        >
          {title}
        </h3>
        <div className="mb-10">
          <div>
            {isCustom ? (
              <span className="text-5xl font-bold text-white">Custom</span>
            ) : (
              <>
                {billing === 'monthly' && (
                  <span className="flex items-center gap-3">
                    <span className="text-text-100 text-3xl font-semibold line-through">
                      {originalMonthlyPrice}
                    </span>
                    <span className="text-title-50 text-5xl font-bold">
                      {monthlyPrice}
                    </span>
                  </span>
                )}
                {billing === 'yearly' && (
                  <span className="flex items-center gap-3">
                    <span className="text-text-100 text-3xl font-semibold line-through">
                      {originalYearlyPrice}
                    </span>
                    <span className="text-title-50 text-5xl font-bold">
                      {yearlyPrice}
                    </span>
                  </span>
                )}
              </>
            )}
          </div>
          <p className="text-text-100 text-base">{description}</p>
        </div>
      </div>
      <div>
        <Button className="h-12 w-full">
          <a href="javascript:void(0)">Get Started</a>
        </Button>
        <ul className="mt-10 space-y-4">
          {features.map((feature, index) => (
            <li
              key={index}
              className={`flex items-center gap-2 font-normal ${isCustom ? 'text-text-200' : 'text-text-50'}`}
            >
              <Check />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const Pricing6: React.FC = () => {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section className="bg-background-50 py-28">
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
        <div>
          <div className="mb-16 flex justify-center">
            <div className="bg-background-soft-100 relative inline-flex h-11 items-center justify-center rounded-full p-0.5">
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
                      layoutId="pricing6-tab-indicator"
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
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            <PricingCard
              title="Starter"
              description="For Scaling Business"
              monthlyPrice="$59"
              yearlyPrice="$150"
              originalMonthlyPrice="$122"
              originalYearlyPrice="$300"
              features={[
                'Up to 10 User',
                'All UI Components',
                'Team Collaboration',
                'Downloadable Files',
              ]}
              billing={plan}
            />
            <PricingCard
              title="Premium"
              description="For Team and Organization"
              monthlyPrice="$79"
              yearlyPrice="$300"
              originalMonthlyPrice="$240"
              originalYearlyPrice="$500"
              features={[
                'Unlimited Projects',
                'Dedicated Account Manager',
                'Custom Integrations',
                'Priority Support',
              ]}
              billing={plan}
            />
            <PricingCard
              title="Enterprise"
              description="Per user/month bill monthly"
              features={[
                'Unlimited Projects',
                'Dedicated Account Manager',
                'Custom Integrations',
                'Priority Support',
              ]}
              billing={plan}
              isCustom={true}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing6;
