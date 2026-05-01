// 修正された isNonVisual ロジックを実環境のデータで検証
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

function isNonVisualOld(title, description) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  return NON_VISUAL_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

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

admin.initializeApp({ projectId: 'growgroupreporter' });
const db = admin.firestore();

const siteId = 'CZYomSqeTRAnIWgD8Km4';
const improvementIds = ['Gbm1H1LvQXvWuV0Zqfvl', 'DHgNyweb88sRG9q9DMvt', '5eKUReGXYy8SsyViqgOa'];

(async () => {
  console.log('=== 旧→新ロジックの判定変化を検証 ===\n');
  for (const id of improvementIds) {
    const snap = await db.doc(`sites/${siteId}/improvements/${id}`).get();
    if (!snap.exists) continue;
    const d = snap.data();
    const oldResult = isNonVisualOld(d.title, d.description);
    const newResult = isNonVisualNew(d.title, d.description);
    console.log(`[${id}] ${d.title.substring(0, 60)}`);
    console.log(`  旧ロジック: ${oldResult ? 'SKIP（非ビジュアル）❌' : 'OK'}`);
    console.log(`  新ロジック: ${newResult ? 'SKIP（非ビジュアル）❌' : 'OK ✓'}`);
    console.log('');
  }
})();
