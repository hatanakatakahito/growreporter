// snapshot HTML から c-main-visual-recruit 関連の CSS ルールを抽出
import admin from 'firebase-admin';

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('Usage: node scripts/debug-keyvisual-css.js <storagePath>');
  process.exit(1);
}

admin.initializeApp({
  projectId: 'growgroupreporter',
  storageBucket: 'growgroupreporter.firebasestorage.app',
});

const bucket = admin.storage().bucket();
const [buf] = await bucket.file(sourcePath).download();
const html = buf.toString('utf-8');

// すべての <style> タグの中身を結合
const styles = [];
const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
let m;
while ((m = styleRe.exec(html)) !== null) {
  styles.push(m[1]);
}
const allCss = styles.join('\n\n');
console.log(`<style> タグ数: ${styles.length}`);
console.log(`合計 CSS サイズ: ${allCss.length} bytes\n`);

// キービジュアル関連クラスのルール抽出
const keywords = [
  'c-main-visual-recruit',
  'l-main',
  'c-main-visual',
  'lazyload',
  'lazyloaded',
];

for (const kw of keywords) {
  console.log(`\n${'='.repeat(70)}\n=== ${kw} に関する CSS ルール ===\n${'='.repeat(70)}`);
  // クラスセレクタとして登場する箇所を探す（簡易: { を見つけるまで）
  const ruleRe = new RegExp(`(?:^|[\\s,>+~])(?:\\.[\\w-]*)?\\.${kw.replace(/-/g, '\\-')}[\\w-]*[^{]*\\{[^}]*\\}`, 'gm');
  const found = allCss.match(ruleRe) || [];
  if (found.length === 0) {
    console.log('  (該当ルールなし)');
  } else {
    console.log(`  該当ルール: ${found.length} 件`);
    found.slice(0, 30).forEach((rule, i) => {
      const compact = rule.replace(/\s+/g, ' ').trim();
      if (compact.length < 400) {
        console.log(`  [${i}] ${compact}`);
      } else {
        console.log(`  [${i}] ${compact.substring(0, 400)}...`);
      }
    });
  }
}

// body 直下の構造（最初の3レベル）を構造で確認
console.log(`\n${'='.repeat(70)}\n=== c-main-visual-recruit の HTML 構造 (前後 2000 文字) ===\n${'='.repeat(70)}`);
const idx = html.indexOf('c-main-visual-recruit');
if (idx >= 0) {
  // 1000 bytes 前から開始（タグ境界含む）
  const start = Math.max(0, idx - 200);
  console.log(html.substring(start, start + 2500));
}
