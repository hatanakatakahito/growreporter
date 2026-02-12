/**
 * プロンプトテンプレート管理ユーティリティ
 */

// メモリキャッシュ（Cloud Functionsのインスタンス内で共有）
const promptCache = new Map();
const CACHE_TTL = 30 * 1000; // 30秒（開発中は短めに設定）

/**
 * Firestoreからアクティブなプロンプトテンプレートを取得
 * @param {FirebaseFirestore.Firestore} db - Firestoreインスタンス
 * @param {string} pageType - ページタイプ
 * @returns {Promise<string|null>} プロンプトテンプレート文字列、またはnull
 */
export async function getActivePromptTemplate(db, pageType) {
  const cacheKey = `prompt_${pageType}`;
  
  // キャッシュチェック
  if (promptCache.has(cacheKey)) {
    const cached = promptCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[PromptManager] Cache hit for ${pageType}`);
      return cached.template;
    } else {
      // 期限切れのキャッシュを削除
      promptCache.delete(cacheKey);
    }
  }

  try {
    console.log(`[PromptManager] Fetching active prompt for ${pageType} from Firestore...`);
    
    // Firestoreからアクティブなプロンプトを取得
    const snapshot = await db.collection('promptTemplates')
      .where('pageType', '==', pageType)
      .where('isActive', '==', true)
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log(`[PromptManager] ⚠️ No active prompt found for ${pageType}`);
      return null;
    }

    const promptDoc = snapshot.docs[0];
    const promptData = promptDoc.data();
    const template = promptData.template;

    console.log(`[PromptManager] ✅ Active prompt found for ${pageType}:`, {
      id: promptDoc.id,
      title: promptData.title,
      version: promptData.version,
      templateLength: template?.length || 0,
      updatedAt: promptData.updatedAt?.toDate?.()?.toISOString() || 'unknown',
    });

    // キャッシュに保存
    promptCache.set(cacheKey, {
      template,
      timestamp: Date.now(),
    });

    console.log(`[PromptManager] 💾 Cached prompt for ${pageType} (TTL: ${CACHE_TTL}ms)`);
    return template;

  } catch (error) {
    console.error(`[PromptManager] Error fetching prompt for ${pageType}:`, error);
    return null;
  }
}

/**
 * プロンプトテンプレートをレンダリング（変数埋め込み）
 * 簡易的なテンプレートエンジン実装
 * 
 * @param {string} template - プロンプトテンプレート
 * @param {object} context - 変数コンテキスト
 * @returns {string} レンダリング済みプロンプト
 */
export function renderPromptTemplate(template, context) {
  try {
    // ${変数名}形式の変数を置換
    // 注意: evalは使わず、安全な文字列置換のみ
    let rendered = template;

    // contextの各プロパティをテンプレートに埋め込み
    // 例: ${metrics.users} -> context.metrics.users の値
    const variableRegex = /\$\{([^}]+)\}/g;
    
    rendered = rendered.replace(variableRegex, (match, expression) => {
      try {
        // ドット記法をパースして値を取得
        const value = getNestedValue(context, expression.trim());
        
        // 値が関数の場合は実行結果を返す
        if (typeof value === 'function') {
          return value();
        }
        
        // undefinedやnullの場合は空文字
        if (value === undefined || value === null) {
          return '';
        }
        
        return String(value);
      } catch (error) {
        console.warn(`[PromptManager] Failed to resolve variable: ${expression}`, error);
        return match; // 解決できない場合は元の変数をそのまま返す
      }
    });

    return rendered;

  } catch (error) {
    console.error('[PromptManager] Error rendering template:', error);
    return template; // エラー時は元のテンプレートを返す
  }
}

/**
 * ネストされたオブジェクトから値を取得
 * @param {object} obj - オブジェクト
 * @param {string} path - パス（例: "metrics.users"）
 * @returns {any} 値
 */
function getNestedValue(obj, path) {
  try {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      current = current[key];
    }

    return current;
  } catch (error) {
    return undefined;
  }
}

/**
 * プロンプトキャッシュをクリア
 * （主にテスト用）
 */
export function clearPromptCache() {
  promptCache.clear();
  console.log('[PromptManager] Prompt cache cleared');
}

/**
 * 使用回数を記録
 * @param {FirebaseFirestore.Firestore} db - Firestoreインスタンス
 * @param {string} pageType - ページタイプ
 */
export async function incrementPromptUsage(db, pageType) {
  try {
    const snapshot = await db.collection('promptTemplates')
      .where('pageType', '==', pageType)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const promptDoc = snapshot.docs[0];
      await promptDoc.ref.update({
        usageCount: (promptDoc.data().usageCount || 0) + 1,
        lastUsedAt: new Date(),
      });
      console.log(`[PromptManager] Usage count incremented for ${pageType}`);
    }
  } catch (error) {
    // 使用回数の更新失敗は致命的ではないのでログのみ
    console.warn(`[PromptManager] Failed to increment usage count for ${pageType}:`, error);
  }
}

