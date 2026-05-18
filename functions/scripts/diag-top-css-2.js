// TOP の lazyload / turn-on-visibility / c-main-visual 関連 CSS 詳細分析
import admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'growgroupreporter',
  storageBucket: 'growgroupreporter.firebasestorage.app',
});

const bucket = admin.storage().bucket();
const [buf] = await bucket.file('page-snapshots/CZYomSqeTRAnIWgD8Km4/74a5674a56b03cad.html').download();
const html = buf.toString('utf-8');
const css = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/g) || []).join('');

const keys = ['.c-main-visual', '.c-top-lead', 'turn-on-visibility', '.lazyload', '.l-section'];

for (const kw of keys) {
  console.log(`\n=== ${kw} 関連ルール ===`);
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('([^,{}\\n]{0,200}' + escaped + '[^,{}]{0,200})\\{[^}]{0,500}\\}', 'g');
  const matches = css.match(re) || [];
  console.log(`  ${matches.length} 件`);
  matches.slice(0, 5).forEach((rule, i) => {
    console.log(`  [${i}] ${rule.replace(/\s+/g, ' ').substring(0, 280)}`);
  });
}

console.log(`\n=== c-main-visual の HTML 構造 (前後 1500 文字) ===`);
const idx = html.indexOf('c-main-visual');
if (idx > 0) {
  console.log(html.substring(Math.max(0, idx - 200), idx + 1300));
}

console.log(`\n=== <body> 直下の <main class="l-main"> の中身（先頭 2000 文字） ===`);
const mainMatch = html.match(/<main[^>]*l-main[^>]*>([\s\S]{0,3000})/);
if (mainMatch) {
  console.log(mainMatch[1].replace(/\s+/g, ' '));
}
