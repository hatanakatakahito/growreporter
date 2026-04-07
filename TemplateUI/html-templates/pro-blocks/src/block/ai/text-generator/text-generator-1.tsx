import {
  ArrowUpward,
  Globe2,
  Microphone1,
  Paperclip2,
  Sparkle,
} from '@tailgrids/icons';

export default function TextGenerator1() {
  return (
    <section>
      <div className="bg-background-50 flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto w-full max-w-3xl">
          {/* <!-- Header Section --> */}
          <div className="mx-auto mb-12 max-w-md text-center">
            {/* <!-- New Badge --> */}
            <div className="mb-6 flex justify-center">
              <div className="text-text-50 relative inline-flex h-8 items-center gap-2 rounded-full py-2 pr-4 pl-1.5 text-sm font-medium">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/shape-1.png"
                  className="absolute left-0 rounded-full"
                  alt=""
                />
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/shape-2.png"
                  className="absolute right-0 rounded-full"
                  alt=""
                />
                <span className="bg-background-50 relative z-10 inline-flex items-center gap-1 overflow-hidden rounded-full px-2 py-0.5 text-sm font-medium">
                  <Sparkle className="size-4" />
                  New
                </span>
                <span className="text-title-50 relative z-10 text-sm font-medium">
                  Create Smarter, Faster with AI
                </span>
              </div>
            </div>
            {/* <!-- Main Heading --> */}
            <h1 className="from-foreground-soft-200 to-text-200 bg-linear-to-r bg-clip-text text-4xl leading-10 font-medium text-transparent">
              Build Smarter, Ship Faster with TailGrids AI
            </h1>
          </div>

          {/* <!-- Text Generator Interface --> */}
          <div className="bg-background-soft-100 rounded-3xl p-1 shadow-[0_12px_32px_-2px_rgba(16,24,40,0.03)]">
            {/* <!-- Chat Input --> */}
            <div className="relative">
              <textarea
                className="bg-background-50 text-title-50 placeholder:text-text-200 block h-30 w-full resize-none rounded-[20px] border-0 px-5 py-4.5 focus:ring-0 sm:leading-6"
                placeholder="Ask me anything..."
              ></textarea>
              {/* <!-- Bottom Controls --> */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                {/* <!-- Left Controls --> */}
                <div className="flex items-center gap-2">
                  <button className="bg-background-50 hover:bg-background-soft-200 text-text-100 inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors">
                    <Paperclip2 className="size-5" />
                    Attach
                  </button>
                  <button className="hover:text-text-50 hover:bg-background-soft-200 text-text-200 inline-flex cursor-pointer items-center gap-2 rounded-full bg-transparent px-3 py-2 text-sm font-medium transition-colors">
                    <Globe2 className="size-5" />
                    Deep Research
                  </button>
                </div>

                {/* <!-- Right Controls --> */}
                <div className="flex items-center gap-3">
                  <button className="hover:bg-background-soft-200 text-text-100 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors">
                    <Microphone1 className="size-5" />
                  </button>
                  <button className="hover:bg-foreground-soft-500 text-white-100 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gray-800 transition-colors">
                    <ArrowUpward className="size-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
