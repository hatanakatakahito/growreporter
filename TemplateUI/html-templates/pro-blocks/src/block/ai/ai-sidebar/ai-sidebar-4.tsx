import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';
import {
  Layout22,
  Plus,
  Search1,
  Globe2,
  Book4,
  Bell1,
  MenuKebab1,
  UserMultiple4,
  PenToSquare,
  ShareNodes,
  Trash1,
} from '@tailgrids/icons';
import { Input } from '@/components/core/input';

// Types
interface ChatItem {
  title: string;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

// Gift icon component
const GiftIcon = () => (
  <svg
    className="size-6"
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M6.75049 5C6.75049 3.34315 8.09363 2 9.75049 2C10.6465 2 11.4508 2.39282 12.0005 3.01563C12.5502 2.39282 13.3545 2 14.2505 2C15.9073 2 17.2505 3.34315 17.2505 5C17.2505 5.54643 17.1044 6.05874 16.8491 6.5H18.5088C19.7514 6.5 20.7588 7.50736 20.7588 8.75V10.25H3.24219V8.75C3.24219 7.50736 4.24955 6.5 5.49219 6.5H7.15183C6.89658 6.05874 6.75049 5.54643 6.75049 5ZM14.2505 6.5C15.0789 6.5 15.7505 5.82843 15.7505 5C15.7505 4.17157 15.0789 3.5 14.2505 3.5C13.4221 3.5 12.7505 4.17157 12.7505 5V6.5H14.2505ZM11.2505 6.5V5C11.2505 4.17157 10.5789 3.5 9.75049 3.5C8.92206 3.5 8.25049 4.17157 8.25049 5C8.25049 5.82843 8.92206 6.5 9.75049 6.5H11.2505Z"
      fill="currentColor"
    />
    <path
      d="M3.24219 11.75V19C3.24219 20.2426 4.24955 21.25 5.49219 21.25H11.2505V11.75H3.24219Z"
      fill="currentColor"
    />
    <path
      d="M12.7505 21.25H18.5088C19.7514 21.25 20.7588 20.2426 20.7588 19V11.75H12.7505V21.25Z"
      fill="currentColor"
    />
  </svg>
);

const AiSidebar4 = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Data
  const chats: ChatItem[] = [
    { title: 'The Future of AI and Its Impact on Society' },
    { title: 'How Remote Work is Changing the Global Workforce' },
    { title: 'Sustainable Fashion: Trends and Innovations' },
    { title: 'The Importance of Mental Health Awareness in the Workplace' },
    { title: 'Write a email to your friend' },
    { title: 'E-commerce and Its Effects on Traditional Retail' },
    { title: 'The Role of Digital Marketing' },
  ];

  const menuItems: MenuItem[] = [
    {
      icon: <Globe2 className="size-5" />,
      label: 'Explore',
      href: '#',
    },
    {
      icon: <Book4 className="size-5" />,
      label: 'Blog',
      href: '#',
    },
    {
      icon: <UserMultiple4 className="size-5" />,
      label: 'Affiliate',
      href: '#',
    },
    {
      icon: <Bell1 className="size-5" />,
      label: 'Notification',
      href: '#',
    },
  ];

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  // Chat list item component
  const ChatListItem = ({ title }: { title: string }) => (
    <li>
      <div className="group hover:bg-background-soft-200 relative flex items-center justify-between rounded-lg">
        <a
          href="javascript:void(0)"
          className="text-text-100 relative flex h-9 w-full items-center overflow-hidden rounded-lg p-3 pr-10 text-sm"
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
    <div>
      <div className="flex min-h-screen">
        <aside
          className={`bg-background-50 flex h-full flex-col justify-between p-5 transition-all duration-300 ${
            isExpanded ? 'w-75' : 'w-20'
          }`}
        >
          {/* Header */}
          <div>
            <div
              className={`mb-8 flex items-center ${
                isExpanded ? 'justify-between' : 'flex-col justify-center gap-6'
              }`}
            >
              <a href="javascript:void(0)">
                {isExpanded ? (
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                    alt="Logo"
                  />
                ) : (
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/logo/taigrids-logo-icon.svg"
                    alt="Logo"
                    className="mx-auto flex justify-center"
                  />
                )}
              </a>
              <button
                onClick={toggleSidebar}
                className="text-text-100 cursor-pointer"
              >
                <Layout22 className="size-5" />
              </button>
            </div>

            {isExpanded ? (
              <div className="mb-6 space-y-3">
                {/* New Chat Button */}
                <button className="hover:bg-background-soft-100 text-text-50 border-base-50 flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border bg-transparent px-3 py-2.5 text-sm font-medium">
                  <Plus className="size-5" />
                  Start new chat
                </button>

                {/* Search */}
                <div className="relative">
                  <span className="text-text-100 pointer-events-none absolute top-1/2 left-3 z-10 shrink-0 -translate-y-1/2">
                    <Search1 className="size-5" />
                  </span>
                  <Input
                    type="text"
                    className="placeholder:text-text-50 border-base-50 h-11 w-full rounded-lg bg-transparent pl-11 text-sm placeholder:text-sm"
                    placeholder="Search chat"
                  />
                </div>
              </div>
            ) : (
              <div className="mb-6 flex flex-col items-center gap-2">
                <button className="hover:bg-background-soft-100 text-text-50 border-base-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border">
                  <Plus className="size-5" />
                </button>
                <button className="hover:bg-background-soft-100 text-text-100 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg">
                  <Search1 className="size-5" />
                </button>
              </div>
            )}
          </div>

          {/* Chat List */}
          <div className="flex-1">
            <div
              className={`h-[350px] space-y-8 overflow-y-auto ${!isExpanded ? 'flex flex-col items-center' : ''}`}
            >
              {isExpanded ? (
                <div>
                  <h4 className="text-text-100 mb-4 pl-3 text-sm">Chats</h4>
                  <ul className="space-y-1">
                    {chats.map((chat, index) => (
                      <ChatListItem key={index} title={chat.title} />
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  {chats.slice(0, 4).map((chat, index) => (
                    <a
                      key={index}
                      href="javascript:void(0)"
                      className="hover:bg-background-soft-200 text-text-100 flex h-10 w-10 items-center justify-center rounded-lg text-xs font-medium"
                      title={chat.title}
                    >
                      {chat.title.charAt(0)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom */}
          <div
            className={`space-y-5 ${!isExpanded ? 'flex flex-col items-center' : ''}`}
          >
            {isExpanded ? (
              <div>
                <span className="text-text-100 mb-3 block pl-3 text-sm">
                  Menus
                </span>
                <ul>
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <a
                        href={item.href}
                        className="hover:bg-background-soft-100 text-text-100 flex cursor-pointer items-center gap-3 rounded-lg bg-transparent px-3 py-2 text-sm"
                      >
                        {item.icon}
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                {menuItems.map((item, index) => (
                  <a
                    key={index}
                    href={item.href}
                    className="hover:bg-background-soft-100 text-text-100 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg"
                    title={item.label}
                  >
                    {item.icon}
                  </a>
                ))}
              </div>
            )}

            {/* Invite Friend Card */}
            {isExpanded ? (
              <div className="bg-background-soft-100 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-4">
                  <div className="bg-background-50 text-text-50 inline-flex h-12 w-12 items-center justify-center rounded-xl">
                    <GiftIcon />
                  </div>
                  <div>
                    <h3 className="text-text-50 text-sm font-medium">
                      Invite Friend
                    </h3>
                    <p className="text-text-100 text-xs">Get 500 credit each</p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="bg-background-soft-100 text-text-50 hover:bg-background-soft-200 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl"
                title="Invite Friend - Get 500 credit each"
              >
                <GiftIcon />
              </div>
            )}
          </div>
        </aside>

        <div className="bg-background-soft-100 h-auto flex-1 p-5">
          <div className="">Hello</div>
        </div>
      </div>
    </div>
  );
};

export default AiSidebar4;
