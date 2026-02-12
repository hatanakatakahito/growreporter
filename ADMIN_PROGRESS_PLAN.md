# GROW REPORTER アドミン画面 詳細進行計画

作成日: 2025年1月24日  
開始予定: 承認後すぐ  
完了予定: 2-3週間後

---

## 📅 週次スケジュール

### Week 1: 基盤構築とダッシュボード

#### Day 1-2（月・火）: プロジェクト準備
**目標**: 開発環境の準備とアドミン画面の基盤構築

**タスク:**
- [x] v2.0.0ブランチの作成
  ```bash
  git checkout -b feature/admin-dashboard
  ```

- [ ] アドミン画面のディレクトリ構成作成
  ```
  src/
  ├── pages/
  │   └── Admin/
  │       ├── Dashboard.jsx
  │       ├── Users/
  │       │   ├── UserList.jsx
  │       │   └── UserDetail.jsx
  │       ├── Sites/
  │       ├── Logs/
  │       └── Settings/
  ├── components/
  │   └── Admin/
  │       ├── AdminLayout.jsx
  │       ├── AdminSidebar.jsx
  │       ├── AdminTable.jsx
  │       ├── AdminCard.jsx
  │       └── AdminModal.jsx
  └── hooks/
      └── useAdmin.js
  ```

- [ ] ルーティング設定（React Router）
  ```jsx
  // App.jsx に追加
  <Route path="/admin/*" element={
    <AdminRoute>
      <AdminLayout />
    </AdminRoute>
  }>
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="users" element={<UserList />} />
    <Route path="users/:userId" element={<UserDetail />} />
    <Route path="sites" element={<SiteList />} />
    <Route path="logs" element={<ActivityLogs />} />
  </Route>
  ```

- [ ] AdminRoute（権限チェック）の実装
  ```jsx
  // components/Admin/AdminRoute.jsx
  const AdminRoute = ({ children }) => {
    const { isAdmin, loading } = useAdmin();
    
    if (loading) return <LoadingSpinner />;
    if (!isAdmin) return <Navigate to="/" />;
    
    return children;
  };
  ```

- [ ] Firestoreに初期管理者を手動追加
  ```javascript
  // adminUsers コレクション
  {
    adminId: "your-uid",
    email: "hatanaka@grow-group.jp",
    displayName: "畑中 孝仁",
    role: "admin",
    createdAt: Timestamp.now()
  }
  ```

**成果物:**
- アドミン画面の基本構成
- ルーティング設定完了
- 権限チェック機能

---

#### Day 3-4（水・木）: ダッシュボード実装

**目標**: 統計ダッシュボードの完成

**タスク:**

**Day 3: バックエンド実装**
- [ ] Cloud Function: `getSystemStats` の実装
  ```javascript
  // functions/src/callable/getSystemStats.js
  export const getSystemStatsCallable = onCall(async (request) => {
    // 管理者チェック
    if (!await isAdmin(request.auth.uid)) {
      throw new HttpsError('permission-denied', '管理者権限が必要です');
    }
    
    // ユーザー統計
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const userStats = {
      free: 0,
      standard: 0,
      premium: 0,
      total: usersSnapshot.size
    };
    
    usersSnapshot.forEach(doc => {
      const plan = doc.data().plan || 'free';
      userStats[plan]++;
    });
    
    // 収益統計
    const revenue = {
      mrr: userStats.standard * 9800 + userStats.premium * 19800,
      standard: userStats.standard * 9800,
      premium: userStats.premium * 19800
    };
    
    // サイト統計
    const sitesSnapshot = await getDocs(collection(db, 'sites'));
    
    return {
      userStats,
      revenue,
      siteCount: sitesSnapshot.size,
      // ... その他の統計
    };
  });
  ```

**Day 4: フロントエンド実装**
- [ ] ダッシュボードレイアウト作成
- [ ] 統計カードコンポーネント（AdminCard）
- [ ] グラフ表示（Recharts導入）
- [ ] リアルタイムデータ更新

**成果物:**
- 動作する統計ダッシュボード
- 美しいUI

---

#### Day 5-7（金・土・日）: ユーザー一覧画面

**目標**: ユーザー管理の基本機能完成

**タスク:**

**Day 5: バックエンド実装**
- [ ] Cloud Function: `listUsers` の実装
  ```javascript
  export const listUsersCallable = onCall(async (request) => {
    const { page = 1, limit = 20, searchQuery, planFilter } = request.data;
    
    let query = collection(db, 'users');
    
    // フィルタ適用
    if (planFilter && planFilter !== 'all') {
      query = query.where('plan', '==', planFilter);
    }
    
    // ページネーション
    const startIndex = (page - 1) * limit;
    const snapshot = await getDocs(query);
    
    const users = [];
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    // 検索フィルタ（クライアント側で実行）
    let filteredUsers = users;
    if (searchQuery) {
      filteredUsers = users.filter(user => 
        user.email?.includes(searchQuery) ||
        user.displayName?.includes(searchQuery) ||
        user.company?.includes(searchQuery)
      );
    }
    
    return {
      users: filteredUsers.slice(startIndex, startIndex + limit),
      total: filteredUsers.length,
      page,
      limit
    };
  });
  ```

**Day 6-7: フロントエンド実装**
- [ ] ユーザー一覧テーブル（AdminTable）
- [ ] 検索UI
- [ ] フィルタUI（プラン別、日付範囲）
- [ ] ソート機能
- [ ] ページネーション
- [ ] CSVエクスポート機能

**成果物:**
- ユーザー一覧画面完成
- 検索・フィルタ・ソート動作確認

---

### Week 2: ユーザー詳細とプラン変更

#### Day 8-9（月・火）: ユーザー詳細画面

**タスク:**

**Day 8: バックエンド実装**
- [ ] Cloud Function: `getUserDetail` の実装
  ```javascript
  export const getUserDetailCallable = onCall(async (request) => {
    const { userId } = request.data;
    
    // ユーザー基本情報
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    
    // 登録サイト一覧
    const sitesQuery = query(
      collection(db, 'sites'),
      where('userId', '==', userId)
    );
    const sitesSnapshot = await getDocs(sitesQuery);
    const sites = [];
    sitesSnapshot.forEach(doc => {
      sites.push({ id: doc.id, ...doc.data() });
    });
    
    // 使用状況（今月）
    const currentMonth = format(new Date(), 'yyyy-MM');
    // TODO: AI使用回数の集計
    
    // アクティビティログ（直近10件）
    const logsQuery = query(
      collection(db, 'activityLogs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const logsSnapshot = await getDocs(logsQuery);
    const logs = [];
    logsSnapshot.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() });
    });
    
    return {
      user: userData,
      sites,
      usage: {
        // TODO: 実装
      },
      logs
    };
  });
  ```

**Day 9: フロントエンド実装**
- [ ] ユーザー詳細レイアウト
- [ ] 基本情報セクション
- [ ] プラン情報セクション
- [ ] 使用状況セクション
- [ ] 登録サイト一覧
- [ ] アクティビティログ表示

**成果物:**
- ユーザー詳細画面完成

---

#### Day 10-12（水・木・金）: プラン変更機能

**タスク:**

**Day 10: バックエンド実装**
- [ ] Cloud Function: `changePlan` の実装
  ```javascript
  export const changePlanCallable = onCall(async (request) => {
    const { userId, newPlan, reason } = request.data;
    const adminUserId = request.auth.uid;
    
    // 現在のプランを取得
    const userDoc = await getDoc(doc(db, 'users', userId));
    const currentPlan = userDoc.data().plan;
    
    // プランを更新
    await updateDoc(doc(db, 'users', userId), {
      plan: newPlan,
      planHistory: arrayUnion({
        from: currentPlan,
        to: newPlan,
        reason: reason,
        changedBy: adminUserId,
        changedAt: serverTimestamp()
      }),
      updatedAt: serverTimestamp()
    });
    
    // アクティビティログに記録
    await addDoc(collection(db, 'adminLogs'), {
      type: 'plan_change',
      userId: userId,
      details: {
        from: currentPlan,
        to: newPlan,
        reason: reason
      },
      adminUserId: adminUserId,
      timestamp: serverTimestamp()
    });
    
    return { success: true };
  });
  ```

**Day 11: メール通知機能**
- [ ] Resend または SendGrid の設定
- [ ] メールテンプレート作成
- [ ] 通知送信Cloud Function

**Day 12: フロントエンド実装**
- [ ] プラン変更モーダル
- [ ] 確認ダイアログ
- [ ] エラーハンドリング
- [ ] 成功通知

**成果物:**
- プラン変更機能完成
- メール通知動作確認

---

#### Day 13-14（土・日）: アクティビティログ

**タスク:**

**Day 13: バックエンド実装**
- [ ] Cloud Function: `getActivityLogs` の実装
- [ ] ログ記録関数の統合
- [ ] フィルタ・検索機能

**Day 14: フロントエンド実装**
- [ ] ログ一覧画面
- [ ] フィルタUI
- [ ] ログ詳細表示

**成果物:**
- アクティビティログ機能完成

---

### Week 3: テスト・デプロイ

#### Day 15-16（月・火）: 統合テスト

**タスク:**
- [ ] 全機能の動作確認
- [ ] エッジケースのテスト
- [ ] パフォーマンステスト
- [ ] バグ修正

**テスト項目:**
- ✅ 管理者以外はアクセスできないか
- ✅ ユーザー一覧が正しく表示されるか
- ✅ 検索・フィルタが動作するか
- ✅ プラン変更が正しく反映されるか
- ✅ メール通知が送信されるか
- ✅ ログが正しく記録されるか
- ✅ CSVエクスポートが動作するか

---

#### Day 17-18（水・木）: セキュリティ確認

**タスク:**
- [ ] Firestoreセキュリティルールの確認
- [ ] Cloud Functionsの権限チェック確認
- [ ] XSS対策の確認
- [ ] CSRF対策の確認
- [ ] セキュリティドキュメント作成

**チェック項目:**
- ✅ 管理者権限が正しくチェックされているか
- ✅ SQLインジェクション対策
- ✅ 機密情報の暗号化
- ✅ アクセスログの記録

---

#### Day 19-20（金・土）: ドキュメント作成

**タスク:**
- [ ] 管理者マニュアル作成
- [ ] 運用手順書作成
- [ ] トラブルシューティングガイド
- [ ] API仕様書

**ドキュメント内容:**
- アドミン画面の使い方
- プラン変更の手順
- よくある問題と解決方法
- 初期セットアップ手順

---

#### Day 21（日）: デプロイ

**タスク:**
- [ ] 本番環境への準備
- [ ] 環境変数の設定
- [ ] Cloud Functionsのデプロイ
- [ ] フロントエンドのデプロイ
- [ ] 動作確認
- [ ] v2.0.0リリース

**デプロイ手順:**
```bash
# 1. マージ
git checkout master
git merge feature/admin-dashboard

# 2. タグ付け
git tag v2.0.0

# 3. Cloud Functionsデプロイ
cd functions
npm run deploy

# 4. フロントエンドビルド＆デプロイ
npm run build
firebase deploy --only hosting

# 5. プッシュ
git push origin master
git push origin v2.0.0
```

---

## 📊 進捗管理

### マイルストーン

| マイルストーン | 期限 | ステータス |
|---------------|------|-----------|
| Week 1完了 | Day 7 | 🔲 未着手 |
| Week 2完了 | Day 14 | 🔲 未着手 |
| Week 3完了 | Day 21 | 🔲 未着手 |

### デイリーレビュー

毎日終業時に以下を確認：
- [ ] 当日のタスク完了率
- [ ] 発生した問題
- [ ] 翌日のタスク確認

### ウィークリーレビュー

毎週末に以下を確認：
- [ ] 週次目標の達成度
- [ ] 遅延の有無と原因
- [ ] 次週の計画調整

---

## 🚨 リスク管理

### 想定されるリスク

#### 1. 技術的課題
**リスク**: Firestoreのクエリ制限でページネーションが複雑になる  
**対策**: Algoliaなどの検索サービスの検討

#### 2. スケジュール遅延
**リスク**: 予期せぬバグで遅延  
**対策**: Phase 1の必須機能を優先、他は後回し

#### 3. セキュリティ問題
**リスク**: 権限チェックの漏れ  
**対策**: 徹底したコードレビューとテスト

---

## ✅ 完了条件

Phase 1が完了したと判断する基準：

- [ ] すべてのTodoが完了
- [ ] 統合テスト合格
- [ ] セキュリティチェック合格
- [ ] ドキュメント作成完了
- [ ] 本番環境で動作確認完了
- [ ] ユーザー（畑中様）の承認取得

---

## 📞 サポート体制

### 質問・相談窓口
実装中の質問や相談は随時受け付けます。

### 定期報告
- 毎週金曜日: 週次進捗レポート
- 重要な変更: 都度報告

---

## 🎉 完成イメージ

Phase 1完了時、以下が実現します：

### ダッシュボード
- 一目でシステム全体の状況を把握
- 美しいグラフとカード表示

### ユーザー管理
- 数秒でユーザー情報を確認
- ワンクリックでプラン変更

### アクティビティログ
- すべての操作履歴を追跡
- 監査にも対応

---

**準備完了！承認後、すぐに実装を開始します！🚀**

