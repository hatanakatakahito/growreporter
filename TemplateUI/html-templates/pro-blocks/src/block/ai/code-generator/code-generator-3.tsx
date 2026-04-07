import { ArrowUpward, ChevronDown, Paperclip2 } from '@tailgrids/icons';
import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/core/dropdown';

const CodeGenerator3: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState('Claude Sonnet 4');

  return (
    <section>
      <div className="bg-background-soft-100 flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto w-full max-w-3xl">
          {/* <!-- Header Section --> */}
          <div className="mx-auto mb-9 max-w-md text-center">
            {/* <!-- Main Heading --> */}
            <h1 className="text-title-50 mb-3 text-3xl leading-9 font-medium">
              Introducing Tailgrids AI
            </h1>
            <p className="text-text-100 text-sm leading-5">
              Tailgrids AI is our smartest and fastest chatbot — built to give
              you accurate, helpful answers every time.
            </p>
          </div>

          {/* <!-- Text Generator Interface --> */}
          <div className="relative z-50 mx-auto max-w-[752px]">
            <div className="bg-background-50 border-base-50 rounded-3xl border p-3 shadow-[0_5px_15px_0_rgba(16,24,40,0.03)]">
              {/* <!-- Chat Input --> */}
              <div className="relative">
                <textarea
                  className="text-title-50 border-base-50 placeholder:text-text-200 block h-22.5 w-full resize-none rounded-2xl border-0 bg-transparent focus:ring-0 sm:text-lg sm:leading-6"
                  placeholder="Ask me anything..."
                ></textarea>

                {/* <!-- Bottom Controls --> */}
                <div className="flex items-center justify-between">
                  {/* <!-- Left Controls --> */}
                  <div className="flex items-center gap-2">
                    <button className="bg-background-soft-100 text-text-50 hover:bg-background-soft-200 inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors">
                      <Paperclip2 className="size-4.5" />
                      Attach
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="underline-none hover:bg-background-soft-100 text-text-50 data-pressed:bg-background-soft-100 inline-flex cursor-pointer items-center gap-2 rounded-full bg-transparent px-3 py-2 text-sm font-medium transition-colors outline-none">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M3.56605 10.4104L6.45202 8.79731L6.50031 8.65672L6.45202 8.57902H6.31088L5.82803 8.54942L4.1789 8.50503L2.74891 8.44583L1.36349 8.37184L1.01435 8.29784L0.6875 7.86867L0.720928 7.65409L1.01435 7.458L1.43407 7.495L2.36263 7.5579L3.75547 7.65409L4.76575 7.71329L6.2626 7.86867H6.50031L6.53374 7.77248L6.45202 7.71329L6.38888 7.65409L4.94775 6.68106L3.38776 5.65254L2.57063 5.06058L2.12863 4.7609L1.90578 4.47972L1.80921 3.86557L2.21034 3.4253L2.74891 3.4623L2.88634 3.49929L3.43233 3.91736L4.59861 4.8164L6.12146 5.93372L6.34431 6.1187L6.43345 6.05581L6.4446 6.01141L6.34431 5.84492L5.51603 4.35393L4.63204 2.83704L4.23833 2.20809L4.13433 1.83072C4.09719 1.67533 4.07119 1.54584 4.07119 1.38675L4.52804 0.768894L4.78061 0.6875L5.38975 0.768894L5.64603 0.990878L6.02488 1.85291L6.63774 3.21072L7.58859 5.05688L7.86716 5.60444L8.01573 6.1113L8.07144 6.26669H8.16801V6.1779L8.24601 5.13827L8.39087 3.86187L8.53201 2.21919L8.58029 1.75672L8.81058 1.20176L9.26743 0.902084L9.624 1.07227L9.91742 1.49034L9.87657 1.76042L9.702 2.88884L9.36029 4.65731L9.13743 5.84122H9.26743L9.416 5.69323L10.0177 4.89779L11.028 3.63988L11.4737 3.14042L11.9937 2.58916L12.328 2.32648H12.9594L13.4237 3.01463L13.2157 3.72498L12.5657 4.54632L12.0271 5.24187L11.2546 6.27779L10.7717 7.10653L10.8163 7.17313L10.9314 7.16203L12.6771 6.79205L13.6205 6.62187L14.746 6.42948L15.2548 6.66626L15.3105 6.90674L15.11 7.39881L13.9065 7.69479L12.4951 7.97597L10.3928 8.47173L10.3668 8.49023L10.3966 8.52723L11.3437 8.61602L11.7486 8.63822H12.7403L14.5862 8.77511L15.0691 9.09328L15.3588 9.48176L15.3105 9.77773L14.5677 10.1551L13.5648 9.91832L11.2248 9.36337L10.4226 9.16358H10.3111V9.23017L10.9797 9.88133L12.2054 10.9838L13.7394 12.4045L13.8174 12.756L13.6205 13.0335L13.4125 13.0039L12.0643 11.9939L11.5443 11.5388L10.3668 10.551H10.2888V10.6546L10.56 11.0504L11.9937 13.1963L12.068 13.8548L11.964 14.0694L11.5926 14.1989L11.184 14.1249L10.3446 12.9521L9.47914 11.6313L8.78086 10.4474L8.69543 10.4955L8.28315 14.9167L8.09001 15.1423L7.6443 15.3125L7.27287 15.0313L7.07602 14.5763L7.27287 13.6772L7.51059 12.5044L7.70373 11.5721L7.8783 10.4141L7.9823 10.0293L7.97487 10.0034L7.88944 10.0145L7.01288 11.2132L5.67946 13.0076L4.62461 14.1323L4.37204 14.2322L3.93376 14.0065L3.97462 13.6033L4.21976 13.2444L5.67946 11.3945L6.55974 10.2476L7.12802 9.58535L7.1243 9.48915H7.09088L3.21319 11.9976L2.52234 12.0864L2.2252 11.8089L2.26234 11.3538L2.40349 11.2058L3.56976 10.4067L3.56605 10.4104Z"
                            fill="#D97757"
                          />
                        </svg>

                        {selectedModel}
                        {/* <!-- Chevron --> */}
                        <ChevronDown className="size-4 transition-transform duration-200 group-data-open:rotate-180" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        placement="top start"
                        className="bg-background-50 border-base-50 w-48 rounded-xl border p-1 shadow-md"
                      >
                        <DropdownMenuItem
                          onAction={() => setSelectedModel('gemini-1.5-pro')}
                          className="hover:bg-background-soft-100 cursor-pointer rounded-lg px-4 py-2"
                        >
                          gemini-1.5-pro
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onAction={() => setSelectedModel('gemini-1.5-flash')}
                          className="hover:bg-background-soft-100 cursor-pointer rounded-lg px-4 py-2"
                        >
                          gemini-1.5-flash
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onAction={() => setSelectedModel('gemini-2.0-flash')}
                          className="hover:bg-background-soft-100 cursor-pointer rounded-lg px-4 py-2"
                        >
                          gemini-2.0-flash
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* <!-- Right Controls --> */}
                  <div className="flex items-center">
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
    </section>
  );
};

export default CodeGenerator3;
