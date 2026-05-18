// snapshot HTML に lazyload 修正 (A+B+C) を適用して Storage にアップロード
// 修正後の URL をユーザーに提示してビジュアル確認
import admin from 'firebase-admin';
import * as cheerio from 'cheerio';

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('Usage: node scripts/test-lazyload-fix.js <storagePath>');
  console.error('  例: page-snapshots/CZYomSqeTRAnIWgD8Km4/b142fcca9c25f17f.html');
  process.exit(1);
}

admin.initializeApp({
  projectId: 'growgroupreporter',
  storageBucket: 'growgroupreporter.firebasestorage.app',
});

const bucket = admin.storage().bucket();

console.log(`元 snapshot: ${sourcePath}`);
const [originalBuf] = await bucket.file(sourcePath).download();
const originalHtml = originalBuf.toString('utf-8');
console.log(`サイズ: ${originalHtml.length} bytes\n`);

const $ = cheerio.load(originalHtml, { decodeEntities: false });

// === A. lazyload クラスを除去 ===
let lazyloadCount = 0;
$('.lazyload').each((_, el) => {
  $(el).removeClass('lazyload');
  lazyloadCount++;
});
let lazyloadedCount = 0;
$('.lazyloaded').each((_, el) => {
  $(el).removeClass('lazyloaded');
  lazyloadedCount++;
});
console.log(`A. lazyload クラス除去: ${lazyloadCount} 件`);
console.log(`   lazyloaded クラス除去: ${lazyloadedCount} 件`);

// === B. style 内の data:image/svg... プレースホルダを除去 ===
let svgPlaceholderCount = 0;
$('[style]').each((_, el) => {
  let s = $(el).attr('style') || '';
  if (s.includes('data:image/svg')) {
    const before = s;
    s = s.replace(/background-image\s*:\s*url\(\s*["']?data:image\/svg\+xml[^)]+\)\s*;?/gi, '');
    s = s.replace(/;\s*;/g, ';').replace(/^\s*;|;\s*$/g, '').trim();
    if (s !== before) {
      $(el).attr('style', s);
      svgPlaceholderCount++;
    }
  }
});
console.log(`B. SVG プレースホルダ除去: ${svgPlaceholderCount} 件`);

// === C. 強制 visible CSS を <head> に注入 ===
//   サイト固有 CSS で visibility:hidden / opacity:0 されているキービジュアルを強制表示
//   キービジュアル / メインビジュアル / ヒーロー / ファーストビュー系のクラス名にマッチ
const visibleCss = `
[data-src], [data-srcset], [data-lazy-src], [data-original] { opacity: 1 !important; visibility: visible !important; }
.lazy, .lazyloading { opacity: 1 !important; visibility: visible !important; }
[class*="main-visual"], [class*="mainvisual"], [class*="key-visual"], [class*="keyvisual"],
[class*="kv-"], [class*="-kv"], [class*="hero"], [class*="firstview"], [class*="first-view"],
[class*="mv-"], [class*="-mv"], [id*="main-visual"], [id*="hero"] {
  visibility: visible !important;
  opacity: 1 !important;
}
`;
if ($('head').length > 0) {
  $('head').append(`<style id="__lazyload-fix">${visibleCss}</style>`);
  console.log(`C. 強制 visible CSS を <head> に注入`);
} else {
  $.root().prepend(`<style id="__lazyload-fix">${visibleCss}</style>`);
  console.log(`C. 強制 visible CSS を root に prepend`);
}

// === D. data-src を src にコピー（フォールバック）===
let dataSrcCount = 0;
$('img[data-src]').each((_, el) => {
  const dataSrc = $(el).attr('data-src');
  const currentSrc = $(el).attr('src') || '';
  if (dataSrc && (!currentSrc || /data:image\/svg/.test(currentSrc) || currentSrc === '')) {
    $(el).attr('src', dataSrc);
    dataSrcCount++;
  }
});
console.log(`D. data-src → src コピー: ${dataSrcCount} 件`);

const fixedHtml = $.html();
console.log(`\n修正後サイズ: ${fixedHtml.length} bytes`);

// アップロード
const fixedPath = sourcePath.replace(/\.html$/, '__lazyfix.html');
const fixedFile = bucket.file(fixedPath);
await fixedFile.save(fixedHtml, {
  metadata: {
    contentType: 'text/html; charset=utf-8',
    cacheControl: 'public, max-age=60',
  },
  resumable: false,
});
await fixedFile.makePublic();

const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fixedPath}`;
console.log(`\n✅ アップロード完了:`);
console.log(`  ${publicUrl}`);
console.log(`\nブラウザで開いてキービジュアルが表示されるか確認してください`);
