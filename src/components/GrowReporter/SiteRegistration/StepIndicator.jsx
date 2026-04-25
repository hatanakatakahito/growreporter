import React from 'react';
import { Check } from 'lucide-react';

/**
 * 上部に表示する水平ステップインジケーター。
 *
 * - currentStep: 現在表示中のステップ
 * - onStepClick: ステップ番号バブルのクリックで呼ばれる
 * - allowAllSteps: true のとき (= 編集モード) 未来ステップのクリックも許可する
 */
export default function StepIndicator({ currentStep, onStepClick, allowAllSteps = false }) {
  const steps = [
    { number: 1, title: 'サイト情報', subtitle: '（必須）', required: true },
    { number: 2, title: 'GA4連携', subtitle: '（必須）', required: true },
    { number: 3, title: 'Search Console', subtitle: '（任意）', required: false },
    { number: 4, title: 'コンバージョン', subtitle: '（任意）', required: false },
    { number: 5, title: '目標設定', subtitle: '（任意）', required: false },
  ];

  const isClickable = (n) => allowAllSteps || n <= currentStep;

  return (
    <div className="w-full">
      {/* アイコン行 + 接続線 */}
      <div className="flex items-center">
        {steps.map((step, index) => {
          const clickable = isClickable(step.number);
          const isActive = step.number === currentStep;
          const isPast = step.number < currentStep;
          return (
            <React.Fragment key={step.number}>
              <div className="flex flex-shrink-0 justify-center" style={{ width: 48 }}>
                <button
                  onClick={() => onStepClick && clickable && onStepClick(step.number)}
                  disabled={!clickable}
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all
                    ${
                      isActive
                        ? 'bg-primary text-white shadow-md scale-110'
                        : isPast
                        ? 'bg-primary text-white cursor-pointer hover:scale-105'
                        : clickable
                        ? 'bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300 dark:bg-dark-3'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-dark-3'
                    }
                  `}
                >
                  {isPast ? <Check className="h-5 w-5" /> : <span>{step.number}</span>}
                </button>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 flex-1 ${
                  step.number < currentStep ? 'bg-primary' : 'bg-gray-200 dark:bg-dark-3'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* ラベル行 */}
      <div className="mt-2 flex">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-shrink-0 justify-center" style={{ width: 48 }}>
              <div className="text-center" style={{ width: 112 }}>
                <p
                  style={{ wordBreak: 'keep-all' }}
                  className={`whitespace-nowrap text-xs font-medium leading-tight ${
                    step.number <= currentStep || allowAllSteps ? 'text-dark dark:text-white' : 'text-gray-400'
                  }`}
                >
                  {step.title}
                </p>
                {step.subtitle && (
                  <p className={`text-[11px] leading-tight ${step.required ? 'text-primary' : 'text-gray-400'}`}>
                    {step.subtitle}
                  </p>
                )}
              </div>
            </div>
            {index < steps.length - 1 && <div className="flex-1" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
