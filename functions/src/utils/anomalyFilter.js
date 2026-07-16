/**
 * lively-aggregating-bobcat: ベンチマーク集計用 異常値フィルタ
 *
 * 集計前にドメインを除外する判定ロジック。
 * 仕様は lively-aggregating-bobcat.md v1.5「異常値フィルタの詳細」セクション。
 */

/**
 * 単一ドメインの GA4/GSC メトリクスから、ベンチマーク母集団に含めるべきか判定。
 *
 * @param {object} metrics - { sessions, bounceRate, engagementRate, ..., gscImpressions, ... }
 * @returns {{ excluded: boolean, reason?: string }}
 */
export function shouldExclude(metrics) {
  if (!metrics) return { excluded: true, reason: 'metrics_missing' };

  const sessions = Number(metrics.sessions);
  const bounceRate = Number(metrics.bounceRate);
  const engagementRate = Number(metrics.engagementRate);
  const gscImpressions = Number(metrics.gscImpressions ?? metrics.impressions);

  // 1. 直帰率 > 90%（実装不具合・リダイレクト専用ページの可能性）
  if (Number.isFinite(bounceRate) && bounceRate > 0.9) {
    return { excluded: true, reason: 'bounce_too_high' };
  }

  // 2. セッション数 < 100（統計的に意味なし）
  if (Number.isFinite(sessions) && sessions < 100) {
    return { excluded: true, reason: 'sessions_too_low' };
  }

  // 3. engagementRate === 0 && bounceRate === 0（GA4 計測未設定の可能性）
  if (Number.isFinite(engagementRate) && Number.isFinite(bounceRate)
      && engagementRate === 0 && bounceRate === 0) {
    return { excluded: true, reason: 'setup_missing' };
  }

  // 4. GSC impressions < 100/月（GSCを集計対象とする場合のみ）
  // 注: GSC が紐付かないドメインも含めるため、GSCが存在する場合のみチェック
  if (Number.isFinite(gscImpressions) && gscImpressions > 0 && gscImpressions < 100) {
    return { excluded: true, reason: 'gsc_impressions_too_low' };
  }

  return { excluded: false };
}

/**
 * 複数ドメインへのフィルタ適用、除外理由集計付き
 *
 * @param {Array<{domain, metrics}>} rows
 * @returns {{ kept: Array, excluded: Array, breakdown: Object<reason, count> }}
 */
export function applyAnomalyFilter(rows) {
  const kept = [];
  const excluded = [];
  const breakdown = {};

  for (const row of rows) {
    const result = shouldExclude(row.metrics || row);
    if (result.excluded) {
      excluded.push({ ...row, excludeReason: result.reason });
      breakdown[result.reason] = (breakdown[result.reason] || 0) + 1;
    } else {
      kept.push(row);
    }
  }

  return { kept, excluded, breakdown };
}
