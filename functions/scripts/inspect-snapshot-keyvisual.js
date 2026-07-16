// snapshot HTML の冒頭セクションを調査して、キービジュアルが何のせいで消えているか特定
import admin from 'firebase-admin';

const storagePath = process.argv[2];
if (!storagePath) {
  console.error('Usage: node scripts/inspect-snapshot-keyvisual.js <storagePath>');
  console.error('  例: page-snapshots/CZYomSqeTRAnIWgD8Km4/b142fcca9c25f17f.html');
  process.exit(1);
}

admin.initializeApp({
  projectId: 'growgroupreporter',
  storageBucket: 'growgroupreporter.firebasestorage.app',
});

const bucket = admin.storage().bucket();
const [buf] = await bucket.file(storagePath).download();
const html = buf.toString('utf-8');

console.log(`HTML サイズ: ${html.length} bytes\n`);

// <body> 直後〜最初の 3 セクションを抽出
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (!bodyMatch) {
  console.error('<body> が見つかりません');
  process.exit(1);
}
const body = bodyMatch[1];

// 最初の 5000 bytes をダンプ
console.log('=== body 先頭 5000 bytes ===');
console.log(body.substring(0, 5000));
console.log('\n=== === ===\n');

// lazy-load 関連属性を全件カウント
const patterns = [
  { name: 'data-src',          re: /\sdata-src=/g },
  { name: 'data-srcset',       re: /\sdata-srcset=/g },
  { name: 'data-lazy',         re: /\sdata-lazy/g },
  { name: 'data-bg',           re: /\sdata-bg=/g },
  { name: 'data-background',   re: /\sdata-background=/g },
  { name: 'loading="lazy"',    re: /loading=["']lazy["']/g },
  { name: 'data-original',     re: /\sdata-original=/g },
  { name: 'background-image',  re: /background-image\s*:/gi },
  { name: '<picture>',         re: /<picture[\s>]/g },
  { name: '<source srcset>',   re: /<source[^>]*srcset=/g },
  { name: '<video',            re: /<video[\s>]/g },
  { name: 'autoplay',          re: /\sautoplay/g },
];
console.log('=== lazy-load 関連属性カウント ===');
for (const p of patterns) {
  const matches = html.match(p.re) || [];
  console.log(`  ${p.name.padEnd(25)} : ${matches.length} 件`);
}

// キービジュアル関連キーワード周辺の HTML を抽出
console.log('\n=== キービジュアル / mainvisual / hero 関連 HTML 抽出 ===');
const heroKeywords = ['mainvisual', 'mv', 'main-visual', 'kv', 'keyvisual', 'key-visual', 'hero', 'firstview', 'first-view'];
for (const kw of heroKeywords) {
  const re = new RegExp(`<[^>]*(?:class|id)=["'][^"']*${kw}[^"']*["'][^>]*>`, 'gi');
  const matches = html.match(re) || [];
  if (matches.length > 0) {
    console.log(`\n  「${kw}」を含む要素: ${matches.length} 件`);
    matches.slice(0, 5).forEach((m, i) => {
      console.log(`    [${i}] ${m.substring(0, 200)}`);
    });
  }
}

// 「成長できる仕事は、楽しい。」が複数箇所にあるかチェック
const phrase = '成長できる仕事は';
const phraseCount = (html.match(new RegExp(phrase, 'g')) || []).length;
console.log(`\n「${phrase}」の出現回数: ${phraseCount}`);
let pos = -1;
for (let i = 0; i < phraseCount; i++) {
  pos = html.indexOf(phrase, pos + 1);
  console.log(`  [${i}] 位置 ${pos} 周辺:`);
  console.log(`    前 200 文字: ...${html.substring(Math.max(0, pos - 200), pos)}`);
  console.log(`    後 200 文字: ${html.substring(pos, pos + 200)}...`);
}
