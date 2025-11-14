import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Firebase Admin初期化
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'growgroupreporter-007e0991bce2.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const usersPromptTemplate = `あなたは優秀なWebアクセスの解析士です。\${period}のWebサイトのユーザー属性データを分析し、**属性ごとの変動パターンから実用的なインサイト**を含む日本語の要約を**必ず800文字以内**で生成してください。

【ユーザー属性データ】
\${newVsReturningText || ''}
\${demographicsText || ''}

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下の4つのセクションを含める**：

## 概要
- 対象期間のユーザー属性全体を2-3文で総括
- 新規/リピーター比率と主要デバイス/地域を数値で明示
  例：「新規ユーザー81.1%、リピーター18.9%。モバイル49.9%、デスクトップ47.6%」

## 新規・リピートの考察
- **新規ユーザーとリピーターの比率**：
  具体的な人数と割合を明示
  例：「新規ユーザー8,245人（81.1%）、リピーター1,920人（18.9%）」
- **比率の評価**：
  - 新規が多い場合: 集客力は高いがリピート施策の余地あり
  - リピートが多い場合: ユーザー定着率が高く安定した集客
  - バランスが良い場合: 新規獲得と維持のバランスが取れている
- **なぜこの比率になったか**の仮説：
  広告キャンペーン、SEO施策、コンテンツの魅力、リピート促進策の有無など

## 属性の考察
- **デバイス別の特徴**：
  各デバイスの人数と割合を明示
  例：「モバイル4,980人（49.9%）、デスクトップ4,750人（47.6%）、タブレット250人（2.5%）」
  - モバイル優位: スマホ最適化の重要性、SNS流入の可能性
  - デスクトップ優位: BtoB、情報収集、じっくり検討する商材
  - バランス型: 幅広いユーザー層にアプローチ
- **地域別の特徴**（上位地域がある場合）：
  主要地域とその割合
  例：「Tokyo 3,200人（32.1%）、Osaka 1,800人（18.0%）、Aichi 950人（9.5%）」
- **年齢・性別の特徴**（データがある場合）：
  主要年齢層・性別の割合
  例：「25-34歳が最大（35.2%）、男性63.5%、女性36.5%」
- **属性間の相関**：
  デバイス・地域・年齢などの関連性を推測
  例：「モバイルユーザーが多い地域は若年層が多い傾向」

## 改善点
- **優先改善課題**を2-3点挙げる：
  - 新規/リピート比率の最適化
    例：「新規が多い場合: メールマーケティングやリマーケティングでリピーター育成」
    例：「リピートが多い場合: 広告やSEOで新規ユーザー獲得を強化」
  - デバイス最適化
    例：「モバイルが多い場合: スマホUX改善、ページ速度向上」
    例：「デスクトップが多い場合: PC向けコンテンツの充実、詳細情報の提供」
  - ターゲット層へのアプローチ
    例：「主要年齢層・性別に合わせたコンテンツ・広告クリエイティブの最適化」
    例：「主要地域への地域限定施策、ローカルSEO強化」
  - ペルソナ設計の見直し
    例：「実際のユーザー属性とターゲット設計にズレがある場合、戦略の再検討」

【禁止事項】
- ❌ 属性の羅列のみで終わる
- ❌ 数値を示さない抽象的な表現
- ❌ 4つのセクション（概要、新規・リピート、属性、改善点）の欠落
- ❌ データがない属性への言及（データがない場合は触れない）
`;

async function updateUsersPrompt() {
  console.log('🚀 ユーザー属性プロンプトを更新します...');
  const docId = `users_default_v1`;
  const docRef = db.collection('promptTemplates').doc(docId);

  try {
    await docRef.set({
      pageType: 'users',
      version: '1.0',
      isActive: true,
      isDefault: true,
      title: 'ユーザー属性 - デフォルト',
      description: '優秀なWebアクセス解析士、4軸構成（概要・新規リピート・属性・改善点）',
      template: usersPromptTemplate,
      createdBy: 'system',
      usageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    console.log(`✅ ユーザー属性プロンプトを更新しました`);
    console.log(`   タイトル: ユーザー属性 - デフォルト`);
    console.log(`   説明: 優秀なWebアクセス解析士、4軸構成（概要・新規リピート・属性・改善点）`);
  } catch (error) {
    console.error(`❌ エラー発生 (ユーザー属性プロンプト):`, error);
  }
  console.log(`\n✨ 完了しました！`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateUsersPrompt().catch(console.error);
}


