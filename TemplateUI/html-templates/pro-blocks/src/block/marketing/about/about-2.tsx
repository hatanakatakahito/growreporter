import { Button } from '@/components/core/button';
import {
  Brain1,
  ChevronRight,
  RefreshCircle3Clockwise,
} from '@tailgrids/icons';

const imageOne =
  'https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-02/Image-1.jpg';
const imageTwo =
  'https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-02/Image-2.jpg';

export default function About2() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="flex flex-col items-center gap-14 lg:flex-row">
          <div className="lg:w-5/12">
            <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
              About us
            </span>
            <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
              Works effortlessly with your favorite tools
            </h2>
            <p className="text-text-100 mb-8 text-base">
              We create flexible, developer-friendly UI components powered by
              Tailwind CSS. From startups to enterprise apps, TailGrids helps
              you build smarter, ship faster.
            </p>

            <Button variant="primary">
              Learn More
              <ChevronRight />
            </Button>
          </div>
          <div className="lg:w-7/12">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-5">
                <img src={imageOne} className="w-full rounded-xl" alt="" />
                <div className="bg-background-soft-100 rounded-xl px-6 py-10">
                  <span className="bg-primary-500 inline-flex h-10 w-10 items-center justify-center rounded-full text-white">
                    <Brain1 />
                  </span>
                  <h3 className="text-title-50 mt-10 mb-3.5 text-2xl font-semibold">
                    AI-Powered Insights
                  </h3>
                  <p className="text-text-100 text-base">
                    Lorem ipsum dolor sit amet consectetur risus mat
                  </p>
                </div>
              </div>
              <div className="space-y-5">
                <div className="bg-background-soft-100 rounded-xl px-6 py-10">
                  <span className="bg-primary-500 inline-flex h-10 w-10 items-center justify-center rounded-full text-white">
                    <RefreshCircle3Clockwise />
                  </span>
                  <h3 className="text-title-50 mt-10 mb-3.5 text-2xl font-semibold">
                    Real-Time Updates
                  </h3>
                  <p className="text-text-100 text-base">
                    Lorem ipsum dolor sit amet consectetur risus mat
                  </p>
                </div>
                <img src={imageTwo} className="w-full rounded-xl" alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
