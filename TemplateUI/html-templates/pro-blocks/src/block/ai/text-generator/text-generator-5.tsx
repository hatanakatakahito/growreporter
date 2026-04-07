import {
  ArrowUpward,
  Gallery,
  Microphone1,
  Newspaper,
  Paperclip2,
  Play,
  Search1,
  SlidersDoubleHorizontal,
} from '@tailgrids/icons';

interface QuickAction {
  id: number;
  label: string;
  icon: React.ReactNode;
}

const quickActions: QuickAction[] = [
  {
    id: 1,
    label: 'Deep Search',
    icon: <Search1 className="text-text-100 size-4" />,
  },
  {
    id: 2,
    label: 'Create Images',
    icon: <Gallery className="text-text-100 size-5" />,
  },
  {
    id: 3,
    label: 'Latest News',
    icon: <Newspaper className="text-text-100 size-5" />,
  },
  {
    id: 4,
    label: 'Generate Video',
    icon: <Play className="text-text-100 size-5" />,
  },
];

export default function TextGenerator5() {
  return (
    <section>
      <div className="bg-background-50 flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto w-full max-w-3xl">
          {/* Header Section */}
          <div className="mx-auto mb-11 max-w-md text-center">
            {/* Main Heading */}
            <h1 className="from-primary-500 to-primary-300 mb-3 bg-linear-to-r bg-clip-text text-3xl leading-9 font-normal text-transparent">
              Hey, How Can I Assist?
            </h1>
            <p className="text-text-100 text-sm leading-5">
              Tailgrids AI is our smartest and fastest chatbot — built to give
              you accurate, helpful answers every time.
            </p>
          </div>

          {/* Text Generator Interface */}
          <div className="relative z-50 mx-auto max-w-[800px]">
            <div className="from-primary-400/30 to-primary-300/30 rounded-3xl bg-linear-to-r p-px shadow-[0_20px_32px_0_rgba(17,24,39,0.04)]">
              <div className="bg-background-50 rounded-3xl p-6">
                {/* Chat Input */}
                <textarea
                  className="text-title-50 border-base-50 placeholder:text-text-200 block w-full resize-none border-0 bg-transparent p-0 focus:ring-0 sm:text-lg sm:leading-6"
                  placeholder="Ask me anything..."
                ></textarea>
                {/* Bottom Controls */}
                <div className="flex items-center justify-between">
                  {/* Left Controls */}
                  <div className="flex items-center gap-3">
                    <button className="text-text-50">
                      <Paperclip2 className="size-5" />
                    </button>
                    <button className="text-text-100">
                      <Microphone1 className="size-5" />
                    </button>
                    <button className="text-title-50 flex items-center gap-2 font-medium">
                      <SlidersDoubleHorizontal className="size-4" />
                      Tools
                    </button>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center">
                    <button className="hover:bg-foreground-soft-500 text-white-100 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gray-800 transition-colors">
                      <ArrowUpward className="size-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-7 flex flex-wrap justify-center gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  className="border-base-50 flex cursor-pointer items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm"
                >
                  {action.icon}
                  <span className="text-text-50">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
