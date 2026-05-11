import puppeteer from 'puppeteer';
import fs from 'node:fs';

const overlayModule = fs.readFileSync('c:/Users/hatan/GrowReporterFinal/src/utils/mockupOverlay.js', 'utf-8');
const cssMatch = overlayModule.match(/const MOCKUP_OVERLAY_CSS = `([\s\S]*?)`;/);
const helperMatch = overlayModule.match(/const MOCKUP_OVERLAY_HELPER = `([\s\S]*?)`;/);
const CSS = cssMatch[1];
const HELPER = helperMatch[1];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

const fileUrl = 'file:///c:/Users/hatan/GrowReporterFinal/.tmp-company-4chips.html';
await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
await new Promise(r => setTimeout(r, 2000));

// inject overlay
await page.evaluate((css, helper) => {
  const style = document.createElement('style');
  style.id = '__mockup-overlay-css';
  style.textContent = css;
  document.head.appendChild(style);
  const script = document.createElement('script');
  script.id = '__mockup-overlay-helper';
  script.textContent = helper;
  document.body.appendChild(script);
}, CSS, HELPER);

await new Promise(r => setTimeout(r, 3000));

// Check rect of ALL [data-num="4"] elements
const info = await page.evaluate(() => {
  const els4 = document.querySelectorAll('[data-num="4"]');
  const result = [];
  els4.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    result.push({
      index: i,
      tag: el.tagName,
      label: el.getAttribute('data-changed'),
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      docTop: r.top + window.pageYOffset,
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      parentTag: el.parentElement?.tagName,
      parentClass: el.parentElement?.className,
      textContent: el.textContent.substring(0, 80),
      innerHTML: el.innerHTML.substring(0, 200),
    });
  });
  // Also check if overlays are rendered for these
  const overlays = document.querySelectorAll('.__mockup-overlay');
  const overlay4 = Array.from(overlays).filter(o => o.dataset.num === '4');
  return {
    elements: result,
    overlay4Count: overlay4.length,
    totalOverlays: overlays.length,
    totalBadges: document.querySelectorAll('.__mockup-badge').length,
    badgeNums: Array.from(document.querySelectorAll('.__mockup-badge')).map(b => b.textContent),
  };
});

console.log(JSON.stringify(info, null, 2));

await browser.close();
