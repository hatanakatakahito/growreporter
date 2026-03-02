import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { format, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getGA4MetricsForSite } from '../utils/ga4ServerHelper.js';
import { generateAlertEmailTemplate } from '../utils/emailTemplates.js';
import { sendEmailDirect } from '../utils/emailSender.js';
import { generateAlertHypotheses } from '../utils/alertHypotheses.js';

const ALERT_THRESHOLD_PERCENT = 40;
const METRIC_KEYS = [
  'sessions',
  'totalUsers',
  'screenPageViews',
  'averagePageviews',
  'engagementRate',
  'totalConversions',
  'conversionRate',
  'bounceRate',
];
const METRIC_LABELS = {
  sessions: '流入数（セッション）',
  totalUsers: 'ユーザー数',
  screenPageViews: '表示回数',
  averagePageviews: '平均PV',
  engagementRate: 'エンゲージメント率',
  totalConversions: 'コンバージョン数',
  conversionRate: 'コンバージョン率',
  bounceRate: '直帰率',
};

/**
 * サイトにアクセス権があり、アラートメールONのユーザー一覧を取得
 * オーナー + accountMembers + users.memberships のメンバーを対象にする
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} siteId
 * @param {Map<string, Array<{userId: string, email: string}>>} [membersByOwner] - オーナーIDごとのメンバー一覧（1回取得して再利用）
 * @returns {Promise<Array<{userId: string, email: string}>>}
 */
async function getAlertRecipientsForSite(db, siteId, membersByOwner = null) {
  const siteDoc = await db.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) return [];
  const siteOwnerId = siteDoc.data().userId;
  const seen = new Set();
  const recipients = [];

  const add = (userId, email) => {
    if (!email || seen.has(userId)) return;
    seen.add(userId);
    recipients.push({ userId, email });
  };

  const ownerDoc = await db.collection('users').doc(siteOwnerId).get();
  if (ownerDoc.exists) {
    const ns = ownerDoc.data().notificationSettings || {};
    if (ns.alertEmail !== false) add(siteOwnerId, ownerDoc.data().email);
  }

  if (membersByOwner && membersByOwner.has(siteOwnerId)) {
    for (const m of membersByOwner.get(siteOwnerId)) add(m.userId, m.email);
  }

  const accountMembersSnap = await db
    .collection('accountMembers')
    .where('accountOwnerId', '==', siteOwnerId)
    .get();
  for (const doc of accountMembersSnap.docs) {
    const memberUserId = doc.data().userId;
    if (!memberUserId) continue;
    const userDoc = await db.collection('users').doc(memberUserId).get();
    if (!userDoc.exists) continue;
    const ns = userDoc.data().notificationSettings || {};
    if (ns.alertEmail !== false) add(memberUserId, userDoc.data().email);
  }

  return recipients;
}

/** 全ユーザーから accountOwnerId -> メンバー（アラートON・emailあり）のマップを1回で構築 */
async function buildMembersByOwnerForAlerts(db) {
  const usersSnap = await db.collection('users').get();
  const map = new Map();
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const ns = data.notificationSettings || {};
    if (ns.alertEmail === false) continue;
    const email = data.email;
    if (!email) continue;
    const accountOwnerId = data.accountOwnerId;
    if (!accountOwnerId) continue;
    if (!map.has(accountOwnerId)) map.set(accountOwnerId, []);
    map.get(accountOwnerId).push({ userId: doc.id, email });
  }
  return map;
}

/**
 * 同一サイト・同一メトリクス・同一日で既にアラートがあるか
 */
async function hasExistingAlertToday(db, siteId, metricName, alertDate) {
  const snap = await db
    .collection('sites')
    .doc(siteId)
    .collection('alerts')
    .where('metricName', '==', metricName)
    .where('alertDate', '==', alertDate)
    .limit(1)
    .get();
  return !snap.empty;
}

/**
 * メトリクス比較で閾値超えを検出し、アラート作成・メール送信・仮説生成を実行
 */
async function runCheckMetricAlerts() {
  const db = getFirestore();
  const today = format(new Date(), 'yyyy-MM-dd', { locale: ja });
  const now = new Date();
  const currentEnd = subDays(now, 1);
  const currentStart = subDays(currentEnd, 6);
  const previousEnd = subDays(currentStart, 1);
  const previousStart = subDays(previousEnd, 6);

  const currentStartStr = format(currentStart, 'yyyy-MM-dd', { locale: ja });
  const currentEndStr = format(currentEnd, 'yyyy-MM-dd', { locale: ja });
  const previousStartStr = format(previousStart, 'yyyy-MM-dd', { locale: ja });
  const previousEndStr = format(previousEnd, 'yyyy-MM-dd', { locale: ja });

  const periodCurrentLabel = `${currentStartStr} 〜 ${currentEndStr}`;
  const periodPreviousLabel = `${previousStartStr} 〜 ${previousEndStr}`;

  const sitesSnap = await db.collection('sites').get();
  const sitesWithGa4 = sitesSnap.docs.filter(
    (d) => d.data().ga4PropertyId && d.data().ga4OauthTokenId
  );

  const membersByOwner = await buildMembersByOwnerForAlerts(db);
  const appBaseUrl = process.env.APP_BASE_URL || 'https://grow-reporter.web.app';

  for (const siteDoc of sitesWithGa4) {
    const siteId = siteDoc.id;
    const siteData = siteDoc.data();
    const siteName = siteData.siteName || siteData.siteUrl || siteId;
    const siteUrl = siteData.siteUrl || '';

    let currentMetrics;
    let previousMetrics;
    try {
      currentMetrics = await getGA4MetricsForSite(db, siteId, currentStartStr, currentEndStr);
      previousMetrics = await getGA4MetricsForSite(db, siteId, previousStartStr, previousEndStr);
    } catch (err) {
      console.error(`[checkMetricAlerts] GA4 fetch error site=${siteId}`, err.message);
      continue;
    }
    if (!currentMetrics || !previousMetrics) continue;

    for (const metricKey of METRIC_KEYS) {
      const currentVal = currentMetrics[metricKey];
      const previousVal = previousMetrics[metricKey];
      if (previousVal == null || previousVal === 0) continue;

      const changePercent =
        ((currentVal - previousVal) / previousVal) * 100;
      const absChange = Math.abs(changePercent);
      if (absChange < ALERT_THRESHOLD_PERCENT) continue;

      const alreadyExists = await hasExistingAlertToday(db, siteId, metricKey, today);
      if (alreadyExists) continue;

      const isDrop = changePercent < 0;
      const type = isDrop ? `${metricKey}_drop` : `${metricKey}_surge`;
      const metricLabel = METRIC_LABELS[metricKey] || metricKey;
      const direction = isDrop ? '減少' : '増加';
      const message = `${metricLabel}が${Math.abs(changePercent).toFixed(1)}%${direction}しました`;

      const alertRef = db.collection('sites').doc(siteId).collection('alerts').doc();
      const alertId = alertRef.id;
      const alertData = {
        siteId,
        type,
        metricName: metricKey,
        metricLabel,
        currentValue: currentVal,
        previousValue: previousVal,
        changePercent,
        message,
        periodCurrent: periodCurrentLabel,
        periodPrevious: periodPreviousLabel,
        alertDate: today,
        hypotheses: [],
        createdAt: FieldValue.serverTimestamp(),
      };
      await alertRef.set(alertData);

      // 仮説を生成してからメール送信（仮説の内容をメールに含めるため await）
      let hypothesesForEmail = [{ text: '仮説を取得できませんでした', source: 'ai' }];
      try {
        await generateAlertHypotheses(db, siteId, alertId, { ...alertData, id: alertId }, siteName);
        // 生成後のアラートドキュメントから仮説を取得
        const updatedAlert = await alertRef.get();
        const updatedHypotheses = updatedAlert.data()?.hypotheses;
        if (updatedHypotheses && updatedHypotheses.length > 0) {
          hypothesesForEmail = updatedHypotheses;
        }
      } catch (err) {
        console.error('[checkMetricAlerts] hypotheses error', err.message);
      }

      const recipients = await getAlertRecipientsForSite(db, siteId, membersByOwner);
      const dashboardUrl = `${appBaseUrl}/dashboard?siteId=${siteId}`;
      const { subject, html, text } = generateAlertEmailTemplate(
        { ...alertData, hypotheses: hypothesesForEmail },
        siteName,
        siteUrl,
        dashboardUrl
      );

      for (const { email } of recipients) {
        try {
          await sendEmailDirect({ to: email, subject, html, text });
        } catch (e) {
          console.error(`[checkMetricAlerts] sendEmail failed ${email}`, e.message);
        }
      }
    }
  }
}

export { runCheckMetricAlerts };
