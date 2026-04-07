import React, { useState } from 'react';
import {
  ArrowUpward,
  Check,
  Copy4,
  MenuMeatballs1,
  Microphone1,
  Paperclip2,
  Pencil1,
  RefreshCircle1Clockwise,
  ShareNodes,
  SlidersDoubleHorizontal,
  ThumbsUp2,
  Trash1,
} from '@tailgrids/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';

export default function TextGenerator6() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'user',
      content: 'Give me some random text',
      actions: ['copy', 'edit'],
    },
    {
      id: 2,
      type: 'ai',
      content:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus et varius tortor. Aenean dui magna, vehicula in lacinia non, euismod sed odio. Aliquam erat volutpat. Integer iaculis eu tellus vel tincidunt.',
      actions: ['copy', 'regenerate', 'thumbs_up', 'thumbs_down', 'more'],
    },
    {
      id: 3,
      type: 'user',
      content:
        'A chat AI, or chatAi, is a type of artificial intelligence designed to simulate conversation with human users, especially through natural language processing.',
      actions: ['copy', 'edit'],
    },
    {
      id: 4,
      type: 'ai',
      content:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus et varius tortor. Aenean dui magna, vehicula in lacinia non, euismod sed odio. Aliquam erat volutpat. Integer iaculis eu tellus vel tincidunt. Sed sed dictum orci, in pretium erat.',
      actions: ['copy', 'regenerate', 'thumbs_up', 'thumbs_down', 'more'],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = async (id: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      console.log('Text copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const newMessage = {
        id: messages.length + 1,
        type: 'user',
        content: inputValue,
        actions: ['copy', 'edit'],
      };
      setMessages([...messages, newMessage]);
      setInputValue('');

      // Simulate AI response
      setTimeout(() => {
        const aiResponse = {
          id: messages.length + 2,
          type: 'ai',
          content:
            'This is a simulated AI response. Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
          actions: ['copy', 'regenerate', 'thumbs_up', 'thumbs_down', 'more'],
        };
        setMessages((prev) => [...prev, aiResponse]);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-background-50 flex min-h-screen flex-col">
      {/* Chat Container */}
      <div className="mx-auto w-full max-w-[830px] flex-1 overflow-y-auto pb-16 sm:pb-20">
        {/* Chat Messages */}
        <div className="space-y-6 p-4 pb-48">
          {messages.map((message) => (
            <div key={message.id}>
              {message.type === 'user' ? (
                <div className="flex justify-end">
                  <div>
                    <div className="text-title-50 bg-background-soft-100 max-w-xs rounded-3xl rounded-tr-md px-5 py-4 sm:max-w-lg">
                      <p className="text-base">{message.content}</p>
                    </div>
                    <div className="mt-2.5 flex justify-end gap-1.5">
                      {message.actions.includes('copy') && (
                        <button
                          onClick={() =>
                            handleCopy(message.id, message.content)
                          }
                          className="group hover:bg-background-soft-100 text-text-50 border-base-50 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                        >
                          {copiedId === message.id ? (
                            <Check className="text-success-500 size-[18px]" />
                          ) : (
                            <Copy4 className="text-text-100 size-[18px]" />
                          )}
                        </button>
                      )}
                      {message.actions.includes('edit') && (
                        <button className="group hover:bg-background-soft-100 text-text-50 border-base-50 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors">
                          <Pencil1 className="text-text-100 size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col space-y-4">
                  {/* AI Header */}
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={16}
                      height={16}
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
                          cx={0}
                          cy={0}
                          r={1}
                          gradientUnits="userSpaceOnUse"
                          gradientTransform="translate(1.588 6.503) rotate(18.6832) scale(17.03 136.421)"
                        >
                          <stop offset="0.067" stopColor="#3758F9" />
                          <stop offset="0.343" stopColor="#5E84FC" />
                          <stop offset="0.672" stopColor="#BECDFF" />
                        </radialGradient>
                        <clipPath id="clip0_11928_2513">
                          <rect width={16} height={16} fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                    <span className="text-text-100 text-sm">
                      TailGrids AI 2.0
                    </span>
                  </div>
                  {/* AI Message */}
                  <div>
                    <p className="text-title-50 mb-4 leading-relaxed">
                      {message.content}
                    </p>
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 pt-3">
                      {message.actions.includes('copy') && (
                        <button
                          onClick={() =>
                            handleCopy(message.id, message.content)
                          }
                          className="group hover:bg-background-soft-100 text-text-50 border-base-50 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                        >
                          {copiedId === message.id ? (
                            <Check className="text-success-500 size-[18px]" />
                          ) : (
                            <Copy4 className="text-text-100 size-[18px]" />
                          )}
                        </button>
                      )}
                      {message.actions.includes('regenerate') && (
                        <button className="group hover:bg-background-soft-100 text-text-50 border-base-50 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors">
                          <RefreshCircle1Clockwise className="text-text-100 size-[18px] transition-colors" />
                        </button>
                      )}
                      {(message.actions.includes('thumbs_up') ||
                        message.actions.includes('thumbs_down')) && (
                        <div className="divide-base-100 border-base-50 flex divide-x rounded-full border">
                          {message.actions.includes('thumbs_up') && (
                            <button className="hover:bg-background-soft-100 text-text-100 cursor-pointer rounded-l-full px-3 py-1.5 transition-colors">
                              <ThumbsUp2 className="size-[18px]" />
                            </button>
                          )}
                          {message.actions.includes('thumbs_down') && (
                            <button className="hover:bg-background-soft-100 text-text-100 cursor-pointer rounded-r-full px-3 py-1.5 transition-colors">
                              <ThumbsUp2 className="size-[18px] rotate-180" />
                            </button>
                          )}
                        </div>
                      )}
                      {message.actions.includes('more') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="hover:bg-background-soft-100 border-base-50 text-text-100 data-pressed:bg-background-soft-100 flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border py-1.5 text-xs font-medium transition-colors outline-none">
                            <MenuMeatballs1 className="size-[18px]" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            placement="bottom end"
                            className="bg-background-50 border-base-50 w-[160px] rounded-xl border p-1.5"
                          >
                            <DropdownMenuItem className="hover:bg-background-soft-100 cursor-pointer rounded-md">
                              <ShareNodes className="size-4" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-error-500 hover:bg-error-50 focus:bg-error-50 cursor-pointer rounded-md">
                              <Trash1 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Fixed Input Area */}
      <div className="fixed right-0 bottom-0 left-0 p-4 pt-6 pb-12.5">
        <div className="mx-auto max-w-[800px]">
          <div className="from-primary-400/30 to-primary-300/30 rounded-3xl bg-linear-to-r p-px shadow-[0_20px_32px_0_rgba(17,24,39,0.04)]">
            <div className="bg-background-50 rounded-3xl p-6">
              {/* Chat Input */}
              <textarea
                className="text-title-50 border-base-50 placeholder:text-text-200 block w-full resize-none border-0 bg-transparent p-0 focus:ring-0 sm:text-lg sm:leading-6"
                placeholder="Ask me anything..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
              />
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
                  <button
                    onClick={handleSendMessage}
                    className="hover:bg-foreground-soft-500 text-white-100 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gray-800 transition-colors"
                  >
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
}
