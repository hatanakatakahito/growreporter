import React, { useState, useEffect, useRef } from 'react';
import Prism from 'prismjs';

// Import Prism.js theme and plugins
import 'prismjs/themes/prism.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';

// Import languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';

// Import line numbers plugin
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import {
  Copy4,
  MenuKebab1,
  Paperclip2,
  Pencil1,
  RefreshCircle1Clockwise,
  ShareNodes,
  ThumbsDown2,
  ThumbsUp2,
  Trash1,
  Check,
  Globe2,
  ArrowUpward,
  Microphone1,
} from '@tailgrids/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';

const CodeGenerator2: React.FC = () => {
  const [message, setMessage] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const codeBlocksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Prism.js when component mounts
    const initializePrism = () => {
      // Use Prism.highlightAll to highlight all code blocks on the page
      Prism.highlightAll();
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initializePrism, 200);

    return () => clearTimeout(timer);
  }, []);

  // Re-run Prism highlighting when the component updates
  useEffect(() => {
    const highlightCode = () => {
      // Small delay to ensure DOM updates are complete
      setTimeout(() => {
        Prism.highlightAll();
      }, 100);
    };

    highlightCode();
  });

  // Also highlight when message changes (in case new code is added)
  useEffect(() => {
    const highlightCode = () => {
      // Small delay to ensure DOM updates are complete
      setTimeout(() => {
        Prism.highlightAll();
      }, 100);
    };

    highlightCode();
  }, [message]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      console.log('Code copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // alert('Failed to copy to clipboard');
    }
  };

  return (
    <div ref={codeBlocksRef} className="bg-background-50 flex flex-col">
      {/* Chat Container */}
      <div className="mx-auto w-full max-w-[830px] flex-1 overflow-y-auto pb-15">
        {/* Chat Messages */}
        <div className="h-full space-y-6 p-4 pb-48">
          {/* User Message */}
          <div className="flex justify-end">
            <div>
              <div className="text-title-50 bg-background-soft-100 max-w-xs rounded-3xl rounded-tr-md px-5 py-4 sm:max-w-lg">
                <p className="text-base">
                  Can you generate a responsive navbar using Tailwind CSS?
                </p>
              </div>
              <div className="mt-2.5 flex justify-end gap-1.5">
                <button
                  onClick={() =>
                    handleCopy(
                      'user-msg',
                      'Can you generate a responsive navbar using Tailwind CSS?',
                    )
                  }
                  className="group hover:bg-background-soft-100 text-text-50 border-base-50 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  {copiedId === 'user-msg' ? (
                    <Check className="text-success-500 size-4.5" />
                  ) : (
                    <Copy4 className="size-4.5" />
                  )}
                  {copiedId === 'user-msg' ? 'Copied' : 'Copy'}
                </button>
                <button className="group hover:bg-background-soft-100 text-text-50 border-base-50 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors">
                  <Pencil1 className="size-4.5" />
                  Edit
                </button>
              </div>
            </div>
          </div>

          {/* AI Response 1 */}
          <div className="flex flex-col space-y-4">
            {/* AI Header */}
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <g clipPath="url(#clip0_11928_2513)">
                  <path
                    d="M16 8.016C13.9242 8.14339 11.9666 9.02545 10.496 10.496C9.02545 11.9666 8.14339 13.9242 8.016 16H7.984C7.85682 13.9241 6.97483 11.9664 5.5042 10.4958C4.03358 9.02518 2.07588 8.14318 0 8.016L0 7.984C2.07588 7.85682 4.03358 6.97483 5.5042 5.5042C6.97483 4.03358 7.85682 2.07588 7.984 0L8.016 0C8.14339 2.07581 9.02545 4.03339 10.496 5.50397C11.9666 6.97455 13.9242 7.85661 16 7.984V8.016Z"
                    fill="url(#paint0_radial_11928_2513)"
                  />
                </g>
                <defs>
                  <radialGradient
                    id="paint0_radial_11928_2513"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(1.588 6.503) rotate(18.6832) scale(17.03 136.421)"
                  >
                    <stop offset="0.067" stopColor="#3758F9" />
                    <stop offset="0.343" stopColor="#5E84FC" />
                    <stop offset="0.672" stopColor="#BECDFF" />
                  </radialGradient>
                  <clipPath id="clip0_11928_2513">
                    <rect width="16" height="16" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <span className="text-text-100 text-sm">TailGrids AI 2.0</span>
            </div>
            {/* AI Message */}
            <div>
              <p className="text-title-50 mb-4 leading-relaxed">
                Here's a simple Tailwind CSS code snippet for a responsive
                navbar with a logo, links, and a hamburger menu for mobile. You
                can easily customize it with your own brand styles.
              </p>
              {/* Code Block */}
              <div className="border-base-50 bg-background-soft-50 mb-4 overflow-hidden rounded-xl border">
                <div className="border-base-50 flex items-center justify-between rounded-t-xl border-b px-4 py-3">
                  <span className="text-title-50 text-sm font-bold">Html</span>
                  <button
                    onClick={(e) => {
                      const codeElement = e.currentTarget
                        .closest('.code-block')
                        ?.querySelector('code');
                      if (codeElement) {
                        const text =
                          codeElement.textContent || codeElement.innerText;
                        handleCopy('code-block-1', text);
                      }
                    }}
                    className="hover:text-text-50 text-text-100 flex cursor-pointer items-center space-x-1 text-sm"
                  >
                    {copiedId === 'code-block-1' ? (
                      <Check className="text-success-500 size-4.5" />
                    ) : (
                      <Copy4 className="size-4.5" />
                    )}
                    <span>
                      {copiedId === 'code-block-1' ? 'Copied' : 'Copy'}
                    </span>
                  </button>
                </div>
                <div className="code-block">
                  <pre className="line-numbers prism-code !my-0 !bg-transparent !py-4 !pr-4 whitespace-pre-wrap!">
                    <code className="language-html text-shadow-none!">
                      {`<nav class="bg-background-50 shadow-md p-4 flex justify-between items-center">
  <div class="text-xl font-bold">BrandName</div>
  <ul class="hidden md:flex space-x-6">
    <li><a href="javascript:void(0)" class="text-text-50 hover:text-blue-600">Home</a></li>
    <li><a href="javascript:void(0)" class="text-text-50 hover:text-blue-600">About</a></li>
    <li><a href="javascript:void(0)" class="text-text-50 hover:text-blue-600">Services</a></li>
    <li><a href="javascript:void(0)" class="text-text-50 hover:text-blue-600">Contact</a></li>
  </ul>
  <button class="md:hidden text-text-50 focus:outline-none"> ☰ </button>
</nav>`}
                    </code>
                  </pre>
                </div>
              </div>
              {/* Code End */}
              <div>
                <p className="text-title-50 text-base">✨ Features:</p>
                <ul className="text-title-50 list-inside list-disc space-y-1 pl-2 text-base">
                  <li>Responsive with desktop and mobile menus.</li>
                  <li>Hamburger icon toggles the mobile menu.</li>
                  <li>Smooth hover effects & modern Tailwind styling.</li>
                  <li>Includes a call-to-action Login button.</li>
                </ul>
                <p className="text-title-50 mt-1 text-base">
                  Do you want me to also add a sticky navbar with scroll shadow
                  effect?
                </p>
              </div>
              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-4">
                <button
                  onClick={() =>
                    handleCopy(
                      'action-copy',
                      "Here's a simple Tailwind CSS code snippet for a responsive navbar with a logo, links, and a hamburger menu for mobile. You can easily customize it with your own brand styles.",
                    )
                  }
                  className="group hover:bg-background-soft-100 text-text-50 border-base-50 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  {copiedId === 'action-copy' ? (
                    <Check className="text-success-500 size-4.5" />
                  ) : (
                    <Copy4 className="size-4.5" />
                  )}
                  {copiedId === 'action-copy' ? 'Copied' : 'Copy'}
                </button>
                <button className="group hover:bg-background-soft-100 text-text-50 border-base-50 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors">
                  <RefreshCircle1Clockwise className="size-4.5" />
                  Re-generate
                </button>
                <div className="divide-base-100 border-base-50 flex divide-x rounded-full border">
                  <button className="hover:bg-background-soft-100 text-text-100 cursor-pointer rounded-l-full px-3 py-1.5 transition-colors">
                    <ThumbsUp2 className="size-4.5" />
                  </button>
                  <button className="hover:bg-background-soft-100 text-text-100 cursor-pointer rounded-r-full px-3 py-1.5 transition-colors">
                    <ThumbsDown2 className="size-4.5" />
                  </button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="hover:bg-background-soft-100 border-base-50 text-text-100 data-pressed:bg-background-soft-100 flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border py-1.5 text-xs font-medium transition-colors outline-none">
                    <MenuKebab1 className="size-4.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    placement="bottom end"
                    className="border-base-50 bg-background-50 relative w-[160px] rounded-xl border p-1.5"
                  >
                    <DropdownMenuItem className="hover:bg-background-soft-100 cursor-pointer rounded-lg text-sm">
                      <ShareNodes className="size-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-error-500 hover:bg-error-50 focus:bg-error-50 cursor-pointer rounded-lg text-sm">
                      <Trash1 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className="bg-background-50 fixed right-0 bottom-0 left-0 p-4 pt-4 pb-12.5">
        <div className="mx-auto max-w-[800px]">
          <div className="bg-background-soft-100 rounded-3xl p-1 shadow-[0_12px_32px_-2px_rgba(16,24,40,0.03)]">
            {/* Chat Input */}
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-background-50 text-title-50 placeholder:text-text-200 block h-30 w-full resize-none rounded-[20px] border-0 px-5 py-4.5 focus:ring-0 sm:leading-6"
                placeholder="Ask me anything..."
              />
              {/* Bottom Controls */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                {/* Left Controls */}
                <div className="flex items-center gap-2">
                  <button className="bg-background-50 hover:bg-background-soft-200 text-text-100 inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors">
                    <Paperclip2 className="size-4.5" />
                    Attach
                  </button>
                  <button className="hover:text-text-50 hover:bg-background-soft-200 text-text-200 inline-flex cursor-pointer items-center gap-2 rounded-full bg-transparent px-3 py-2 text-sm font-medium transition-colors">
                    <Globe2 className="size-4.5" />
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
    </div>
  );
};

export default CodeGenerator2;
