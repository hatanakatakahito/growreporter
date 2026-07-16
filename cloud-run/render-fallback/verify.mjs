/**
 * モックアップ HTML をローカルで render して、Improve.jsx の injectMockupOverlay() と同等の
 * marker UI 注入を行い、スクリーンショットを撮って検証する。
 *
 * 確認項目:
 *   - marker UI が正しく描画されているか
 *   - 空 outline が出ていないか (clipping detection 動作)
 *   - badge / outline がレイアウトを壊していないか
 *   - 元ページの構造が維持されているか
 *
 * 出力: .tmp-verify-shots/*.png
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const SHOTS_DIR = 'c:/Users/hatan/GrowReporterFinal/.tmp-verify-shots';
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR);

// src/utils/mockupOverlay.js から CSS と helper script を読み出して inject に使う
const overlayModule = fs.readFileSync('c:/Users/hatan/GrowReporterFinal/src/utils/mockupOverlay.js', 'utf-8');
const cssMatch = overlayModule.match(/const MOCKUP_OVERLAY_CSS = `([\s\S]*?)`;/);
const helperMatch = overlayModule.match(/const MOCKUP_OVERLAY_HELPER = `([\s\S]*?)`;/);
if (!cssMatch || !helperMatch) {
  console.error('Failed to extract CSS or helper from mockupOverlay.js');
  process.exit(1);
}
const MOCKUP_OVERLAY_CSS = cssMatch[1];
const MOCKUP_OVERLAY_HELPER = helperMatch[1];

console.log(`Loaded CSS (${MOCKUP_OVERLAY_CSS.length} chars), helper (${MOCKUP_OVERLAY_HELPER.length} chars)`);

const TARGETS = [
  { id: 'Du9uBgW5FsBavbUfuFc6', desc: 'service' },
  { id: 'wfuHotL4siOGAzhgCWP6', desc: 'recruit-entry' },
  { id: 'Psa8lWvWxsNDRW18oHRK', desc: 'company-profile' },
  { id: 'M47xbFKDjLXIR0Gbcrj1', desc: 'archives-2191' },
  { id: 'Rsl31I4jnnaWlpfiUHkn', desc: 'recruit' },
  { id: 'zxmmCsayhI4WPxsYtcqk', desc: 'archives-2502' },
  { id: 'HHV5qpn88ZxKWySjPj03', desc: 'recruit-entry-2' },
];

async function capture(browser, target) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const filePath = `c:/Users/hatan/GrowReporterFinal/.tmp-after-deploy-${target.id}.html`;
  if (!fs.existsSync(filePath)) {
    console.warn(`SKIP ${target.id}: file not found at ${filePath}`);
    await page.close();
    return null;
  }

  // file:// URL で読込み (network idle までは待たず short timeout)
  const fileUrl = 'file://' + filePath.replace(/\\/g, '/');
  try {
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (err) {
    console.warn(`goto failed for ${target.id}: ${err.message}`);
  }

  // 画像読込みを少し待つ (lazy load 等)
  await new Promise(r => setTimeout(r, 2000));

  // Improve.jsx の injectMockupOverlay() と同等の処理
  await page.evaluate((css, helper) => {
    if (document.getElementById('__mockup-overlay-css')) return;
    if (document.getElementById('__mockup-helper') || document.getElementById('__mockup-overlay-helper')) return;
    const style = document.createElement('style');
    style.id = '__mockup-overlay-css';
    style.textContent = css;
    document.head.appendChild(style);
    const script = document.createElement('script');
    script.id = '__mockup-overlay-helper';
    script.textContent = helper;
    document.body.appendChild(script);
  }, MOCKUP_OVERLAY_CSS, MOCKUP_OVERLAY_HELPER);

  // overlay 描画完了を待つ
  await new Promise(r => setTimeout(r, 3000));

  // overlay 数 / clipping 状況を取得
  const stats = await page.evaluate(() => {
    const dataChanged = document.querySelectorAll('[data-changed]').length;
    const overlays = document.querySelectorAll('.__mockup-overlay').length;
    const badges = document.querySelectorAll('.__mockup-badge').length;
    return { dataChanged, overlays, badges };
  });

  // フルページスクショ
  const outPath = path.join(SHOTS_DIR, `${target.desc}-${target.id.substring(0, 8)}.png`);
  await page.screenshot({ path: outPath, fullPage: true, type: 'png' });

  // viewport 内のスクショ (上から 1500px)
  const viewportPath = path.join(SHOTS_DIR, `${target.desc}-${target.id.substring(0, 8)}-top.png`);
  await page.setViewport({ width: 1400, height: 1500 });
  await page.screenshot({ path: viewportPath, fullPage: false, type: 'png' });

  await page.close();
  return { ...stats, fullPath: outPath, topPath: viewportPath };
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

console.log('\n=== Verification screenshots ===');
for (const target of TARGETS) {
  const r = await capture(browser, target);
  if (r) {
    console.log(`\n${target.desc} (${target.id.substring(0, 8)}):`);
    console.log(`  data-changed in DOM:  ${r.dataChanged}`);
    console.log(`  overlay rendered:     ${r.overlays}  ← clipping で減ってる場合あり`);
    console.log(`  badge rendered:       ${r.badges}  ← num 集約で 1〜N`);
    console.log(`  full screenshot:      ${r.fullPath}`);
    console.log(`  top screenshot:       ${r.topPath}`);
  }
}

await browser.close();
console.log('\nDone.');
