import { useState } from 'react';
import {
  ArrowUpward,
  Check,
  ChevronDown,
  Copy4,
  MenuKebab1,
  Paperclip2,
  Pencil1,
  RefreshCircle1Clockwise,
  ShareNodes,
  ThumbsDown2,
  ThumbsUp2,
  Trash1,
} from '@tailgrids/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';

interface Message {
  id: number;
  type: 'user' | 'ai';
  content: string;
}

interface ModelOption {
  id: string;
  name: string;
}

const messages: Message[] = [
  {
    id: 1,
    type: 'user',
    content: 'Give me some random text',
  },
  {
    id: 2,
    type: 'ai',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus et varius tortor. Aenean dui magna, vehicula in lacinia non, euismod sed odio. Aliquam erat volutpat. Integer iaculis eu tellus vel tincidunt.',
  },
  {
    id: 3,
    type: 'user',
    content:
      'A chat AI, or chatAi, is a type of artificial intelligence designed to simulate conversation with human users, especially through natural language processing.',
  },
  {
    id: 4,
    type: 'ai',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus et varius tortor. Aenean dui magna, vehicula in lacinia non, euismod sed odio. Aliquam erat volutpat. Integer iaculis eu tellus vel tincidunt. Sed sed dictum orci, in pretium erat.',
  },
];

const modelOptions: ModelOption[] = [
  { id: 'gemini-1.5-pro', name: 'gemini-1.5-pro' },
  { id: 'gemini-1.5-flash', name: 'gemini-1.5-flash' },
  { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash' },
];

const AiSparkleIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    className={className}
  >
    <g clipPath="url(#clip0_ai_sparkle)">
      <path
        d="M16 8.016C13.9242 8.14339 11.9666 9.02545 10.496 10.496C9.02545 11.9666 8.14339 13.9242 8.016 16H7.984C7.85682 13.9241 6.97483 11.9664 5.5042 10.4958C4.03358 9.02518 2.07588 8.14318 0 8.016L0 7.984C2.07588 7.85682 4.03358 6.97483 5.5042 5.5042C6.97483 4.03358 7.85682 2.07588 7.984 0L8.016 0C8.14339 2.07581 9.02545 4.03339 10.496 5.50397C11.9666 6.97455 13.9242 7.85661 16 7.984V8.016Z"
        fill="url(#paint0_radial_ai_sparkle)"
      />
    </g>
    <defs>
      <radialGradient
        id="paint0_radial_ai_sparkle"
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
      <clipPath id="clip0_ai_sparkle">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const GeminiSparkleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M16 8.016C13.9242 8.14339 11.9666 9.02545 10.496 10.496C9.02545 11.9666 8.14339 13.9242 8.016 16H7.984C7.85682 13.9241 6.97483 11.9664 5.5042 10.4958C4.03358 9.02518 2.07588 8.14318 0 8.016L0 7.984C2.07588 7.85682 4.03358 6.97483 5.5042 5.5042C6.97483 4.03358 7.85682 2.07588 7.984 0L8.016 0C8.14339 2.07581 9.02545 4.03339 10.496 5.50397C11.9666 6.97455 13.9242 7.85661 16 7.984V8.016Z"
      fill="url(#paint0_radial_gemini)"
    />
    <defs>
      <radialGradient
        id="paint0_radial_gemini"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(1.588 6.503) rotate(18.6832) scale(17.03 136.421)"
      >
        <stop offset="0.067" stopColor="#9168C0" />
        <stop offset="0.343" stopColor="#5684D1" />
        <stop offset="0.672" stopColor="#1BA1E3" />
      </radialGradient>
    </defs>
  </svg>
);

const UserMessage = ({
  content,
  onCopy,
  isCopied,
}: {
  content: string;
  onCopy: () => void;
  isCopied: boolean;
}) => (
  <div className="flex justify-end">
    <div>
      <div className="text-title-50 bg-background-50 max-w-xs rounded-3xl rounded-tr-md px-5 py-4 sm:max-w-lg">
        <p className="text-base">{content}</p>
      </div>
      <div className="mt-2.5 flex justify-end gap-1.5">
        <button
          onClick={onCopy}
          className="group bg-background-50 hover:bg-background-soft-100 text-text-50 border-base-50 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
        >
          {isCopied ? (
            <Check className="text-success-500 size-4" />
          ) : (
            <Copy4 className="text-text-100 size-4" />
          )}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
        <button className="group bg-background-50 hover:bg-background-soft-100 text-text-50 border-base-50 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors">
          <Pencil1 className="text-text-100 size-4" />
          Edit
        </button>
      </div>
    </div>
  </div>
);

const AiMessage = ({
  content,
  onCopy,
  isCopied,
}: {
  content: string;
  onCopy: () => void;
  isCopied: boolean;
}) => (
  <div className="flex flex-col space-y-4">
    {/* AI Header */}
    <div className="flex items-center gap-2">
      <AiSparkleIcon />
      <span className="text-text-100 text-sm">TailGrids AI 2.0</span>
    </div>

    {/* AI Message */}
    <div>
      <p className="text-title-50 mb-4 leading-relaxed">{content}</p>
      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 pt-3">
        <button
          onClick={onCopy}
          className="group bg-background-50 hover:bg-background-soft-100 text-text-50 border-base-50 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
        >
          {isCopied ? (
            <Check className="text-success-500 size-4" />
          ) : (
            <Copy4 className="text-text-100 size-4" />
          )}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
        <button className="group bg-background-50 hover:bg-background-soft-100 text-text-50 border-base-50 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors">
          <RefreshCircle1Clockwise className="text-text-100 size-4" />
          Re-generate
        </button>
        <div className="divide-base-100 border-base-50 flex divide-x rounded-full border">
          <button className="bg-background-50 hover:bg-background-soft-100 text-text-100 cursor-pointer rounded-l-full px-3 py-1.5 transition-colors">
            <ThumbsUp2 className="size-4" />
          </button>
          <button className="bg-background-50 hover:bg-background-soft-100 text-text-100 cursor-pointer rounded-r-full px-3 py-1.5 transition-colors">
            <ThumbsDown2 className="size-4" />
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="bg-background-50 hover:bg-background-soft-100 border-base-50 text-text-100 data-pressed:bg-background-soft-100 flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border py-1.5 text-xs font-medium transition-colors outline-none">
            <MenuKebab1 className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            placement="bottom end"
            className="bg-background-50 w-[160px] rounded-xl p-1.5"
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
      </div>
    </div>
  </div>
);

export default function TextGenerator4() {
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
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

  return (
    <div className="bg-background-soft-100 flex flex-col">
      {/* Chat Container */}
      <div className="mx-auto w-full max-w-[780px] flex-1 overflow-y-auto pb-10">
        {/* Chat Messages */}
        <div className="h-full space-y-6 p-4 pb-48">
          {messages.map((message) =>
            message.type === 'user' ? (
              <UserMessage
                key={message.id}
                content={message.content}
                onCopy={() => handleCopy(message.id, message.content)}
                isCopied={copiedId === message.id}
              />
            ) : (
              <AiMessage
                key={message.id}
                content={message.content}
                onCopy={() => handleCopy(message.id, message.content)}
                isCopied={copiedId === message.id}
              />
            ),
          )}
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className="fixed right-0 bottom-0 left-0 p-4 pt-6 pb-12.5">
        <div className="mx-auto max-w-[752px]">
          <div className="bg-background-50 border-base-50 rounded-3xl border p-3 shadow-[0_5px_15px_0_rgba(16,24,40,0.03)]">
            {/* Chat Input */}
            <div className="relative">
              <textarea
                className="text-title-50 border-base-50 placeholder:text-text-200 block h-22.5 w-full resize-none rounded-2xl border-0 bg-transparent focus:ring-0 sm:text-lg sm:leading-6"
                placeholder="Ask me anything..."
              ></textarea>

              {/* Bottom Controls */}
              <div className="flex items-center justify-between">
                {/* Left Controls */}
                <div className="flex items-center gap-2">
                  <button className="bg-background-soft-100 text-text-50 hover:bg-background-soft-200 inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors">
                    <Paperclip2 className="size-5" />
                    Attach
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="underline-none hover:bg-background-soft-100 text-text-50 data-pressed:bg-background-soft-100 inline-flex cursor-pointer items-center gap-2 rounded-full bg-transparent px-3 py-2 text-sm font-medium transition-colors outline-none">
                      <GeminiSparkleIcon />
                      {selectedModel}
                      <ChevronDown className="size-4 transition-transform duration-200 group-data-open:rotate-180" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      placement="top start"
                      className="bg-background-50 border-base-50 w-48 rounded-xl border p-1 shadow-md"
                    >
                      {modelOptions.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onAction={() => setSelectedModel(model.name)}
                          className="hover:bg-background-soft-100 cursor-pointer rounded-lg px-4 py-2"
                        >
                          {model.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
        </div>
      </div>
    </div>
  );
}
