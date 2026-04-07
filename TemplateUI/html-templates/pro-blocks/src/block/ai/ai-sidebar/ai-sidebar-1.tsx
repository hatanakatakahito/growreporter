import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';
import {
  Book4,
  Copy1,
  Layout22,
  MenuKebab1,
  PenToSquare,
  Search1,
  ShareNodes,
  Trash1,
} from '@tailgrids/icons';
import { useState } from 'react';

// Types
interface ChatItem {
  title: string;
}

interface MenuLink {
  icon: React.ReactNode;
  label: string;
  href: string;
}

const AiSidebar1 = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Data
  const menuLinks: MenuLink[] = [
    {
      icon: <PenToSquare className="text-text-100 size-5" />,
      label: 'New chat',
      href: 'javascript:void(0)',
    },
    {
      icon: <Book4 className="text-text-100 size-5" />,
      label: 'Library',
      href: 'javascript:void(0)',
    },
    {
      icon: <Copy1 className="text-text-100 size-5" />,
      label: 'Copy',
      href: 'javascript:void(0)',
    },
  ];

  const recentChats: ChatItem[] = [
    { title: 'The Future of AI and Its Impact on Society' },
    { title: 'Write a email to your friend' },
    { title: 'E-commerce and Its Effects on Traditional Retail' },
    { title: 'The Role of Digital Marketing' },
  ];

  const sevenDaysChats: ChatItem[] = [
    { title: 'Write a email to your friend' },
    { title: 'E-commerce and Its Effects on Traditional Retail' },
    { title: 'The Role of Digital Marketing' },
  ];

  // Chat item component
  const ChatListItem = ({ title }: { title: string }) => (
    <li className="group relative">
      <div className="group-hover:bg-background-soft-400 relative rounded-lg">
        <a
          href="javascript:void(0)"
          className="text-text-100 relative inline-flex h-9 items-center overflow-hidden rounded-lg p-3 pr-10 text-sm"
        >
          <span className="relative z-10 line-clamp-1">{title}</span>
        </a>
        <div className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger className="text-text-100 hover:text-text-50 hover:bg-background-soft-300 data-pressed:bg-background-soft-300 data-[pressed]:text-text-50 flex items-center justify-center rounded-full p-1 outline-hidden transition-colors">
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
  );

  return (
    <div className="flex h-screen">
      <aside
        className={`bg-background-soft-200 flex h-full flex-col justify-between px-4 py-5 transition-all duration-300 ${
          isCollapsed ? 'w-[88px] items-center' : 'w-[300px]'
        }`}
      >
        {/* Header */}
        <div className={`w-full ${isCollapsed ? 'flex flex-col gap-6' : ''}`}>
          <div
            className={`mb-7 flex items-center ${
              isCollapsed ? 'flex-col justify-center gap-4' : 'justify-between'
            }`}
          >
            <a href="javascript:void(0)">
              {isCollapsed ? (
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/taigrids-logo-icon.svg"
                  alt="Logo"
                  className="mx-auto flex justify-center"
                />
              ) : (
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                  alt="Logo"
                />
              )}
            </a>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-text-100"
            >
              <Layout22 />
            </button>
          </div>

          {/* Search */}
          <form action="#" className="mb-3 w-full">
            <div
              className={`relative flex items-center ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <span
                className={`text-text-100 pointer-events-none absolute top-1/2 shrink-0 -translate-y-1/2 ${
                  isCollapsed ? 'left-1/2 -translate-x-1/2' : 'left-3'
                }`}
              >
                <Search1 />
              </span>
              {!isCollapsed && (
                <input
                  type="text"
                  placeholder="Search chat..."
                  className="bg-background-50 h-11 w-full rounded-lg border-0 px-4 py-2.5 pl-10 text-sm shadow-xs focus:outline-none"
                />
              )}
              {isCollapsed && (
                <div className="bg-background-50 h-11 w-11 rounded-lg"></div>
              )}
            </div>
          </form>

          {/* Menu Links */}
          <div className="bg-background-50 divide-base-50 mb-7 divide-y rounded-xl">
            {menuLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className={`text-title-50 hover:text-title-50 flex items-center gap-2 py-3 ${
                  isCollapsed
                    ? 'justify-center px-0'
                    : 'px-5 first:rounded-t-xl last:rounded-b-xl'
                }`}
              >
                {link.icon}
                {!isCollapsed && (
                  <span className="text-sm font-medium">{link.label}</span>
                )}
              </a>
            ))}
          </div>
        </div>

        {/* Chats */}
        {!isCollapsed && (
          <div className="w-full flex-1">
            <div className="h-[300px] space-y-8 overflow-y-auto">
              {/* Recent */}
              <div>
                <h4 className="text-text-100 mb-4 pl-3 text-sm">Recent</h4>
                <ul className="space-y-1">
                  {recentChats.map((chat, index) => (
                    <ChatListItem key={index} title={chat.title} />
                  ))}
                </ul>
              </div>

              {/* 7 Days */}
              <div>
                <h4 className="text-text-100 mb-4 pl-3 text-sm">7 Days</h4>
                <ul className="space-y-1">
                  {sevenDaysChats.map((chat, index) => (
                    <ChatListItem key={index} title={chat.title} />
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Bottom */}
        {!isCollapsed && (
          <div className="bg-background-50 relative w-full overflow-hidden rounded-xl px-4 py-3">
            <div className="relative z-20 flex items-center justify-between">
              <div>
                <h3 className="text-text-50 text-sm font-medium">
                  100 Credit left today
                </h3>
                <p className="text-text-100 text-xs">Upgrade for more</p>
              </div>
              <button className="bg-background-50 text-text-50 h-7 cursor-pointer rounded-full px-3 py-1 text-xs font-medium">
                Upgrade
              </button>
            </div>
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-sidebar/shape.png"
              className="absolute top-0 right-0 z-10 h-full w-full"
              alt=""
            />
          </div>
        )}
      </aside>

      <div className="flex-1"></div>
    </div>
  );
};

export default AiSidebar1;
