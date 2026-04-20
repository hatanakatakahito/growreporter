/**
 * 指定メールアドレスのユーザーのツアーガイド履歴を初期化するスクリプト
 *
 * 使い方:
 *   cd functions && node ../scripts/resetTourHistory.js <email>
 *
 * 処理内容:
 *   - Firebase Auth でメールアドレスから uid を解決
 *   - users/{uid}.onboarding.seenTours を全て false にリセット
 *   - tourGuideEnabled を true に戻す
 *
 * 前提: gcloud application-default credentials が設定済み
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'growgroupreporter',
  });
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node ../scripts/resetTourHistory.js <email>');
  process.exit(1);
}

const DEFAULT_SEEN_TOURS = {
  dashboard: false,
  analysisMonth: false,
  analysisDay: false,
  analysisWeek: false,
  analysisHour: false,
  analysisChannels: false,
  analysisKeywords: false,
  analysisReferrals: false,
  analysisPages: false,
  analysisContent: false,
  analysisPageCategories: false,
  analysisLandingPages: false,
  analysisPageFlow: false,
  analysisConversions: false,
  analysisReverseFlow: false,
  analysisExternalLinks: false,
  analysisFileDownloads: false,
  analysisUsers: false,
  analysisSummaryFree: false,
  analysisExport: false,
  analysisSummary: false,
  comprehensiveAI: false,
  aiChat: false,
  improve: false,
  reports: false,
  members: false,
  accountSettings: false,
  sites: false,
};

async function main() {
  const user = await getAuth().getUserByEmail(email);
  console.log(`User found: uid=${user.uid}, email=${user.email}`);

  const db = getFirestore();
  const userRef = db.doc(`users/${user.uid}`);

  const snap = await userRef.get();
  if (!snap.exists) {
    console.error(`Firestore users/${user.uid} does not exist`);
    process.exit(1);
  }

  const data = snap.data();
  const plan = data.plan || 'free';

  await userRef.update({
    'onboarding.seenTours': DEFAULT_SEEN_TOURS,
    'onboarding.lastPlanId': plan,
    tourGuideEnabled: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`Reset seenTours for ${email} (plan: ${plan})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
