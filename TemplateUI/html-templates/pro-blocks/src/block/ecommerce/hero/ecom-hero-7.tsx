import { Button } from '@/components/core/button';
import {
  Copy4,
  Message1,
  RefreshCircle1Clockwise,
  Shield1Check,
  TruckDelivery2x,
} from '@tailgrids/icons';

export default function EcomHero7() {
  return (
    <section className="bg-background-50">
      <div className="mx-auto max-w-[1440px] p-12">
        <div className="relative mb-12 flex h-[449px] items-center justify-start rounded-2xl lg:min-h-[638px]">
          <img
            src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-07/cover.jpg"
            className="h-full w-full rounded-2xl object-cover"
            alt="product"
          />
          <div className="absolute inset-0 h-full w-full rounded-2xl bg-gradient-to-l from-gray-800/20 from-10% to-gray-900/20 to-10%"></div>
          <div className="absolute top-1/2 z-30 -translate-y-1/2 p-5 lg:pl-16">
            <span className="bg-background-50/20 mb-4 inline-flex h-6 items-center justify-center rounded-full px-2.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              Sale Ongoing
            </span>
            <h1 className="text-white-100 mb-5 text-4xl font-medium lg:text-5xl">
              Street Smart, Style Forward
            </h1>
            <span className="text-text-300 text-base font-medium">
              Get 25% OFF of first order with code “STREET25”
            </span>
            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:gap-7">
              <Button>
                <a href="javascript:void(0)">Grab Deals</a>
              </Button>
              <button className="text-white-100 flex items-center gap-2 text-base font-medium">
                <Copy4 />
                STREET25
              </button>
            </div>
          </div>
        </div>
        <div className="bg-background-soft-100 grid grid-cols-1 justify-between gap-8 rounded-2xl p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex gap-4">
            <div>
              <TruckDelivery2x className="text-text-50 size-10" />
            </div>
            <div>
              <h4 className="text-title-50 font-medium">Free Shipping</h4>
              <p className="text-text-100 text-base">For all orders $100</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <RefreshCircle1Clockwise className="text-text-50 size-10" />
            </div>
            <div>
              <h4 className="text-title-50 font-medium">1 & 1 Returns</h4>
              <p className="text-text-100 text-base">
                Cancellation after 1 day
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <Shield1Check className="text-text-50 size-10" />
            </div>
            <div>
              <h4 className="text-title-50 font-medium">
                100% Secure Payments
              </h4>
              <p className="text-text-100 text-base">
                Gurantee secure payments
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <Message1 className="text-text-50 size-10" />
            </div>
            <div>
              <h4 className="text-title-50 font-medium">
                24/7 Dedicated Support
              </h4>
              <p className="text-text-100 text-base">Anywhere & anytime</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
