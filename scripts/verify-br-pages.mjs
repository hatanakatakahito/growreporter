#!/usr/bin/env node
/**
 * Browser Rendering の BR コール直接検証スクリプト
 *
 * 用途: Cloud Function を経由せず、worker (CF Workers) を直接叩いて
 *       grow-group.jp 等の各ページが BR で正常に取得できるか検証する。
 *       Plan A (evaluateOnNewDocument による <script> 事前除去) の実効性を
 *       複数 URL で並列に測定する。
 *
 * 使い方:
 *   node scripts/verify-br-pages.mjs                # デフォルト URL set
 *   node scripts/verify-br-pages.mjs URL1 URL2 ...  # 任意 URL を指定
 *
 * 前提:
 *   - gcloud auth login 済 (hatanaka@grow-group.jp)
 *   - gcloud project = growgroupreporter
 *   - CF_PROXY_SECRET が Secret Manager に存在
 *
 * 出力例:
 *   [01/05] grow-group.jp/recruit/                  ok   18.4s  blocked=2 stripped=1 happi.net
 *   [02/05] grow-group.jp/                          ok   22.1s  blocked=2 stripped=1 happi.net
 *   ...
 *   summary: 5/5 success, total 102s, avg 20.4s
 */
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const WORKER_URL = 'https://growreporter-fetch-proxy.hatanaka-a1e.workers.dev';
const TIMEOUT_MS = 130_000;

// CF_PROXY_SECRET を gcloud secrets から取得
// Windows では gcloud.cmd を呼ぶ必要があるため、shell オプションを有効化
function getProxySecret() {
  const r = spawnSync(
    'gcloud secrets versions access latest --secret=CF_PROXY_SECRET --project=growgroupreporter',
    { encoding: 'utf8', shell: true },
  );
  if (r.status !== 0) {
    console.error('Failed to read CF_PROXY_SECRET:', r.stderr || r.error?.message || '(unknown)');
    process.exit(1);
  }
  return r.stdout.trim();
}

const DEFAULT_URLS = [
  'https://grow-group.jp/',
  'https://grow-group.jp/recruit/',
  'https://grow-group.jp/works/',
  'https://grow-group.jp/company/profile/',
  'https://grow-group.jp/archives/2191/',
  'https://grow-group.jp/archives/2502/',
  'https://grow-group.jp/recruit/entry/',
];

async function callWorker(url, secret) {
  const start = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Secret': secret,
      },
      body: JSON.stringify({ url, mode: 'render', viewport: 'pc' }),
      signal: ac.signal,
    });
    const dur = Date.now() - start;
    if (!res.ok) return { url, ok: false, error: `HTTP ${res.status}`, dur };
    const data = await res.json();
    if (data.error) return { url, ok: false, error: data.error, dur };
    return {
      url,
      ok: !!data.html && data.html.length > 0,
      htmlBytes: data.html?.length || 0,
      finalUrl: data.finalUrl,
      dur,
    };
  } catch (err) {
    return { url, ok: false, error: err.name === 'AbortError' ? 'timeout' : err.message, dur: Date.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const urls = args.length > 0 ? args : DEFAULT_URLS;
  const concurrent = process.env.CONCURRENT === '1';

  console.log(`Targets: ${urls.length} URL(s)`);
  console.log(`Worker: ${WORKER_URL}`);
  console.log(`Mode: ${concurrent ? 'concurrent' : 'sequential (recommended for CF Workers Free quota)'}`);
  console.log('');

  const secret = getProxySecret();
  const results = [];

  if (concurrent) {
    const promises = urls.map((u) => callWorker(u, secret));
    const all = await Promise.all(promises);
    results.push(...all);
  } else {
    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      process.stdout.write(`[${String(i + 1).padStart(2, '0')}/${urls.length}] ${u} ... `);
      const r = await callWorker(u, secret);
      results.push(r);
      if (r.ok) {
        console.log(`ok  ${(r.dur / 1000).toFixed(1)}s  bytes=${r.htmlBytes}`);
      } else {
        console.log(`FAIL ${(r.dur / 1000).toFixed(1)}s  ${r.error}`);
      }
    }
  }

  console.log('');
  const success = results.filter((r) => r.ok).length;
  const totalDur = results.reduce((s, r) => s + r.dur, 0);
  console.log(`Summary: ${success}/${results.length} success, total ${(totalDur / 1000).toFixed(1)}s, avg ${(totalDur / results.length / 1000).toFixed(1)}s`);

  if (success < results.length) {
    console.log('\nFailures:');
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  ${r.url}\n    error: ${r.error}\n    duration: ${(r.dur / 1000).toFixed(1)}s`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
