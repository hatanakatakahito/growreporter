import React from 'react';
import { Check } from 'lucide-react';

export default function StepIndicator({ currentStep, onStepClick }) {
  const steps = [
    { number: 1, title: 'サイト情報', subtitle: '', required: true },
    { number: 2, title: 'GA4連携', subtitle: '', required: true },
    { number: 3, title: 'Search\nConsole', subtitle: '（任意）', required: false },
    { number: 4, title: 'コンバージョン', subtitle: '（任意）', required: false },
    { number: 5, title: '目標設定', subtitle: '（任意）', required: false },
  ];

  return (
    <div className="w-full">
      {/* アイコン行 + 接続線 */}
      <div className="flex items-center">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-shrink-0 justify-center" style={{ width: 48 }}>
              <button
                onClick={() => onStepClick && step.number <= currentStep && onStepClick(step.number)}
                disabled={step.number > currentStep}
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all
                  ${
                    step.number === currentStep
                      ? 'bg-primary text-white shadow-md scale-110'
                      : step.number < currentStep
                      ? 'bg-primary text-white cursor-pointer hover:scale-105'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-dark-3'
                  }
                `}
              >
                {step.number < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{step.number}</span>
                )}
              </button>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-0.5 flex-1 ${
                step.number < currentStep ? 'bg-primary' : 'bg-gray-200 dark:bg-dark-3'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
      {/* ラベル行 */}
      <div className="mt-2 flex">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-shrink-0 justify-center" style={{ width: 48 }}>
              <div className="text-center" style={{ width: 72 }}>
                <p className={`whitespace-pre-line text-[10px] font-medium leading-tight ${
                  step.number <= currentStep ? 'text-dark dark:text-white' : 'text-gray-400'
                }`}>
                  {step.title}
                </p>
                {step.subtitle && (
                  <p className="text-[10px] leading-tight text-gray-400">{step.subtitle}</p>
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
