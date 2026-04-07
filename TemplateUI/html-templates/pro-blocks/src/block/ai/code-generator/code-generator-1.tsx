import { Paperclip2, Globe2, Microphone1, ArrowUpward } from '@tailgrids/icons';

export default function CodeGenerator1() {
  return (
    <section>
      <div className="bg-background-50 flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto w-full max-w-3xl">
          {/* Header Section */}
          <div className="mx-auto mb-12 max-w-md text-center">
            {/* New Badge */}
            <div className="mb-6 flex justify-center">
              <div className="text-text-50 relative inline-flex h-8 items-center gap-2 rounded-full py-2 pr-4 pl-1.5 text-sm font-medium">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/shape-1.png"
                  className="absolute left-0 rounded-full"
                  alt="shape-1"
                />
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/ai/generator/shape-2.png"
                  className="absolute right-0 rounded-full"
                  alt="shape-2"
                />
                <span className="bg-background-50 relative z-10 inline-flex items-center gap-1 overflow-hidden rounded-full px-2 py-0.5 text-sm font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={16}
                    height={17}
                    viewBox="0 0 16 17"
                    fill="none"
                  >
                    <g clipPath="url(#clip0_11928_2891)">
                      <path
                        d="M7.23614 5.31371L7.71945 6.42077C8.14962 7.40591 8.92383 8.19014 9.88957 8.61882L11.22 9.20936C11.6429 9.3971 11.6429 10.0124 11.22 10.2002L9.9311 10.7723C8.94051 11.212 8.15243 12.0253 7.72964 13.044L7.24005 14.2238C7.05836 14.6616 6.45344 14.6616 6.27177 14.2238L5.78216 13.044C5.35937 12.0253 4.57126 11.212 3.58068 10.7723L2.29184 10.2002C1.86886 10.0124 1.86886 9.3971 2.29184 9.20936L3.62224 8.61882C4.58798 8.19014 5.3622 7.40591 5.79233 6.42077L6.27568 5.31371C6.46147 4.88822 7.05032 4.88822 7.23614 5.31371ZM12.0753 2.61831L12.2113 2.92985C12.4536 3.48531 12.89 3.9276 13.4346 4.16953L13.8533 4.35562C14.0799 4.45623 14.0799 4.7854 13.8533 4.88602L13.458 5.0617C12.8994 5.30985 12.4552 5.7685 12.217 6.34285L12.0774 6.6795C11.9801 6.91411 11.6557 6.91411 11.5584 6.6795L11.4189 6.34285C11.1807 5.7685 10.7365 5.30985 10.1779 5.0617L9.78251 4.88602C9.55606 4.7854 9.55606 4.45623 9.78251 4.35562L10.2013 4.16953C10.7459 3.9276 11.1823 3.48531 11.4246 2.92985L11.5606 2.61831C11.66 2.39025 11.9758 2.39025 12.0753 2.61831Z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_11928_2891">
                        <rect
                          width={16}
                          height={16}
                          fill="white"
                          transform="translate(0 0.5)"
                        />
                      </clipPath>
                    </defs>
                  </svg>
                  New
                </span>
                <span className="text-title-50 relative z-10 text-sm font-medium">
                  Create Smarter, Faster with AI
                </span>
              </div>
            </div>
            {/* Main Heading */}
            <h1 className="from-foreground-soft-200 to-text-200 bg-linear-to-r bg-clip-text text-4xl leading-10 font-medium text-transparent">
              Build Beautiful Web Apps with Simple Prompt
            </h1>
          </div>
          {/* Text Generator Interface */}
          <div className="bg-background-soft-100 rounded-3xl p-1 shadow-[0_12px_32px_-2px_rgba(16,24,40,0.03)]">
            {/* Chat Input */}
            <div className="relative">
              <textarea
                className="bg-background-50 text-title-50 placeholder:text-text-200 block h-30 w-full resize-none rounded-[20px] border-0 px-5 py-4.5 focus:ring-0 sm:leading-6"
                placeholder="Ask me anything..."
                defaultValue={''}
              />
              {/* Bottom Controls */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                {/* Left Controls */}
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
                {/* Right Controls */}
                <div className="flex items-center gap-3">
                  <button className="hover:bg-background-soft-200 text-text-100 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors">
                    <Microphone1 className="size-5" />
                  </button>
                  <button className="hover:bg-foreground-soft-500 bg-foreground-soft-500 text-white-100 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors">
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
