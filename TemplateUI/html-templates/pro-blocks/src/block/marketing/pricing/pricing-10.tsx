import { motion } from 'framer-motion';
import React, { useState } from 'react';

// Tab options for the pricing toggle
const tabs = [
  { id: 'monthly', label: 'Monthly', badge: undefined },
  { id: 'yearly', label: 'Yearly', badge: '20% Off' },
] as const;

interface PricingCardProps {
  title: string;
  monthlyPrice: string;
  yearlyPrice: string;
  description: string;
  billing: 'monthly' | 'yearly';
}

const PricingCard: React.FC<PricingCardProps> = ({
  title,
  monthlyPrice,
  yearlyPrice,
  description,
  billing,
}) => {
  return (
    <div className="border-base-100 rounded-xl border p-2">
      <div className="bg-background-soft-100 rounded-lg p-6 text-center">
        <h3 className="text-text-50 text-base font-medium">{title}</h3>
        <div className="mt-4">
          <span className="text-title-50 text-4xl font-bold">
            {billing === 'monthly' ? monthlyPrice : yearlyPrice}
          </span>
          <span className="text-text-100 text-sm">
            {billing === 'monthly' ? '/mo' : '/yr'}
          </span>
        </div>
        <p className="text-text-100 mt-4 mb-6 text-sm">{description}</p>
        <a
          href="javascript:void(0)"
          className="bg-primary-500 hover:bg-primary-600 text-white-100 inline-block rounded-lg px-6 py-2 font-medium transition"
        >
          Choose Plan
        </a>
      </div>
    </div>
  );
};

interface FeatureRowProps {
  feature: string;
  basic: string | boolean;
  professional: string | boolean;
  enterprise: string | boolean;
}

const FeatureRow: React.FC<FeatureRowProps> = ({
  feature,
  basic,
  professional,
  enterprise,
}) => {
  const renderCell = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return (
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
            value ? 'bg-primary-500' : 'bg-background-soft-100'
          }`}
        >
          {value ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="8"
              viewBox="0 0 10 8"
              fill="none"
            >
              <path
                d="M8.88448 1.26953L3.42448 6.72953L0.781982 4.08706"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="12"
              viewBox="0 0 13 12"
              fill="none"
            >
              <path
                d="M3.2845 2.95118C3.51875 2.71719 3.8979 2.71719 4.13216 2.95118L6.33235 5.15138L8.53352 2.95216L8.62727 2.87403C8.86014 2.72046 9.17721 2.74623 9.38216 2.95118C9.58699 3.15625 9.61212 3.47325 9.45833 3.70606L9.38118 3.79981L7.18098 6.00001L9.38118 8.2002L9.45833 8.29395C9.61212 8.52676 9.58699 8.84377 9.38216 9.04884C9.17721 9.25378 8.86014 9.27956 8.62727 9.12599L8.53352 9.04786L6.33235 6.84767L4.13216 9.04884C3.8979 9.28283 3.51875 9.28283 3.2845 9.04884C3.05019 8.81452 3.05019 8.43452 3.2845 8.2002L5.4847 6.00001L3.2845 3.79981C3.05019 3.5655 3.05019 3.1855 3.2845 2.95118Z"
                fill="#374151"
              />
            </svg>
          )}
        </span>
      );
    }
    return value;
  };

  return (
    <tr>
      <td className="text-text-100 px-10 py-5 text-left">{feature}</td>
      <td className="text-text-100 px-10 py-5 text-center">
        {renderCell(basic)}
      </td>
      <td className="text-text-100 px-10 py-5 text-center">
        {renderCell(professional)}
      </td>
      <td className="text-text-100 px-10 py-5 text-center">
        {renderCell(enterprise)}
      </td>
    </tr>
  );
};

interface SectionHeaderProps {
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
  <tr>
    <td colSpan={4} className="text-title-50 px-10 py-5 text-lg font-medium">
      {title}
    </td>
  </tr>
);

export default function Pricing10() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div>
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
              Pricing
            </span>
            <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
              Choose the Plan That Fits You Best
            </h2>
            <p className="text-text-100 mx-auto max-w-lg px-5 text-center text-base">
              There are many variations of available but the majority have
              suffered alteration in some form.
            </p>
            <div className="bg-background-soft-100 relative mt-8 inline-flex h-11 items-center justify-center rounded-full p-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBilling(tab.id)}
                  className={`relative z-10 inline-flex h-[42px] cursor-pointer items-center justify-center rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                    billing === tab.id ? 'text-title-50' : 'text-text-100'
                  }`}
                >
                  {billing === tab.id && (
                    <motion.div
                      layoutId="pricing10-tab-indicator"
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
                      className={`text-primary-500 relative z-10 ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                        billing === tab.id
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

        {/* <!-- Pricing Card --> */}
        <div className="lg:ml-auto lg:max-w-[855px]">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <PricingCard
              title="Basic"
              monthlyPrice="$9"
              yearlyPrice="$18"
              description="Perfect for small one-off projects"
              billing={billing}
            />
            <PricingCard
              title="Professional"
              monthlyPrice="$29"
              yearlyPrice="$59"
              description="Great for early-stage startups & founders"
              billing={billing}
            />
            <PricingCard
              title="Enterprise"
              monthlyPrice="$69"
              yearlyPrice="$119"
              description="Designed for large teams and businesses"
              billing={billing}
            />
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="divide-base-100 min-w-full divide-y">
            <thead>
              <tr className="table-row xl:hidden">
                <th className="text-title-50 px-10 py-5 text-left font-medium"></th>
                <th className="text-title-50 px-10 py-5 text-center font-medium">
                  Basic
                </th>
                <th className="text-title-50 px-10 py-5 text-center font-medium">
                  Professional
                </th>
                <th className="text-title-50 px-10 py-5 text-center font-medium">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody className="divide-base-100 divide-y">
              <SectionHeader title="Features" />
              <FeatureRow
                feature="Offline access"
                basic={false}
                professional={true}
                enterprise={true}
              />
              <FeatureRow
                feature="Team size"
                basic="1 user"
                professional="5 users"
                enterprise="Unlimited"
              />
              <FeatureRow
                feature="Storage"
                basic="10GB"
                professional="50GB"
                enterprise="200GB"
              />
              <FeatureRow
                feature="Custom Workflow Setup"
                basic={false}
                professional={true}
                enterprise={true}
              />
              <SectionHeader title="Reporting & Insights" />
              <FeatureRow
                feature="Export reports"
                basic={true}
                professional={true}
                enterprise={true}
              />
              <FeatureRow
                feature="Scheduled reports"
                basic={false}
                professional={true}
                enterprise={true}
              />
              <FeatureRow
                feature="Analytics dashboard"
                basic="Basic"
                professional="Advanced"
                enterprise="Advanced"
              />
              <FeatureRow
                feature="Data Sync"
                basic={false}
                professional={true}
                enterprise={true}
              />
              <SectionHeader title="User & Security" />
              <FeatureRow
                feature="SSO/SAML"
                basic={false}
                professional={true}
                enterprise={true}
              />
              <FeatureRow
                feature="Admin roles"
                basic={false}
                professional={true}
                enterprise={true}
              />
              <FeatureRow
                feature="Data retention"
                basic={false}
                professional="90 days"
                enterprise="1 year"
              />
              <FeatureRow
                feature="Audit logs"
                basic="30 days"
                professional="90 days"
                enterprise="1 year"
              />
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
