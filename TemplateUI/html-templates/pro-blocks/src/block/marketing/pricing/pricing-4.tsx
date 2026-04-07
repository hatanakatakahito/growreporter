import { Button } from '@/components/core/button';
import {
  CertificateBadge1,
  Check,
  ClockThree,
  DashboardCircle,
  FileText,
  Locked3,
  Page,
  ThreeDCube1,
  User2,
} from '@tailgrids/icons';
import { motion } from 'framer-motion';
import { useState } from 'react';

// Tab options for the pricing toggle
const tabs = [
  { id: 'monthly', label: 'Monthly', badge: undefined },
  { id: 'yearly', label: 'Yearly', badge: '20% Off' },
] as const;

const Pricing4 = () => {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Basic',
      description: 'Perfect for students and solo learners',
      monthlyPrice: '$9.99',
      yearlyPrice: '$300',
      icon: <DashboardCircle className="text-primary-500 size-10" />,
      features: [
        'Access to 100+ courses',
        'Personalized learning paths',
        'Mobile & tablet support',
        'Community forum access',
      ],
      details: [
        { icon: 'user', text: '1 user' },
        { icon: 'clock', text: '7-day course progress history' },
        { icon: 'certificate', text: 'Downloadable certificates' },
      ],
      bgColor: 'bg-background-soft-100',
      textColor: 'text-text-50',
      buttonText: 'Get Basic',
    },
    {
      name: 'Pro Plan',
      description: 'Designed for active learners & educators',
      monthlyPrice: '$29.99',
      yearlyPrice: '$300',
      icon: <ThreeDCube1 className="text-primary-500 size-10" />,
      features: [
        'Access to 100+ courses',
        'Personalized learning paths',
        'Mobile & tablet support',
        'Community forum access',
      ],
      details: [
        { icon: 'user', text: '1 user' },
        { icon: 'clock', text: '7-day course progress history' },
        { icon: 'integration', text: 'Integrates with Google Classroom' },
      ],
      bgColor: 'bg-linear-180 from-primary-500/20 to-primary-500',
      textColor: 'text-white-100',
      isPopular: true,
      buttonText: 'Get Basic',
    },
    {
      name: 'Institution Plan',
      description: 'Best for schools, coaching centers & verities',
      monthlyPrice: 'Custom',
      yearlyPrice: '$300',
      icon: <CertificateBadge1 className="text-primary-500 size-10" />,
      features: [
        'Access to 100+ courses',
        'Personalized learning paths',
        'Mobile & tablet support',
        'Community forum access',
      ],
      details: [
        { icon: 'user', text: '1 user' },
        { icon: 'clock', text: '7-day course progress history' },
        { icon: 'sso', text: 'SSO & enterprise integrations' },
      ],
      bgColor: 'bg-background-soft-100',
      textColor: 'text-text-50',
      buttonText: 'Get Basic',
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User2 className="size-5" />;
      case 'clock':
        return <ClockThree className="size-5" />;
      case 'certificate':
        return <FileText className="size-5" />;
      case 'integration':
        return <Page className="size-5" />;
      case 'sso':
        return <Locked3 className="size-5" />;
      case 'check':
        return <Check className="size-5" />;
      default:
        return null;
    }
  };

  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Pricing
          </span>
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            Flexible Plans for Every Learner
          </h2>
          <p className="text-text-100 px-5 text-center text-base lg:px-24">
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
                      layoutId="pricing4-tab-indicator"
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
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((p, index) => (
              <div
                key={index}
                className={`border-base-100 border ${
                  p.isPopular ? 'bg-background-soft-50' : ''
                } rounded-2xl p-3`}
              >
                <div className={`${p.bgColor} relative rounded-xl px-5 py-7`}>
                  {p.isPopular && (
                    <span className="bg-background-50 text-title-50 absolute top-5 right-5 flex items-center justify-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="10"
                        height="12"
                        viewBox="0 0 10 12"
                        fill="none"
                      >
                        <path
                          d="M5.40702 1.375L1.39258 7.01759H4.59295L4.59295 10.625L8.6074 4.98241L5.40702 4.98241V1.375Z"
                          stroke="#1F2937"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Most popular
                    </span>
                  )}
                  <div className="bg-background-50 inline-flex h-[60px] w-[60px] items-center justify-center rounded-xl">
                    {p.icon}
                  </div>
                  <div className="my-9">
                    <h3
                      className={`text-2xl font-semibold ${p.textColor} mb-1`}
                    >
                      {p.name}
                    </h3>
                    <p className={`text-base ${p.textColor}`}>
                      {p.description}
                    </p>
                  </div>
                  <div>
                    <span className="flex items-center gap-3">
                      <span className={`text-5xl font-bold ${p.textColor}`}>
                        {plan === 'monthly' ? p.monthlyPrice : p.yearlyPrice}
                        {plan === 'monthly' && p.name === 'Pro Plan' && (
                          <span className="text-base font-normal">/Month</span>
                        )}
                        {plan === 'yearly' && p.name === 'Pro Plan' && (
                          <span className="text-base font-normal">/Year</span>
                        )}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="px-5 pb-4">
                  <div className="py-7">
                    <span className="text-text-50 mb-6 inline-block text-xl font-medium">
                      What's Included
                    </span>
                    <ul className="space-y-4">
                      {p.features.map((feature, i) => (
                        <li
                          key={i}
                          className="text-text-100 flex items-center gap-2 font-normal"
                        >
                          {getIcon('check')}
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-base-100 border-t border-dashed py-7">
                    <ul className="space-y-4">
                      {p.details.map((detail, i) => (
                        <li
                          key={i}
                          className="text-text-100 flex items-center gap-2 font-normal"
                        >
                          {getIcon(detail.icon)}
                          {detail.text}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button className="w-full">
                    <a href="javascript:void(0)">{p.buttonText}</a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing4;
