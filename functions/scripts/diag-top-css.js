// grow-group.jp/ TOP の snapshot を取得して、なぜ PSI desktop で空白になるかを CSS / HTML 視点で診断
import admin from 'firebase-admin';

const url = process.argv[2] || 'https://grow-group.jp/';

admin.initializeApp({
  projectId: 'growgroupreporter',
  storageBucket: 'growgroupreporter.firebasestorage.app',
});

const { captureFullSnapshot, readSnapshotHtml } = await import('../src/utils/captureFullSnapshot.js');
const snap = await captureFullSnapshot({ siteId: 'CZYomSqeTRAnIWgD8Km4', pageUrl: url });
if (!snap) {
  console.error('snapshot 取得失敗');
  process.exit(1);
}
console.log(`snapshot path: ${snap.storagePath} (${snap.byteLen} bytes)`);

// raw HTML を取得（enhance 前で生のまま分析）
const bucket = admin.storage().bucket();
const [buf] = await bucket.file(snap.storagePath).download();
const html = buf.toString('utf-8');

console.log(`\n=== visibility:hidden / opacity:0 / display:none を含む CSS ルールを抽出 ===`);
const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
const allCss = [];
let m;
while ((m = styleRe.exec(html)) !== null) allCss.push(m[1]);
const css = allCss.join('\n');
console.log(`<style> 数: ${allCss.length} / CSS 計 ${css.length} bytes\n`);

const visKeys = [
  { label: 'visibility:hidden',  re: /[^,{}]+\{[^}]*visibility\s*:\s*hidden[^}]*\}/gi },
  { label: 'opacity:0',          re: /[^,{}]+\{[^}]*opacity\s*:\s*0(?![.0-9])[^}]*\}/gi },
  { label: 'display:none',       re: /[^,{}]+\{[^}]*display\s*:\s*none[^}]*\}/gi },
  { label: 'transform:translate(0,100%)', re: /[^,{}]+\{[^}]*transform\s*:\s*translate[^}]*100%[^}]*\}/gi },
];
for (const v of visKeys) {
  const matches = css.match(v.re) || [];
  console.log(`[${v.label}] ${matches.length} ルール`);
  matches.slice(0, 8).forEach((rule, i) => {
    const compact = rule.replace(/\s+/g, ' ').trim().substring(0, 220);
    console.log(`  [${i}] ${compact}`);
  });
}

console.log(`\n=== body 直下の構造（インデント深さ簡易表示） ===`);
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (bodyMatch) {
  const body = bodyMatch[1];
  // トップレベル要素のクラス名を列挙
  const tagRe = /<(?:div|main|section|header|footer|nav|article|aside)\s+(?:[^>]*\bclass=["']([^"']+)["'])/gi;
  const seen = new Set();
  while ((m = tagRe.exec(body)) !== null) {
    const cls = m[1];
    if (!seen.has(cls) && seen.size < 30) {
      seen.add(cls);
    }
  }
  for (const c of seen) console.log(`  .${c}`);
}

console.log(`\n=== 画像リソース集計 ===`);
const imgs = html.match(/<img[^>]+>/gi) || [];
console.log(`<img> 計 ${imgs.length} 個`);
const lazyloadImgs = imgs.filter(t => /lazyload/.test(t)).length;
const dataSrcImgs = imgs.filter(t => /data-src=/.test(t)).length;
const realSrcImgs = imgs.filter(t => /\bsrc=["'](?!data:)/i.test(t)).length;
console.log(`  lazyload クラス付与: ${lazyloadImgs}`);
console.log(`  data-src 付与: ${dataSrcImgs}`);
console.log(`  実 src（http/https） 付与: ${realSrcImgs}`);

console.log(`\n=== body 直下の最初のヒーロー候補 ===`);
const heroRe = /<(?:div|section)[^>]*\b(class|id)=["'][^"']*(mainvisual|main-visual|main_visual|kv-|hero|firstview|first-view)[^"']*["'][^>]*>/i;
const heroMatch = html.match(heroRe);
if (heroMatch) {
  console.log(heroMatch[0].substring(0, 400));
}
