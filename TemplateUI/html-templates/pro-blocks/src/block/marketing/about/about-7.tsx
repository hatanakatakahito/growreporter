import { Button } from '@/components/core/button';

const imageOne =
  ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-07/Image-1.jpg';
const imageTwo =
  ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-07/Image-2.jpg';
const imageThree =
  ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-07/Image-3.jpg';

export default function About7() {
  return (
    <section className="bg-background-50 py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            What We Stand For
          </h2>
          <p className="text-text-50 text-center text-base lg:px-4">
            Lorem Ipsum is simply dummy text of the printing and typesetting
            industry. Lorem Ipsum has been the industry's standard dummy text
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button>
              <a href="javascript:void(0)">Get Started</a>
            </Button>

            <Button appearance="outline">
              <a href="javascript:void(0)">Learn More</a>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="space-y-5">
            <img src={imageOne} className="w-full rounded-xl" alt="" />
            <div className="bg-background-soft-100 rounded-xl px-8 py-10">
              <span className="text-title-50 mb-1 block text-4xl sm:text-5xl">
                2.25M
              </span>
              <span className="text-text-50 mb-3.5 block text-base font-normal">
                Products Sold
              </span>
              <p className="text-text-100 mt-5 text-base">
                Lorem ipsum dolor sit amet consectetur risus mat
              </p>
            </div>
          </div>
          <div className="space-y-5">
            <div className="bg-background-soft-100 rounded-xl px-8 py-10">
              <span className="text-title-50 mb-1 block text-4xl sm:text-5xl">
                98%
              </span>
              <span className="text-text-50 mb-3.5 block text-base font-normal">
                Customer Satisfaction
              </span>
              <p className="text-text-100 mt-5 text-base">
                Lorem ipsum dolor sit amet consectetur risus mat
              </p>
            </div>
            <img src={imageTwo} className="w-full rounded-xl" alt="" />
          </div>
          <div className="space-y-5">
            <img src={imageThree} className="w-full rounded-xl" alt="" />
            <div className="bg-background-soft-100 rounded-xl px-8 py-10">
              <span className="text-title-50 mb-1 block text-4xl sm:text-5xl">
                150+
              </span>
              <span className="text-text-50 mb-3.5 block text-base font-normal">
                Project Completed
              </span>
              <p className="text-text-100 mt-5 text-base">
                Lorem ipsum dolor sit amet consectetur risus mat
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
