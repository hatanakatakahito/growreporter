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

export default function Paywall2() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <section className="bg-background-soft-50 flex h-screen items-center p-5">
      <div className="mx-auto max-w-[700px]">
        <div className="bg-background-soft-100 relative rounded-4xl px-2.5 pt-6 pb-2.5">
          <div className="mb-5 text-center">
            <h3 className="text-title-50 text-xl font-medium">
              Upgrade to Pro Plan
            </h3>
          </div>
          <Button
            variant="ghost"
            iconOnly
            size="sm"
            className="r absolute top-4 right-3"
            onClick={() => setIsOpen(false)}
          >
            <Xmark2x className="size-5" />
          </Button>
          <div className="bg-background-50 space-y-9 rounded-3xl px-6 py-8 shadow-xs sm:px-10">
            <div className="text-center">
              <svg
                className="mx-auto mb-6"
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="39"
                viewBox="0 0 48 39"
                fill="none"
              >
                <path
                  d="M25.3069 1.16979C24.9748 0.79683 24.4992 0.583496 23.9998 0.583496C23.5005 0.583496 23.0249 0.79683 22.6928 1.16979L13.0079 12.0474L3.51323 4.41146C2.98839 3.98936 2.26788 3.90593 1.66045 4.19691C1.05303 4.48789 0.666504 5.10164 0.666504 5.77516V33.2502C0.666504 36.1497 3.01701 38.5002 5.9165 38.5002H42.0832C44.9827 38.5002 47.3332 36.1497 47.3332 33.2502V5.77516C47.3332 5.10164 46.9466 4.48789 46.3392 4.19691C45.7318 3.90593 45.0113 3.98936 44.4864 4.41146L34.9918 12.0474L25.3069 1.16979Z"
                  fill="#91AEFF"
                />
              </svg>
              <h2 className="text-title-50 mb-3 text-2xl font-medium lg:text-3xl">
                Unlock Premium Features
              </h2>
              <p className="text-text-100 text-base">
                You've reached a premium article/resource. To continue see you
                need to become a subscriber.
              </p>
            </div>
            <ul className="mt-11 mb-9 columns-1 space-y-4 sm:columns-2">
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
              <Button className="w-full">See Our Plans</Button>
              <p className="text-text-100 text-sm">
                Start from Only $12/month · Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
