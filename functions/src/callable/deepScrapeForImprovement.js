/**
 * 深掘りスクレイピング Callable Function
 *
 * 改善案生成後に、対象ページのコンテンツ・デザイン構造を
 * Puppeteerで詳細に取得する。
 *
 * パラメータ:
 *   siteId: string
 *   improvements: [{ id: string, targetPageUrl: string }]
 *
 * 結果:
 *   各改善案のFirestoreドキュメントに deepScrapeData を追加
 *   siteStructureData コレクションにも保存（AI改善プロンプト用）
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { deepScrapePages } from '../utils/deepPageScraper.js';

export async function deepScrapeForImprovementCallable(req) {
  // 認証チェック
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const { siteId, improvements } = req.data;

  if (!siteId || !improvements || !Array.isArray(improvements) || improvements.length === 0) {
    throw new HttpsError('invalid-argument', 'siteId と improvements（配列）が必要です');
  }

  const db = getFirestore();
  const startTime = Date.now();

  console.log(`[deepScrapeForImprovement] Start: siteId=${siteId}, pages=${improvements.length}`);

  try {
    // サイトURLを取得（トップページのデザイン基盤取得用）
    let siteUrl = '';
    try {
      const siteDoc = await db.doc(`sites/${siteId}`).get();
      if (siteDoc.exists) {
        siteUrl = (siteDoc.data().siteUrl || '').trim().replace(/\/+$/, '');
      }
    } catch (e) {
      console.warn(`[deepScrapeForImprovement] siteUrl取得スキップ: ${e.message}`);
    }

    // 対象URLを抽出（重複排除）
    const urlMap = new Map(); // url -> [improvementIds]
    for (const imp of improvements) {
      if (!imp.targetPageUrl) continue;
      const url = imp.targetPageUrl;
      if (!urlMap.has(url)) {
        urlMap.set(url, []);
      }
      urlMap.get(url).push(imp.id);
    }

    // トップページを必ずスクレイプ対象に追加（サイト共通デザイン取得用）
    const homeUrl = siteUrl ? `${siteUrl}/` : '';
    if (homeUrl && !urlMap.has(homeUrl) && !urlMap.has(siteUrl)) {
      urlMap.set(homeUrl, []); // improvementIdなし = デザイン参照用
      console.log(`[deepScrapeForImprovement] トップページ追加: ${homeUrl}`);
    }

    const uniqueUrls = Array.from(urlMap.keys());
    if (uniqueUrls.length === 0) {
      return { success: true, message: 'スクレイピング対象URLなし', results: [] };
    }

    console.log(`[deepScrapeForImprovement] Unique URLs: ${uniqueUrls.length}`);

    // Puppeteer深掘りスクレイピング実行
    const scrapeResults = await deepScrapePages(uniqueUrls);

    // 結果をFirestoreに保存
    const batch = db.batch();
    const savedResults = [];
    let siteDesignData = null; // サイト共通デザインデータ

    for (const result of scrapeResults) {
      if (result.error) {
        console.warn(`[deepScrapeForImprovement] Skipping failed page: ${result.pageUrl}`);
        continue;
      }

      // トップページのデザインデータを記録
      if (homeUrl && (result.pageUrl === homeUrl || result.pageUrl === siteUrl)) {
        siteDesignData = {
          pageUrl: result.pageUrl,
          firstView: result.firstView || null,
          designTokens: result.designTokens || null,
          keyElements: result.keyElements || [],
          sections: result.sections || [],
          forms: result.forms || [],
          scrapedAt: result.scrapedAt,
        };
      }

      // 1. siteStructureData コレクションに保存（AI改善プロンプト用）
      const urlHash = createHash('md5').update(result.pageUrl).digest('hex');
      const structureRef = db.doc(`sites/${siteId}/siteStructureData/${urlHash}`);
      batch.set(structureRef, {
        ...result,
        device: 'pc',
        updatedAt: new Date(),
      }, { merge: true });

      // 2. 関連する改善案ドキュメントに deepScrapeData を追加
      const improvementIds = urlMap.get(result.pageUrl) || [];
      for (const impId of improvementIds) {
        const impRef = db.doc(`sites/${siteId}/improvements/${impId}`);
        batch.update(impRef, {
          deepScrapeData: {
            pageUrl: result.pageUrl,
            firstView: result.firstView || null,
            designTokens: result.designTokens || null,
            keyElements: result.keyElements || [],
            sections: result.sections || [],
            forms: result.forms || [],
            scrapedAt: result.scrapedAt,
          },
          // Before表示用: スクリーンショット
          beforeScreenshot: result.screenshot || '',
          deepScrapedAt: new Date(),
        });
      }

      savedResults.push({
        pageUrl: result.pageUrl,
        improvementIds,
        hasFirstView: !!result.firstView?.headline,
        hasDesignTokens: !!result.designTokens?.fonts,
        sectionsCount: result.sections?.length || 0,
        formsCount: result.forms?.length || 0,
      });
    }

    // サイト共通デザインデータを保存（モックアップ生成のフォールバック用）
    if (siteDesignData) {
      batch.set(db.doc(`sites/${siteId}/siteStructureData/_siteDesign`), {
        ...siteDesignData,
        updatedAt: new Date(),
      }, { merge: true });
      console.log(`[deepScrapeForImprovement] サイト共通デザインデータ保存完了`);
    }

    // deepScrapeDataがない改善案に、サイト共通デザインデータをフォールバック設定
    if (siteDesignData) {
      const allImpIds = improvements.map(imp => imp.id);
      const idsWithData = new Set();
      for (const [, ids] of urlMap) {
        for (const id of ids) idsWithData.add(id);
      }
      for (const impId of allImpIds) {
        if (!idsWithData.has(impId)) {
          const impRef = db.doc(`sites/${siteId}/improvements/${impId}`);
          batch.update(impRef, {
            deepScrapeData: siteDesignData,
            deepScrapedAt: new Date(),
          });
          console.log(`[deepScrapeForImprovement] フォールバックデザイン設定: ${impId}`);
        }
      }
    }

    await batch.commit();

    const duration = Date.now() - startTime;
    console.log(`[deepScrapeForImprovement] Done: ${savedResults.length}/${uniqueUrls.length} pages saved in ${duration}ms`);

    return {
      success: true,
      message: `${savedResults.length}ページの深掘り分析が完了しました`,
      results: savedResults,
      duration,
    };
  } catch (error) {
    console.error('[deepScrapeForImprovement] Error:', error);
    throw new HttpsError('internal', `深掘りスクレイピングに失敗しました: ${error.message}`);
  }
}
