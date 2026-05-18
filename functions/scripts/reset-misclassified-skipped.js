// 誤って mockupSkipped: true にされた改善案を、新ロジックで再判定し、本来はビジュアル改善のものをリセット
import admin from 'firebase-admin';

const NON_VISUAL_KEYWORDS = [
  '読込速度', '読み込み速度', '表示速度', 'ページ速度', 'パフォーマンス',
  'Core Web Vitals', 'LCP', 'FID', 'CLS', 'TTFB', 'INP',
  'alt属性', 'メタディスクリプション', 'meta description',
  'robots.txt', 'sitemap', 'canonical', 'hreflang',
  '構造化データ', 'schema.org', 'JSON-LD',
  'SSL', 'HTTPS', 'セキュリティ',
  'キャッシュ', 'CDN', '圧縮', 'minify', 'gzip',
  'リダイレクト', '301', '302', '404',
  'アクセシビリティ', 'WCAG',
];

function isNonVisualNew(title, description) {
  const raw = `${title || ''} ${description || ''}`;
  const text = raw.replace(/https?:\/\/[^\s）)」』】＞>"']+/gi, '').toLowerCase();
  return NON_VISUAL_KEYWORDS.some(kw => {
    const lower = kw.toLowerCase();
    if (/^[\x20-\x7E]+$/.test(kw)) {
      const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?![a-z0-9])`, 'i');
      return re.test(text);
    }
    return text.includes(lower);
  });
}

const siteId = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!siteId) {
  console.error('Usage: node scripts/reset-misclassified-skipped.js <siteId> [--dry-run]');
  process.exit(1);
}

admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

(async () => {
  const snap = await db.collection(`sites/${siteId}/improvements`)
    .where('mockupSkipped', '==', true)
    .get();

  console.log(`mockupSkipped=true の改善案: ${snap.size} 件\n`);

  let resetCount = 0;
  let kept = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const stillNonVisual = isNonVisualNew(d.title, d.description);
    if (stillNonVisual) {
      console.log(`[${doc.id}] ${d.title.substring(0, 60)} → 維持（本当に非ビジュアル）`);
      kept++;
    } else {
      console.log(`[${doc.id}] ${d.title.substring(0, 60)} → リセット ✓`);
      if (!dryRun) {
        await doc.ref.update({
          mockupSkipped: false,
          mockupSkipReason: admin.firestore.FieldValue.delete(),
          mockupGeneratedAt: admin.firestore.FieldValue.delete(),
        });
      }
      resetCount++;
    }
  }
  console.log(`\nサマリー: リセット ${resetCount} 件 / 維持 ${kept} 件${dryRun ? '（dry-run）' : ''}`);
})();
