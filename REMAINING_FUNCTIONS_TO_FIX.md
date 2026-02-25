# 権限チェック修正が必要な残りの関数

以下の関数で `canAccessSite` を使った権限チェックに修正が必要です：

## GA4関連（閲覧権限）
1. ✅ fetchGA4Data.js - 完了
2. ✅ fetchGA4MonthlyData.js - 完了
3. ❌ fetchGA4HourlyConversionData.js
4. ❌ fetchGA4MonthlyConversionData.js
5. ❌ fetchGA4DailyConversionData.js
6. ❌ fetchGA4ReferralConversionData.js
7. ❌ fetchGA4PagePaths.js
8. ❌ fetchGA4LandingPageConversionData.js
9. ❌ fetchGA4UserDemographics.js
10. ❌ fetchGA4ChannelConversionData.js
11. ❌ fetchGA4PageTransition.js
12. ❌ fetchGA4ReverseFlowData.js
13. ❌ fetchGA4WeeklyConversionData.js

## GSC関連（閲覧権限）
1. ✅ fetchGSCData.js - 完了

## AI関連（編集権限）
1. ✅ generateAISummary.js - 完了

## その他（編集権限）
1. ❌ scrapeTop100Pages.js

## 修正方法

### 1. import文に追加
```javascript
import { canAccessSite } from '../utils/permissionHelper.js';
```

### 2. 権限チェック部分を置換
```javascript
// 旧コード
if (siteData.userId !== userId) {
  const adminDoc = await db.collection('adminUsers').doc(userId).get();
  if (!adminDoc.exists || !['admin', 'editor', 'viewer'].includes(adminDoc.data().role)) {
    throw new HttpsError('permission-denied', 'このサイトにアクセスする権限がありません');
  }
}

// 新コード
const hasAccess = await canAccessSite(userId, siteId);
if (!hasAccess) {
  throw new HttpsError('permission-denied', 'このサイトにアクセスする権限がありません');
}
```

## 優先度

**高**: ダッシュボードで使用される関数
- fetchGA4UserDemographics
- fetchGA4PagePaths
- fetchGA4PageTransition

**中**: 分析画面で使用される関数
- 各種ConversionData関数

**低**: 管理機能
- scrapeTop100Pages
