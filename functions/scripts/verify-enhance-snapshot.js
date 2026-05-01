// readSnapshotHtml() の出力に enhanceSnapshotForRender が適用されているか検証
import admin from 'firebase-admin';

const storagePath = process.argv[2] || 'page-snapshots/CZYomSqeTRAnIWgD8Km4/b142fcca9c25f17f.html';

admin.initializeApp({
  projectId: 'growgroupreporter',
  storageBucket: 'growgroupreporter.firebasestorage.app',
});

const { readSnapshotHtml, enhanceSnapshotForRender } = await import('../src/utils/captureFullSnapshot.js');

console.log(`storagePath: ${storagePath}\n`);

const enhanced = await readSnapshotHtml(storagePath);
if (!enhanced) {
  console.error('読み出し失敗');
  process.exit(1);
}

console.log(`整形後サイズ: ${enhanced.length} bytes\n`);

const checks = [
  { name: 'A. lazyload クラス残存',          re: /class\s*=\s*["'][^"']*\blazyload\b/gi, expectZero: true },
  { name: 'A. lazyloaded クラス残存',        re: /class\s*=\s*["'][^"']*\blazyloaded\b/gi, expectZero: true },
  { name: 'B. data:image/svg+xml in style', re: /style\s*=\s*["'][^"']*data:image\/svg/gi, expectZero: true },
  { name: 'C. __snapshot-render-fix style', re: /<style[^>]*id=["']__snapshot-render-fix["']/i, expectZero: false },
  { name: 'C. visibility: visible 強制',    re: /visibility\s*:\s*visible\s*!important/gi, expectZero: false },
  { name: 'C. main-visual 系セレクタ',       re: /\[class\*=["']main-visual["']\]/gi, expectZero: false },
];

console.log('=== 検証結果 ===');
let allPass = true;
for (const c of checks) {
  const matches = enhanced.match(c.re) || [];
  const ok = c.expectZero ? matches.length === 0 : matches.length > 0;
  console.log(`  ${ok ? '✅' : '❌'} ${c.name.padEnd(40)} ${matches.length} 件 (期待: ${c.expectZero ? '0' : '>0'})`);
  if (!ok) allPass = false;
}

// キービジュアル要素の現状確認
console.log('\n=== c-main-visual-recruit__image 要素の style 属性 ===');
const m = enhanced.match(/<div[^>]*c-main-visual-recruit__image[^>]*>/);
if (m) {
  console.log(m[0]);
}

if (allPass) {
  console.log('\n🎉 全項目 OK');
} else {
  console.log('\n⚠️ 一部失敗');
  process.exit(1);
}
