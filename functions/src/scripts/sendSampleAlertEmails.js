/**
 * アラート通知のサンプルメールを指定アドレスに送信するスクリプト（1回限り実行用）
 * 実行: cd functions && node src/scripts/sendSampleAlertEmails.js
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// functions/.env を読み込み
const envPath = join(__dirname, '..', '..', '.env');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

import { generateAlertEmailTemplate, sendEmail } from '../utils/emailTemplates.js';

const RECIPIENTS = ['hatanaka@grow-group.jp', 'htnktkht69@yahoo.co.jp'];

const APP_URL = process.env.APP_URL || 'https://grow-reporter.com';

async function main() {
  const sampleAlert = {
    message: 'セッション数が前週比 32% 減少しました',
    metricName: 'sessions',
    metricLabel: 'セッション数',
    currentValue: 7200,
    previousValue: 10500,
    changePercent: -31.4,
    periodCurrent: '2025/02/10 〜 2025/02/16',
    periodPrevious: '2025/02/03 〜 2025/02/09',
    hypotheses: [
      { text: 'キャンペーンや広告の終了により流入が減少した可能性があります。', source: 'ai' },
      { text: '季節要因やイベントの有無で前週と比較してアクセスが変動している可能性があります。', source: 'ai' },
      { text: 'サイトの表示不具合や読み込み遅延により離脱が増えている可能性があります。', source: 'ai' },
    ],
  };

  const siteName = 'サンプルサイト（テスト送信）';
  const siteUrl = 'https://grow-reporter.com';
  const dashboardUrl = `${APP_URL}/dashboard`;

  const { subject, html, text } = generateAlertEmailTemplate(
    sampleAlert,
    siteName,
    siteUrl,
    dashboardUrl
  );

  console.log('アラート通知サンプルメールを送信します:', RECIPIENTS);
  console.log('件名:', subject);

  for (const to of RECIPIENTS) {
    try {
      await sendEmail(to, subject, html, text);
      console.log('送信成功:', to);
    } catch (err) {
      console.error('送信失敗:', to, err.message);
    }
  }

  console.log('完了');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
