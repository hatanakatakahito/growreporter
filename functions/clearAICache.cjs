/**
 * AI分析キャッシュを削除するスクリプト
 * 
 * 使い方:
 * cd functions
 * node clearAICache.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./growgroupreporter-007e0991bce2.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearAICache() {
  console.log('AI分析キャッシュの削除を開始します...');
  
  try {
    // comprehensive_improvement のキャッシュを削除
    const comprehensiveCache = await db.collection('aiAnalysisCache')
      .where('pageType', '==', 'comprehensive_improvement')
      .get();
    
    console.log(`comprehensive_improvement: ${comprehensiveCache.size}件`);
    
    const batch1 = db.batch();
    comprehensiveCache.docs.forEach(doc => {
      batch1.delete(doc.ref);
    });
    await batch1.commit();
    console.log('✓ comprehensive_improvement のキャッシュを削除しました');
    
    // 全てのキャッシュを削除（オプション）
    // const allCache = await db.collection('aiAnalysisCache').get();
    // console.log(`全キャッシュ: ${allCache.size}件`);
    // 
    // const batch2 = db.batch();
    // allCache.docs.forEach(doc => {
    //   batch2.delete(doc.ref);
    // });
    // await batch2.commit();
    // console.log('✓ 全キャッシュを削除しました');
    
    console.log('\n完了しました！');
    process.exit(0);
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

clearAICache();

