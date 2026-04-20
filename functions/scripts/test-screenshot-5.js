/**
 * dormybiz.com に対して 5ページのスクリーンショットを単発撮影で試すテスト。
 * Cloud Function testScreenshotDiag を呼び出して結果を集計。
 */
import admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';

admin.initializeApp({ projectId: 'growgroupreporter' });

const FUNCTION_URL = 'https://asia-northeast1-growgroupreporter.cloudfunctions.net/testScreenshotDiag';

const URLS = [
  'https://www.dormybiz.com/',
  'https://www.dormybiz.com/service/',
  'https://www.dormybiz.com/contact/',
  'https://www.dormybiz.com/lp/longstay/',
  'https://www.dormybiz.com/faq/',
];

async function main() {
  console.log('🔬 dormybiz.com に対して 5ページの単発スクショを試す\n');

  // Cloud Functions v2 callable は HTTPS で IDトークン認証が必要
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient(FUNCTION_URL);
  const headers = await client.getRequestHeaders();

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: { urls: URLS } }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ Function呼び出し失敗: HTTP ${res.status}`);
    console.error(text);
    process.exit(1);
  }

  const body = await res.json();
  const data = body.result || body;

  console.log(`📊 結果: ${data.successCount}/${data.total} 成功\n`);
  console.log('詳細:');
  for (const r of data.results) {
    const mark = r.success ? '✅' : '❌';
    const status = r.httpStatus ?? '-';
    const size = r.imageBytes ? `${Math.round(r.imageBytes / 1024)}KB` : '-';
    const err = r.error ? ` err: ${r.error}` : '';
    console.log(`  ${mark} HTTP ${String(status).padEnd(4)} ${size.padStart(8)} ${r.elapsedMs}ms  ${r.url}${err}`);
  }

  console.log('\n━'.repeat(40));
  if (data.successCount === data.total) {
    console.log('🎉 全て成功。オンデマンド方式は dormybiz でも機能する見込み。');
  } else if (data.successCount >= data.total * 0.6) {
    console.log(`⚠️ 部分成功（${data.successCount}/${data.total}）。オンデマンドは実用可だが、失敗時は ScreenshotAPI フォールバック推奨。`);
  } else {
    console.log(`❌ ほぼ全滅（${data.successCount}/${data.total}）。dormybiz のような Cloudflare ブロックサイトは ScreenshotAPI 必須。`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
