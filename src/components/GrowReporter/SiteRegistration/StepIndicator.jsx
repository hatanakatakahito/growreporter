import React from 'react';

export default function StepIndicator({ currentStep, onStepClick }) {
  const steps = [
    { number: 1, title: 'サイト情報', subtitle: '', required: true },
    { number: 2, title: 'GA4連携', subtitle: '', required: true },
    { number: 3, title: 'Search Console連携', subtitle: '', required: true },
    { number: 4, title: 'コンバージョン設定', subtitle: '（任意）', required: false },
    { number: 5, title: 'KPI', subtitle: '（任意）', required: false },
  ];

  return (
    <div className="w-full">
      <div className="flex items-stretch">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            {/* ステップボックス（矢印型） */}
            <div className="relative flex-1">
              <button
                onClick={() => onStepClick && step.number <= currentStep && onStepClick(step.number)}
                disabled={step.number > currentStep}
                className={`
                  relative h-16 w-full text-center transition-all
                  ${
                    step.number === currentStep
                      ? 'bg-primary text-white z-10'
                      : step.number < currentStep
                      ? 'bg-gray-300 text-dark hover:bg-gray-400 cursor-pointer'
                      : 'bg-gray-200 text-body-color cursor-not-allowed'
                  }
                  ${index === 0 ? 'rounded-l-lg' : ''}
                  ${index === steps.length - 1 ? 'rounded-r-lg' : ''}
                `}
                style={{
                  clipPath: index === steps.length - 1 
                    ? 'none' 
                    : 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)',
                  marginRight: index === steps.length - 1 ? '0' : '-20px',
                }}
              >
                <div className="flex flex-col items-center justify-center h-full px-4">
                  <p className="text-xs font-medium">
                    STEP{step.number}
                  </p>
                  <p className="text-sm font-bold">
                    {step.title}
                  </p>
                  {step.subtitle && (
                    <p className="text-xs opacity-80">
                      {step.subtitle}
                    </p>
                  )}
                </div>
              </button>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
