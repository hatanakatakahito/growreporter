import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * vivid Phase 3: 改善ナレッジの業種別ベンチマーク集計
 *
 * `improvementKnowledge` コレクション全件を取得し、
 * `industryMajor × businessModel × siteRole × category` でグループ化して
 * セルごとの集計値（N、avg/median changePercent、avg/median overallScore、
 * achievementLevel 分布）を返す。
 *
 * 管理画面 /admin/improvement-knowledge のマトリクス表示で使用。
 * クライアント側でピボット・フィルタを担うため、サーバはセル単位の集計値だけを返す。
 *
 * セキュリティ: 管理者のみ実行可（adminUsers コレクション参照）。
 *
 * @returns {Object} {
 *   cells: Array<{
 *     industryMajor, businessModel, siteRole, category,
 *     N, avgChangePercent, medianChangePercent,
 *     avgOverallScore, medianOverallScore,
 *     achievementLevels: { exceeded, met, partial, not_met },
 *     improvements: Array<{ summary, primaryMetric, changePercent, overallScore, achievementLevel }>
 *   }>,
 *   totalDocs: number,
 *   computedAt: ISOString
 * }
 *
 * 期待呼び出し頻度: 管理画面表示時のみ。10,000件未満なら全件読取で問題なし。
 * 将来的に件数が増えたら集計キャッシュ層を導入する。
 */
export const getImprovementBenchmarksCallable = async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const db = getFirestore();

  // 管理者権限チェック
  const adminDoc = await db.collection('adminUsers').doc(uid).get();
  if (!adminDoc.exists || !['admin', 'editor', 'viewer'].includes(adminDoc.data()?.role)) {
    throw new HttpsError('permission-denied', '管理者権限がありません');
  }

  // 期間フィルタ（オプション）: createdAt の範囲指定
  // 受信形式: { periodMonths: number } (直近Nヶ月) または { startDate, endDate } (ISO文字列)
  const periodMonths = request.data?.periodMonths;
  const startDateStr = request.data?.startDate;
  const endDateStr = request.data?.endDate;

  let createdAtFrom = null;
  let createdAtTo = null;
  if (typeof periodMonths === 'number' && periodMonths > 0) {
    const now = new Date();
    createdAtFrom = new Date(now);
    createdAtFrom.setMonth(createdAtFrom.getMonth() - periodMonths);
    createdAtTo = now;
  } else if (startDateStr && endDateStr) {
    createdAtFrom = new Date(startDateStr);
    createdAtTo = new Date(endDateStr);
  }

  logger.info('[getImprovementBenchmarks] 開始', { adminId: uid, periodMonths, startDateStr, endDateStr });

  try {
    // クエリ: 期間指定があれば createdAt で絞り込み
    let query = db.collection('improvementKnowledge');
    if (createdAtFrom && createdAtTo) {
      query = query
        .where('createdAt', '>=', Timestamp.fromDate(createdAtFrom))
        .where('createdAt', '<=', Timestamp.fromDate(createdAtTo));
    }
    const snapshot = await query.get();
    logger.info(`[getImprovementBenchmarks] 取得: ${snapshot.size}件`, {
      filtered: !!(createdAtFrom && createdAtTo),
    });

    // セル単位グルーピング
    // key: "industryMajor||businessModel||siteRole||category"
    const buckets = new Map();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const industryMajor = data.industryMajor || 'unknown';
      const businessModel = data.businessModel || 'unknown';
      const siteRole = data.siteRole || 'unknown';
      const category = data.category || 'other';
      const key = [industryMajor, businessModel, siteRole, category].join('||');

      if (!buckets.has(key)) {
        buckets.set(key, {
          industryMajor,
          businessModel,
          siteRole,
          category,
          changePercents: [],
          overallScores: [],
          achievementLevels: { exceeded: 0, met: 0, partial: 0, not_met: 0 },
          improvements: [],
        });
      }

      const bucket = buckets.get(key);
      const m = data.metrics || {};
      if (typeof m.changePercent === 'number') bucket.changePercents.push(m.changePercent);
      if (typeof m.overallScore === 'number') bucket.overallScores.push(m.overallScore);
      const level = m.achievementLevel;
      if (level && bucket.achievementLevels[level] !== undefined) {
        bucket.achievementLevels[level]++;
      }
      bucket.improvements.push({
        id: doc.id,
        summary: data.improvementSummary || '',
        primaryMetric: m.primaryMetric || '',
        changePercent: m.changePercent ?? null,
        overallScore: m.overallScore ?? null,
        achievementLevel: level || null,
      });
    }

    // セルごとに統計値計算
    const cells = [];
    for (const bucket of buckets.values()) {
      const N = bucket.improvements.length;
      const avg = (arr) =>
        arr.length === 0 ? null : arr.reduce((s, v) => s + v, 0) / arr.length;
      const median = (arr) => {
        if (arr.length === 0) return null;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      };

      cells.push({
        industryMajor: bucket.industryMajor,
        businessModel: bucket.businessModel,
        siteRole: bucket.siteRole,
        category: bucket.category,
        N,
        avgChangePercent: avg(bucket.changePercents),
        medianChangePercent: median(bucket.changePercents),
        avgOverallScore: avg(bucket.overallScores),
        medianOverallScore: median(bucket.overallScores),
        achievementLevels: bucket.achievementLevels,
        // 改善 detail は overallScore 降順で詰める
        improvements: bucket.improvements
          .sort((a, b) => (b.overallScore ?? -Infinity) - (a.overallScore ?? -Infinity))
          .slice(0, 50), // 1セル最大50件
      });
    }

    // セルを N 降順でソート（管理画面で「データの濃い順」に表示）
    cells.sort((a, b) => b.N - a.N);

    logger.info('[getImprovementBenchmarks] 集計完了', {
      totalDocs: snapshot.size,
      uniqueCells: cells.length,
    });

    return {
      success: true,
      cells,
      totalDocs: snapshot.size,
      computedAt: new Date().toISOString(),
      filter: {
        periodMonths: periodMonths || null,
        startDate: createdAtFrom?.toISOString() || null,
        endDate: createdAtTo?.toISOString() || null,
      },
    };
  } catch (err) {
    logger.error('[getImprovementBenchmarks] エラー', { error: err.message, stack: err.stack });
    throw new HttpsError('internal', `ベンチマーク取得失敗: ${err.message}`);
  }
};
