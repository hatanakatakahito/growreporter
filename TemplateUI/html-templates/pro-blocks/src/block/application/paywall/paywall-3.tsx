import { useState } from 'react';
import { Button } from '@/components/core/button';
import { Xmark2x, Check } from '@tailgrids/icons';

const features = [
  'Unlimited Projects',
  'Up to 50 Team Members',
  'Real-time Collaboration',
  'Priority File Sharing (up to 1GB/file)',
];

export default function Paywall3() {
  const [activeTab, setActiveTab] = useState('monthly');
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <section className="bg-background-soft-100 flex h-screen items-center justify-center p-5">
      <div className="bg-background-50 relative mx-auto flex max-w-[1014px] flex-col rounded-3xl p-2 sm:flex-row">
        <div className="overflow-hidden sm:w-1/2">
          <img
            src="https://cdn-tailgrids.b-cdn.net/3.0/application/paywall/paywall-2.jpg"
            className="h-full w-full rounded-2xl object-cover"
            alt=""
          />
        </div>
        <div className="p-5 sm:relative sm:w-1/2 lg:px-12 lg:py-11">
          <Button
            variant="ghost"
            iconOnly
            size="sm"
            className="absolute top-5 right-5"
            onClick={() => setIsOpen(false)}
          >
            <Xmark2x className="size-5" />
          </Button>
          <h3 className="text-title-50 mb-3 text-2xl font-medium lg:text-3xl">
            Unlock Premium Forecasts
          </h3>
          <p className="text-text-100 mb-8 text-base">
            Get access to our industry-leading commodity price forecasts and
            gain a competitive edge in the market.
          </p>

          <div>
            <nav className="bg-background-soft-100 flex rounded-lg p-1">
              {/* <!-- Monthly Button --> */}
              <button
                onClick={() => setActiveTab('monthly')}
                className={`w-full cursor-pointer rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'monthly'
                    ? 'bg-background-50 text-title-50'
                    : 'text-text-100 bg-transparent'
                }`}
              >
                Monthly
              </button>

              {/* <!-- Yearly Button --> */}
              <button
                onClick={() => setActiveTab('yearly')}
                className={`w-full cursor-pointer rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'yearly'
                    ? 'bg-background-50 text-title-50'
                    : 'text-text-100 bg-transparent'
                }`}
              >
                Yearly
                <span className="text-title-50">(20% OFF)</span>
              </button>
            </nav>

            <div className="my-6">
              {activeTab === 'monthly' && (
                <h3 className="text-title-50 text-5xl font-semibold">
                  $49
                  <sub className="text-text-100 align-middle text-base font-normal">
                    /month
                  </sub>
                </h3>
              )}
              {activeTab === 'yearly' && (
                <h3 className="text-title-50 text-5xl font-semibold">
                  $500
                  <sub className="text-text-100 align-middle text-base font-normal">
                    /yearly
                  </sub>
                </h3>
              )}
            </div>
          </div>
          <ul className="mb-9 space-y-4">
            {features.map((feature, index) => (
              <li
                key={index}
                className="text-text-50 flex items-center gap-2 text-sm"
              >
                <Check className="size-5" />
                {feature}
              </li>
            ))}
          </ul>
          <div className="space-y-3 text-center">
            <Button className="w-full">Subscribe</Button>
            <p className="text-text-100 text-sm">
              By subscribing, you agree to our Terms of Service and Privacy
              Policy
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
