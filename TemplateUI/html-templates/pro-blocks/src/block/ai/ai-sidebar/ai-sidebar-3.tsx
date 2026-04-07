import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';
import {
  FileText,
  Gallery,
  MenuKebab1,
  PenToSquare,
  Search1,
  ShareNodes,
  ThreeDCube1,
  Trash1,
  WaveformLines,
} from '@tailgrids/icons';

const menuItems = [
  {
    icon: <PenToSquare className="text-text-100 size-6" />,
    label: 'New Chat',
    href: 'javascript:void(0)',
  },
  {
    icon: <WaveformLines className="text-text-100 size-6" />,
    label: 'Voice',
    href: 'javascript:void(0)',
  },
  {
    icon: <ThreeDCube1 className="text-text-100 size-6" />,
    label: 'Projects',
    href: 'javascript:void(0)',
  },
  {
    icon: <FileText className="text-text-100 size-6" />,
    label: 'Files',
    href: 'javascript:void(0)',
  },
  {
    icon: <Gallery className="text-text-100 size-6" />,
    label: 'Images',
    href: 'javascript:void(0)',
  },
];

const chats = [
  { title: 'The Future of AI and Its Impact on Society' },
  { title: 'How Remote Work is Changing the Global Workforce' },
  { title: 'Sustainable Fashion: Trends and Innovations' },
  { title: 'The Importance of Mental Health Awareness in the Workplace' },
];

export default function AiSidebar3() {
  return (
    <div className="flex h-screen">
      <aside className="bg-background-50 flex h-full w-75 flex-col justify-between p-5">
        {/* <!-- header --> */}
        <div className="shrink-0">
          <div className="mb-3">
            <div className="mb-8 flex items-center justify-between">
              <a href="javascript:void(0)">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                  alt=""
                />
              </a>
            </div>
            <div className="relative">
              <span className="text-text-100 pointer-events-none absolute top-1/2 left-3 shrink-0 -translate-y-1/2">
                <Search1 />
              </span>
              <input
                type="text"
                className="border-base-50 placeholder:text-text-200 h-11 w-full rounded-lg border bg-transparent px-3 py-2 pl-11 text-sm placeholder:text-sm focus:ring-0"
                placeholder="Search chat"
              />
            </div>
          </div>
          <div>
            <ul>
              {menuItems.map((item, index) => (
                <li key={index}>
                  <a
                    href={item.href}
                    className="text-title-50 hover:bg-background-soft-100 flex cursor-pointer items-center gap-3 rounded-lg bg-transparent px-3 py-2 text-sm"
                  >
                    {item.icon}
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* <!-- Center --> */}
        <div className="flex flex-1 flex-col justify-center py-6">
          <div className="space-y-8 overflow-y-auto">
            <div>
              <h4 className="text-text-100 mb-4 pl-3 text-sm">Chats</h4>
              <ul className="space-y-1">
                {chats.map((chat, index) => (
                  <li key={index}>
                    <div className="group hover:bg-background-soft-200 relative flex items-center justify-between rounded-lg">
                      <a
                        href="javascript:void(0)"
                        className="text-text-100 relative flex h-9 w-full items-center overflow-hidden rounded-lg p-3 pr-10 text-sm"
                      >
                        <span className="relative z-10 line-clamp-1">
                          {chat.title}
                        </span>
                      </a>
                      <div className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="text-text-100 hover:text-text-50 hover:bg-background-soft-300 data-pressed:bg-background-soft-300 data-pressed:text-text-50 flex items-center justify-center rounded-full p-1 outline-hidden transition-colors">
                            <MenuKebab1 />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            placement="bottom start"
                            className="bg-dropdown-background border-base-50 min-w-[140px] rounded-lg border p-1.5 shadow-lg"
                          >
                            <DropdownMenuItem className="text-text-50 hover:bg-background-soft-100 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-hidden">
                              <PenToSquare className="size-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-text-50 hover:bg-background-soft-100 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-hidden">
                              <ShareNodes className="size-4" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-error-500 hover:bg-error-50 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-hidden">
                              <Trash1 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        {/* <!-- Bottom --> */}
        <div className="hover:bg-background-soft-100 flex shrink-0 cursor-pointer items-center rounded-lg p-3">
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-sidebar/avatar.png"
                className="h-10 w-10 rounded-full"
                alt="avatar"
              />
            </div>
            <div>
              <h3 className="text-text-50 text-sm font-medium">
                Jaylon Kenter
              </h3>
            </div>
          </div>
        </div>
      </aside>
      <div className="bg-background-soft-100 h-full flex-1 overflow-y-auto p-5">
        <div>Hello</div>
      </div>
    </div>
  );
}
