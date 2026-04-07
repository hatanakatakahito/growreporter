import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';
import {
  Folder1,
  FolderPlus,
  FolderPlusCircle,
  Layout22,
  MenuKebab1,
  MenuMeatballs1,
  PenToSquare,
  Search1,
  ShareNodes,
  Trash1,
} from '@tailgrids/icons';
import { useState } from 'react';

// Types
interface WorkspaceItem {
  name: string;
  count: string;
  hasSubmenu?: boolean;
  submenuItems?: string[];
}

interface ChatItem {
  title: string;
}

const AiSidebar2 = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(
    null,
  );

  // Data
  const workspaces: WorkspaceItem[] = [
    { name: 'Pimjo', count: '1' },
    { name: 'Meku', count: '08' },
    { name: 'Formbold', count: '12' },
    { name: 'Tailadmin', count: '5' },
    {
      name: 'Meku',
      count: '',
      hasSubmenu: true,
      submenuItems: [
        'The Future of AI and Its Impact on Society',
        'Sustainable Fashion: Trends and Innovations',
      ],
    },
  ];

  const chats: ChatItem[] = [
    { title: 'The Future of AI and Its Impact on Society' },
    { title: 'How Remote Work is Changing the Global Workforce' },
    { title: 'Sustainable Fashion: Trends and Innovations' },
    { title: 'The Importance of Mental Health Awareness in the Workplace' },
    { title: 'Write a email to your friend' },
    { title: 'E-commerce and Its Effects on Traditional Retail' },
    { title: 'The Role of Digital Marketing' },
  ];

  const toggleWorkspace = (name: string) => {
    setExpandedWorkspace(expandedWorkspace === name ? null : name);
  };

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded) {
      setExpandedWorkspace(null);
    }
  };

  return (
    <div className="flex h-screen">
      <aside
        className={`bg-background-50 flex h-full flex-col justify-between p-5 transition-all duration-300 ${
          isExpanded ? 'w-75' : 'w-20'
        }`}
      >
        {/* Header */}
        <div>
          <div
            className={`mb-8 flex items-center ${
              isExpanded ? 'justify-between' : 'flex-col justify-center gap-4'
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
              <Layout22 />
            </button>
          </div>

          {isExpanded ? (
            <>
              <div className="mb-4 space-y-1">
                <button className="hover:bg-background-soft-100 text-text-50 flex w-full cursor-pointer items-center gap-3 rounded-lg bg-transparent px-3 py-2 text-sm">
                  <PenToSquare />
                  New Chat
                </button>
                <div className="relative">
                  <span className="text-text-100 pointer-events-none absolute top-1/2 left-3 shrink-0 -translate-y-1/2">
                    <Search1 />
                  </span>
                  <input
                    type="text"
                    className="placeholder:text-text-50 w-full border-0 bg-transparent px-3 py-2 pl-11 text-sm placeholder:text-sm focus:ring-0"
                    placeholder="Search chat"
                  />
                </div>
              </div>

              <div className="mb-5 flex items-center justify-between gap-2.5 pl-3">
                <p className="text-text-100 text-sm">Workspaces</p>
                <button className="hover:bg-background-soft-100 border-base-50 text-text-100 cursor-pointer rounded-xl border px-3 py-2">
                  <FolderPlus className="size-[18px]" />
                </button>
              </div>
            </>
          ) : (
            <div className="mb-4 flex flex-col items-center gap-2">
              <button className="hover:bg-background-soft-100 text-text-50 flex cursor-pointer items-center justify-center rounded-lg p-2">
                <PenToSquare />
              </button>
              <button className="hover:bg-background-soft-100 text-text-100 flex cursor-pointer items-center justify-center rounded-lg p-2">
                <Search1 />
              </button>
              <button className="hover:bg-background-soft-100 text-text-100 flex cursor-pointer items-center justify-center rounded-lg p-2">
                <FolderPlusCircle className="size-[18px]" />
              </button>
            </div>
          )}
        </div>

        {/* Workspaces & Chats */}
        <div className="flex-1">
          <div
            className={`h-[480px] space-y-8 overflow-y-auto ${!isExpanded ? 'flex flex-col items-center' : ''}`}
          >
            {/* Workspaces */}
            {isExpanded ? (
              <div>
                <ul className="space-y-1">
                  {workspaces.map((workspace, index) => (
                    <li key={index} className="relative">
                      <div className="group">
                        {workspace.hasSubmenu ? (
                          <>
                            <button
                              onClick={() => toggleWorkspace(workspace.name)}
                              className="hover:bg-background-soft-200 text-text-100 relative flex h-9 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-lg p-3 text-left text-sm"
                            >
                              <Folder1 />
                              {workspace.name}
                              <span className="ml-auto">
                                <MenuMeatballs1 />
                              </span>
                            </button>
                            {expandedWorkspace === workspace.name && (
                              <div className="mt-2 w-full pl-7">
                                <ul className="text-text-50 text-sm">
                                  {workspace.submenuItems?.map(
                                    (item, subIndex) => (
                                      <li key={subIndex}>
                                        <a
                                          href="javascript:void(0)"
                                          className="hover:bg-background-soft-100 relative flex h-9 items-center rounded-lg p-3 text-sm"
                                        >
                                          <span className="line-clamp-1 overflow-hidden pr-6 break-words">
                                            {item}
                                          </span>
                                        </a>
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                          </>
                        ) : (
                          <a
                            href="javascript:void(0)"
                            className="hover:bg-background-soft-200 text-text-100 relative flex h-9 items-center gap-2 overflow-hidden rounded-lg p-3 text-sm"
                          >
                            <Folder1 />
                            {workspace.name}
                            <span className="bg-background-soft-100 text-text-50 ml-auto rounded-2xl px-2 py-0.5 text-xs font-medium">
                              {workspace.count}
                            </span>
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                {workspaces.slice(0, 4).map((workspace, index) => (
                  <a
                    key={index}
                    href="javascript:void(0)"
                    className="hover:bg-background-soft-200 text-text-100 flex h-10 w-10 items-center justify-center rounded-lg"
                    title={workspace.name}
                  >
                    <Folder1 />
                  </a>
                ))}
              </div>
            )}

            {/* Chats */}
            {isExpanded ? (
              <div>
                <h4 className="text-text-100 mb-4 pl-3 text-sm">Chats</h4>
                <ul className="space-y-1">
                  {chats.map((chat, index) => (
                    <li key={index}>
                      <div className="group relative">
                        <a
                          href="javascript:void(0)"
                          className="hover:bg-background-soft-200 text-text-100 relative inline-flex h-9 items-center overflow-hidden rounded-lg p-3 pr-10 text-sm"
                        >
                          <span className="relative z-10 line-clamp-1">
                            {chat.title}
                          </span>
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
                  ))}
                </ul>
              </div>
            ) : (
              <div className="border-base-50 mt-4 flex flex-col items-center gap-1 border-t pt-4">
                {chats.slice(0, 3).map((chat, index) => (
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
          className={`bg-background-50 relative overflow-hidden rounded-xl ${isExpanded ? 'px-4' : 'px-0'} py-3`}
        >
          <div
            className={`relative z-20 flex items-center ${isExpanded ? 'justify-between' : 'justify-center'}`}
          >
            <div
              className={`flex items-center ${isExpanded ? 'gap-3' : 'flex-col gap-2'}`}
            >
              <div className="shrink-0">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-sidebar/avatar.png"
                  className={`size-10 rounded-full`}
                  alt="Avatar"
                />
              </div>
              {isExpanded && (
                <div>
                  <h3 className="text-text-50 line-clamp-1 text-sm font-medium">
                    Adam wathon...
                  </h3>
                  <p className="text-text-100 text-xs">Free</p>
                </div>
              )}
            </div>
            {isExpanded && (
              <button className="bg-background-50 text-text-50 h-7 cursor-pointer rounded-full px-3 py-1 text-xs font-medium">
                Upgrade
              </button>
            )}
          </div>
          {isExpanded && (
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-sidebar/shape.png"
              className="absolute top-0 right-0 z-10 h-full w-full"
              alt=""
            />
          )}
        </div>
      </aside>

      <div className="bg-background-soft-100 h-auto flex-1 p-5">
        <div>Hello</div>
      </div>
    </div>
  );
};

export default AiSidebar2;
