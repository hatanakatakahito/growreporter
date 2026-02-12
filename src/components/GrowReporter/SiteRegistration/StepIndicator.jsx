import React from 'react';
import { Check } from 'lucide-react';

export default function StepIndicator({ currentStep, onStepClick }) {
  const steps = [
    { number: 1, title: 'サイト情報', subtitle: '', required: true },
    { number: 2, title: 'GA4連携', subtitle: '', required: true },
    { number: 3, title: 'Search Console', subtitle: '（任意）', required: false },
    { number: 4, title: 'コンバージョン', subtitle: '（任意）', required: false },
    { number: 5, title: 'KPI設定', subtitle: '（任意）', required: false },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            {/* ステップ */}
            <div className="flex flex-col items-center flex-1">
              <button
                onClick={() => onStepClick && step.number <= currentStep && onStepClick(step.number)}
                disabled={step.number > currentStep}
                className={`
                  mb-2 flex h-12 w-12 items-center justify-center rounded-full font-semibold transition-all
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
                  <Check className="h-6 w-6" />
                ) : (
                  <span>{step.number}</span>
                )}
              </button>
              <div className="text-center">
                <p className={`text-xs font-medium ${
                  step.number <= currentStep ? 'text-dark dark:text-white' : 'text-gray-400'
                }`}>
                  {step.title}
                </p>
                {step.subtitle && (
                  <p className="text-xs text-gray-400">
                    {step.subtitle}
                  </p>
                )}
              </div>
            </div>
            
            {/* 接続線 */}
            {index < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 mb-8 ${
                step.number < currentStep ? 'bg-primary' : 'bg-gray-200 dark:bg-dark-3'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
