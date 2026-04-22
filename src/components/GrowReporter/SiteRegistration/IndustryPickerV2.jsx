import React from 'react';
import SingleSelectField from './SingleSelectField';
import { INDUSTRY_MAJOR, INDUSTRY_MINOR_BY_MAJOR } from '../../../constants/industriesV2';

/**
 * 業種 V2 ピッカー（大分類 → 小分類の連動2段セレクト）
 *
 * - `industryMajor` が未選択のうちは小分類セレクトを無効化
 * - 大分類を変更した際、現在の小分類が新しい大分類に属さなければリセット
 *
 * @param {Object} props
 * @param {string} props.industryMajor - 現在選択中の大分類 value
 * @param {string} props.industryMinor - 現在選択中の小分類 value
 * @param {function({major: string, minor: string}): void} props.onChange
 *        大分類/小分類のどちらか変更時に、新しい {major, minor} を通知
 * @param {{major?: string, minor?: string}} [props.errors] - エラーメッセージ
 * @param {{major?: string, minor?: string}} [props.hints] - 補足テキスト（推定バッジ等）
 */
export default function IndustryPickerV2({
  industryMajor = '',
  industryMinor = '',
  onChange,
  errors = {},
  hints = {},
}) {
  const minorOptions = industryMajor
    ? (INDUSTRY_MINOR_BY_MAJOR[industryMajor] || []).map((m) => ({ value: m, label: m }))
    : [];

  const handleMajorChange = (nextMajor) => {
    const nextMinors = INDUSTRY_MINOR_BY_MAJOR[nextMajor] || [];
    // 現在の小分類が新しい大分類に含まれないならリセット
    const keepMinor = nextMinors.includes(industryMinor) ? industryMinor : '';
    onChange({ major: nextMajor, minor: keepMinor });
  };

  const handleMinorChange = (nextMinor) => {
    onChange({ major: industryMajor, minor: nextMinor });
  };

  return (
    <div className="space-y-4">
      <SingleSelectField
        label="業種（大分類）"
        required
        options={INDUSTRY_MAJOR}
        value={industryMajor}
        onChange={handleMajorChange}
        error={errors.major}
        placeholder="大分類を選択"
        hint={hints.major}
      />
      <SingleSelectField
        label="業種（小分類）"
        required
        options={minorOptions}
        value={industryMinor}
        onChange={handleMinorChange}
        error={errors.minor}
        placeholder={industryMajor ? '小分類を選択' : '先に大分類を選択してください'}
        disabled={!industryMajor}
        hint={hints.minor}
      />
    </div>
  );
}
