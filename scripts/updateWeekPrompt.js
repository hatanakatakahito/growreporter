import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Firebase Admin初期化
const serviceAccount = JSON.parse(
  readFileSync('./serviceAccountKey.json', 'utf8')
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 新しい曜日別分析プロンプト
const newPrompt = `あなたは【曜日別分析の専門家】です。\${period}のWebサイトの曜日別データを分析し、**曜日ごとのトレンドと最適な施策タイミング**を含む日本語の要約を**必ず800文字以内**で生成してください。

【曜日別データの概要】
- 総セッション数: \${metrics.sessions?.toLocaleString() || 0}回\${hasConversions ? \`
- コンバージョン数: \${metrics.conversions?.toLocaleString() || 0}件\` : '

⚠️ **注意**: コンバージョン定義が未設定です。CV分析をご希望の場合、サイト設定画面から設定してください。'}
- 7曜日（月～日）のセッション・コンバージョン推移

【要求事項】
- **800文字以内で簡潔にまとめる**（これは厳守してください）
- Markdownの見出し記法（##, ###）を使用して構造化
- **必ず以下のセクションを含める**：全体パターン、ピーク曜日の分析、ビジネスへの影響、原因の考察

## 全体的なアクセスパターン
- **平日vs週末の比較**を数値で示す
  例：「平日平均390回/日（月～金の合計1,950回）、週末平均510回/日（土日の合計1,020回）で週末が+30.8%多い」
- **最もアクセスが多い曜日と少ない曜日**を明示
  例：「火曜日が2,273セッションで最多（全体の17.3%）、水曜日が1,716セッションで最少（13.1%）」
- **曜日ごとの変動幅**を評価
  例：「最大と最小の差は557セッション（32.5%差）で、やや変動が大きい」

## ピーク曜日の特定と分析
- **セッションが多い上位3曜日**を具体的な数値で明示
  例：「①火曜日: 2,273セッション（全体の17.3%）
       ②月曜日: 2,030セッション（15.5%）
       ③土曜日: 1,864セッション（14.2%）」
\${hasConversions ? \`- **コンバージョンが多い上位3曜日**を明示
  例：「①日曜日: 21件（CVR 1.30%）
       ②月曜日: 20件（CVR 0.99%）
       ③金曜日: 14件（CVR 0.79%）」
- **CVRが高い曜日の特徴**：
  - セッション数とCV数が必ずしも比例しない点に着目
  - CVRが高い曜日は、ユーザーの購買意欲が高いタイミング\` : ''}
- **ユーザー行動パターンの推測**：
  - 平日が多い → BtoB寄り（業務時間中に情報収集・検討）
  - 週末が多い → BtoC寄り（プライベート時間でじっくり検討）
  - 月曜・火曜が多い → 週初めに情報収集、週中～週末に決断のパターン

## ビジネスへの影響
- **マーケティング施策のタイミング最適化**：
  - アクセスが多い曜日：「広告予算を重点配分し、リーチを最大化」
  - アクセスが少ない曜日：「メンテナンス作業や次週の準備に充てる」
\${hasConversions ? \`  - CVRが高い曜日：「CVに特化した広告・キャンペーンを集中投下し、ROAS向上」
  - CVRが低い曜日：「認知拡大や情報提供コンテンツでリーチ優先」\` : ''}
- **運営体制の最適化**：
  - ピーク曜日：「カスタマーサポートやチャット対応の人員を増強」
  - オフピーク曜日：「コンテンツ制作、データ分析、改善施策の実施」

## 原因の考察
**なぜこのような曜日別パターンが形成されているか**（2-3つの仮説を提示）：
- 仮説1: ターゲット層のライフスタイル・行動習慣
  例：「BtoB商材で月曜に情報収集、金曜に意思決定」「BtoC商材で週末にじっくり比較検討」
- 仮説2: コンテンツ更新・メルマガ配信のタイミング
  例：「特定曜日のコンテンツ更新がトラフィックを牽引」
- 仮説3: 広告配信スケジュールの影響
  例：「特定曜日への広告予算集中がアクセスパターンを形成」
\${hasConversions ? \`- 仮説4: CVに至るユーザーの検討期間・意思決定タイミング
  例：「週初めに情報収集し、週末に決断するパターン」\` : ''}

【禁止事項】
- ❌ 「曜日による違いがある」程度の抽象的な記述
- ❌ 数値を示さない曖昧な表現（「多い」「少ない」だけで終わる）
- ❌ 「ビジネスへの影響」「原因の考察」セクションの欠落
- ❌ 時間帯（9時、20時など）の言及（このデータには時間帯情報が含まれていません）`;

async function updatePrompt() {
  try {
    console.log('📝 曜日別分析のカスタムプロンプトを更新します...');
    
    // week_default_v1 を検索
    const promptsRef = db.collection('promptTemplates');
    const snapshot = await promptsRef.where('pageType', '==', 'week').get();
    
    if (snapshot.empty) {
      console.log('⚠️  weekのプロンプトが見つかりませんでした。新規作成します。');
      
      // 新規作成
      await promptsRef.add({
        pageType: 'week',
        title: '曜日別分析 - 更新版',
        description: '曜日別データに基づいた分析プロンプト',
        template: newPrompt,
        version: '2.0',
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        usageCount: 0,
      });
      
      console.log('✅ 新しいプロンプトを作成しました');
    } else {
      // 既存のプロンプトを更新
      const doc = snapshot.docs[0];
      console.log(`📄 既存のプロンプトを更新: ${doc.id}`);
      console.log(`   タイトル: ${doc.data().title}`);
      console.log(`   バージョン: ${doc.data().version}`);
      
      await doc.ref.update({
        template: newPrompt,
        version: '2.0',
        title: '曜日別分析 - 更新版v2',
        description: '曜日別データに基づいた分析プロンプト（時間帯情報なし）',
        updatedAt: Timestamp.now(),
      });
      
      console.log('✅ プロンプトを更新しました');
    }
    
    console.log('\n🎉 更新完了！');
    process.exit(0);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

updatePrompt();



