import React, { useState } from 'react';

const PRESETS = [
  { label: '過去7日間', days: 7 },
  { label: '過去30日間', days: 30 },
  { label: '過去90日間', days: 90 },
];

export default function PeriodSelector({ onPeriodChange, initialDays = 30 }) {
  const [selectedPreset, setSelectedPreset] = useState(initialDays);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const handlePresetClick = (days) => {
    setSelectedPreset(days);
    setIsCustom(false);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    onPeriodChange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onPeriodChange({
        startDate: customStart,
        endDate: customEnd,
      });
    }
  };

  return (
    <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.days}
            onClick={() => handlePresetClick(preset.days)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              !isCustom && selectedPreset === preset.days
                ? 'bg-primary text-white'
                : 'border border-stroke text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => setIsCustom(true)}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            isCustom
              ? 'bg-primary text-white'
              : 'border border-stroke text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3'
          }`}
        >
          カスタム
        </button>
      </div>
      
      {isCustom && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[150px]">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              開始日
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full rounded-md border border-stroke px-4 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              終了日
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full rounded-md border border-stroke px-4 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>
          <button
            onClick={handleCustomApply}
            disabled={!customStart || !customEnd}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            適用
          </button>
        </div>
      )}
    </div>
  );
}



