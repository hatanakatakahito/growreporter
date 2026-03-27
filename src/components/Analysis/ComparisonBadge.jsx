import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatChangePercent } from '../../utils/comparisonHelpers';

/**
 * 増減率バッジコンポーネント
 * 正=緑、負=赤、0=灰色
 */
export default function ComparisonBadge({ value, invertColor = false }) {
  if (value == null) return <span className="text-[11px] text-gray-300">—</span>;

  const isPositive = value > 0;
  const isNegative = value < 0;

  // invertColor: 直帰率など「下がると良い」指標で色を反転
  const goodDirection = invertColor ? isNegative : isPositive;
  const badDirection = invertColor ? isPositive : isNegative;

  let colorClass = 'text-gray-400 bg-gray-50';
  if (goodDirection) colorClass = 'text-green-700 bg-green-50';
  if (badDirection) colorClass = 'text-red-600 bg-red-50';

  const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;

  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${colorClass}`}>
      <Icon className="h-3 w-3" />{formatChangePercent(value)}
    </span>
  );
}
