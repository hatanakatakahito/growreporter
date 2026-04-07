import { useState } from 'react';
import { Button } from '@/components/core/button';
import { Xmark2x, Check } from '@tailgrids/icons';

const features = [
  'Unlimited Storage & Access',
  'Submit & Share Your Own Tools',
  'Priority Review for Submissions',
  'Team & Community Collaboration',
  'Early Access to New Features',
];

export default function Paywall5() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <section className="bg-background-soft-100 flex h-screen items-center justify-center p-5">
      <div className="bg-background-50 relative mx-auto flex max-w-6xl flex-col rounded-3xl p-2 sm:flex-row">
        <div className="bg-primary-500/5 relative overflow-hidden rounded-2xl">
          <img
            src="https://cdn-tailgrids.b-cdn.net/3.0/application/paywall/image.png"
            className="border-base-100 h-full w-full rounded-2xl border object-cover"
            alt=""
          />
          <img
            src="https://cdn-tailgrids.b-cdn.net/3.0/application/paywall/logo.svg"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            alt=""
          />
        </div>
        <div className="flex-1 p-5 sm:relative lg:px-12 lg:py-11">
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
            Go Beyond Resources
          </h3>
          <p className="text-text-100 text-base">
            Turn your workspace into a hub of premium resources and tools.
          </p>
          <ul className="mt-11 mb-9 space-y-4">
            {features.map((feature, index) => (
              <li
                key={index}
                className="text-text-50 flex items-center gap-2 text-base"
              >
                <Check className="size-5" />
                {feature}
              </li>
            ))}
          </ul>

          <Button className="w-full">See Pricing Plans</Button>
          <p className="text-text-100 mt-4 text-sm">
            Start form Only $12/month · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
