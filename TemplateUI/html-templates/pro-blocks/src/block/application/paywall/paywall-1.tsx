import { useState } from 'react';
import { Button } from '@/components/core/button';
import { Xmark2x, Check } from '@tailgrids/icons';

const features = [
  'Unlimited Projects',
  'Up to 50 Team Members',
  'Real-time Collaboration',
  'Priority File Sharing (up to 1GB/file)',
  'Task Automation Tools',
  'Advanced Analytics Dashboard',
  'Dedicated Workspace',
  'No Storage Limits',
  'Priority email support',
];

export default function Paywall1() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <section className="bg-background-soft-100 flex h-screen items-center p-5 py-20">
      <div className="bg-background-50 relative mx-auto flex w-full max-w-6xl flex-col rounded-3xl p-2 sm:flex-row">
        <div className="overflow-hidden">
          <img
            src="https://cdn-tailgrids.b-cdn.net/3.0/application/paywall/paywall-1.jpg"
            className="border-base-100 h-full w-full rounded-2xl border object-cover"
            alt=""
          />
        </div>
        <div className="p-5 sm:relative lg:px-12 lg:py-11">
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
            Upgrade to Pro Teams
          </h3>
          <p className="text-text-100 text-base">
            Collaborate without limits, boost efficiency, and keep everyone in
            sync.
          </p>
          <ul className="mt-11 mb-9 columns-2 space-y-4">
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
          <Button className="w-full">See Pricing Plans</Button>
        </div>
      </div>
    </section>
  );
}
