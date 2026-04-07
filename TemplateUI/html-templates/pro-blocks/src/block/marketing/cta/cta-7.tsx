import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';

export default function Cta7() {
  return (
    <section className="py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="bg-background-soft-50 relative overflow-hidden rounded-3xl px-5 py-20">
          <div className="from-background-soft-400/0 via-background-soft-400 to-background-soft-200/0 absolute -top-10 -left-10 h-[400px] w-[209px] rotate-45 bg-linear-to-b"></div>
          <div className="from-background-soft-200/0 via-background-soft-400 to-background-soft-400/0 absolute -top-10 -right-16 h-[400px] w-[209px] rotate-45 bg-linear-to-b"></div>

          <div className="relative z-20 mx-auto max-w-2xl">
            <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
              Get Early Access Now
            </h2>
            <p className="text-text-100 text-center text-base sm:px-24">
              There are many variations of available but the majority have
              suffered alteration in some form.
            </p>
            <div className="mx-auto mt-9 flex max-w-[460px] flex-col gap-3 sm:flex-row">
              <Input
                type="text"
                className="w-full shrink-0"
                placeholder="info@gmail.com"
              />
              <Button className="shrink-0">Get Started</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
