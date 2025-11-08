import React from 'react';
import { Info } from 'lucide-react';
import { BUSINESS_TYPES } from '../../../constants/siteOptions';
import Tooltip from '../../common/Tooltip';

/**
 * ビジネス形態選択コンポーネント
 * ラジオボタン + ツールチップで説明を表示
 */
export default function BusinessTypeSelector({ value, onChange, error }) {
  return (
    <div>
      <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
        ビジネス形態
        <span className="ml-1 text-red-500">*</span>
      </label>
      
      <div className="space-y-3">
        {BUSINESS_TYPES.map((type) => (
          <label
            key={type.value}
            className={`flex items-center justify-between rounded-md border px-4 py-3 cursor-pointer transition ${
              value === type.value
                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                : 'border-stroke dark:border-dark-3 hover:border-primary/50 dark:hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <input
                type="radio"
                name="businessType"
                value={type.value}
                checked={value === type.value}
                onChange={(e) => onChange(e.target.value)}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-dark dark:text-white">
                {type.label}
              </span>
            </div>
            
            {/* ツールチップアイコン */}
            <div onClick={(e) => e.preventDefault()}>
              <Tooltip content={type.description}>
                <Info className="h-4 w-4 text-body-color hover:text-primary transition cursor-help" />
              </Tooltip>
            </div>
          </label>
        ))}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

