/**
 * AIチャット Callable Function
 *
 * サイトの全データ（GA4/GSC/スクレイピング）をコンテキストに、
 * Gemini 2.5 Flash-Liteでマルチターン対話を提供する。
 *
 * - 初回: fetchComprehensiveDataForImprovement で全データ取得→システムプロンプト構築
 * - 2回目以降: Firestoreから会話履歴取得→コンテキストに追加
 * - ファイル添付: 画像/PDF→Gemini直接、Excel/CSV/PPTX/DOCX→テキスト変換
 * - グラフJSON・改善提案フォーマットの検出
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';
import { canEditSite } from '../utils/permissionHelper.js';

const MAX_RETRIES = 2;
const MAX_FILES_PER_TURN = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'xlsx', 'csv', 'pptx', 'docx'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const GEMINI_DIRECT_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];

/**
 * メインハンドラ
 */
export async function aiChatCallable(req) {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'ユーザー認証が必要です');
  }

  const userId = req.auth.uid;
  const { siteId, sessionId, message, attachments = [] } = req.data;

  if (!siteId) throw new HttpsError('invalid-argument', 'siteIdが必要です');
  if (!message?.trim()) throw new HttpsError('invalid-argument', 'メッセージが必要です');

  // 権限チェック
  const canEdit = await canEditSite(userId, siteId);
  if (!canEdit) throw new HttpsError('permission-denied', 'このサイトへのアクセス権がありません');

  const db = getFirestore();

  // プラン制限チェック
  const { checkCanGenerate, incrementGenerationCount } = await import('../utils/planManager.js');
  const canChat = await checkCanGenerate(userId, 'chat');
  if (!canChat) {
    throw new HttpsError('resource-exhausted', '今月のAIチャット回数の上限に達しました。プランをアップグレードしてください。');
  }

  // ファイルバリデーション
  if (attachments.length > MAX_FILES_PER_TURN) {
    throw new HttpsError('invalid-argument', `添付ファイルは1回あたり最大${MAX_FILES_PER_TURN}件までです`);
  }

  try {
    // セッション取得 or 新規作成
    let session;
    let sessionRef;
    let isNewSession = false;

    if (sessionId) {
      sessionRef = db.collection('sites').doc(siteId).collection('chatSessions').doc(sessionId);
      const sessionDoc = await sessionRef.get();
      if (!sessionDoc.exists) throw new HttpsError('not-found', 'チャットセッションが見つかりません');
      session = sessionDoc.data();

      // 共有セッションか本人のセッションかチェック
      if (session.userId !== userId && !session.isShared) {
        throw new HttpsError('permission-denied', 'このチャットセッションへのアクセス権がありません');
      }
    } else {
      // 新規セッション作成
      sessionRef = db.collection('sites').doc(siteId).collection('chatSessions').doc();
      isNewSession = true;
    }

    // サイトデータの取得（初回のみ or キャッシュ利用）
    let siteDataContext = '';
    if (isNewSession || !session?.dataSnapshot) {
      const { fetchComprehensiveDataForImprovement } = await import('../utils/serverComprehensiveDataFetcher.js');
      const { getChatSystemPrompt } = await import('../prompts/templates.js');
      const comprehensiveData = await fetchComprehensiveDataForImprovement(siteId);

      // サイト情報取得
      const siteDoc = await db.collection('sites').doc(siteId).get();
      const siteData = siteDoc.data();

      siteDataContext = getChatSystemPrompt(comprehensiveData, siteData);
    } else if (session?.systemContext) {
      siteDataContext = session.systemContext;
    }

    // 会話履歴の構築
    const contents = [];

    // システムプロンプト（初回のみデータ含む）
    if (isNewSession) {
      contents.push({
        role: 'user',
        parts: [{ text: siteDataContext }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'サイトのデータを確認しました。何でもお聞きください。分析データに基づいて回答します。' }],
      });
    } else {
      // 既存セッションのシステムコンテキストを復元
      if (session.systemContext) {
        contents.push({
          role: 'user',
          parts: [{ text: session.systemContext }],
        });
        contents.push({
          role: 'model',
          parts: [{ text: 'サイトのデータを確認しました。何でもお聞きください。分析データに基づいて回答します。' }],
        });
      }

      // 過去の会話履歴を追加
      if (session.messages?.length > 0) {
        for (const msg of session.messages) {
          contents.push({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.text }],
          });
        }
      }
    }

    // 添付ファイルの処理
    const processedAttachments = [];
    const userParts = [];

    for (const attachment of attachments) {
      const ext = (attachment.name || '').split('.').pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new HttpsError('invalid-argument', `未対応のファイル形式です: .${ext}`);
      }

      if (attachment.size > MAX_FILE_SIZE) {
        throw new HttpsError('invalid-argument', `ファイルサイズが上限（20MB）を超えています: ${attachment.name}`);
      }

      // Cloud Storageに保存
      const bucket = getStorage().bucket();
      const storagePath = `chat-attachments/${siteId}/${sessionRef.id}/${Date.now()}_${attachment.name}`;
      const fileBuffer = Buffer.from(attachment.data, 'base64');
      await bucket.file(storagePath).save(fileBuffer);

      const storageUrl = `gs://${bucket.name}/${storagePath}`;

      processedAttachments.push({
        name: attachment.name,
        type: attachment.contentType || `application/${ext}`,
        size: attachment.size,
        storageUrl,
      });

      // Gemini送信用のパーツ作成
      if (GEMINI_DIRECT_EXTENSIONS.includes(ext)) {
        // 画像/PDFはGeminiに直接送信
        const mimeType = IMAGE_EXTENSIONS.includes(ext)
          ? `image/${ext === 'jpg' ? 'jpeg' : ext}`
          : 'application/pdf';
        userParts.push({
          inline_data: {
            mime_type: mimeType,
            data: attachment.data, // base64
          },
        });
      } else {
        // Excel/CSV/PPTX/DOCXはテキスト抽出
        const extractedText = await extractTextFromFile(fileBuffer, ext, attachment.name);
        userParts.push({ text: `\n\n【添付ファイル: ${attachment.name}】\n${extractedText}` });
      }
    }

    // ユーザーメッセージを追加
    userParts.push({ text: message });
    contents.push({ role: 'user', parts: userParts });

    // Gemini API呼び出し（リトライ付き）
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    let aiResponse = null;
    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
              },
            }),
          }
        );

        const data = await response.json();
        aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (aiResponse) break;
        lastError = new Error('Empty response from Gemini');
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
        }
      }
    }

    if (!aiResponse) {
      throw new HttpsError('internal', `AIの回答生成に失敗しました: ${lastError?.message}`);
    }

    // グラフJSON・改善提案フォーマットの検出
    const { chartData, improvementData, cleanText } = parseAIResponse(aiResponse);

    // ユーザーメッセージとAI回答をFirestoreに保存
    const userMessage = {
      role: 'user',
      text: message,
      attachments: processedAttachments,
      timestamp: new Date().toISOString(),
    };
    const modelMessage = {
      role: 'model',
      text: cleanText,
      chartData: chartData || null,
      improvementData: improvementData || null,
      attachments: [],
      timestamp: new Date().toISOString(),
    };

    if (isNewSession) {
      await sessionRef.set({
        title: generateSessionTitle(message),
        userId,
        isShared: false,
        isArchived: false,
        isEnded: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        turnCount: 1,
        systemContext: siteDataContext,
        dataSnapshot: {
          fetchedAt: new Date().toISOString(),
        },
        messages: [userMessage, modelMessage],
      });
    } else {
      await sessionRef.update({
        updatedAt: FieldValue.serverTimestamp(),
        turnCount: FieldValue.increment(1),
        messages: FieldValue.arrayUnion(userMessage, modelMessage),
      });
    }

    // プラン回数消費
    await incrementGenerationCount(userId, 'chat');

    logger.info('[aiChat] 回答生成完了', { siteId, sessionId: sessionRef.id, isNewSession });

    return {
      success: true,
      sessionId: sessionRef.id,
      message: {
        text: cleanText,
        chartData: chartData || null,
        improvementData: improvementData || null,
      },
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('[aiChat] エラー:', error);
    throw new HttpsError('internal', `チャットエラー: ${error.message}`);
  }
}

/**
 * AIの回答からグラフJSON・改善提案を検出
 */
function parseAIResponse(text) {
  let chartData = null;
  let improvementData = null;
  let cleanText = text;

  // グラフJSON検出: :::chart ... ::: ブロック
  const chartMatch = text.match(/:::chart\s*\n([\s\S]*?)\n:::/);
  if (chartMatch) {
    try {
      chartData = JSON.parse(chartMatch[1]);
      cleanText = cleanText.replace(chartMatch[0], '').trim();
    } catch (e) {
      // JSON解析失敗時はテキストのまま
    }
  }

  // 改善提案フォーマット検出
  const improvementMatch = text.match(/:::improvement\s*\n([\s\S]*?)\n:::/);
  if (improvementMatch) {
    try {
      improvementData = JSON.parse(improvementMatch[1]);
      cleanText = cleanText.replace(improvementMatch[0], '').trim();
    } catch (e) {
      // JSON解析失敗時はテキストのまま
    }
  }

  return { chartData, improvementData, cleanText };
}

/**
 * Excel/CSV/PPTX/DOCXからテキスト抽出
 */
async function extractTextFromFile(buffer, ext, filename) {
  try {
    if (ext === 'csv') {
      return buffer.toString('utf-8').substring(0, 10000);
    }

    if (ext === 'xlsx') {
      // xlsx-js-styleが既にインストール済み
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let text = '';
      for (const sheetName of workbook.SheetNames.slice(0, 5)) {
        const sheet = workbook.Sheets[sheetName];
        text += `【シート: ${sheetName}】\n`;
        text += XLSX.utils.sheet_to_csv(sheet).substring(0, 5000);
        text += '\n\n';
      }
      return text.substring(0, 10000);
    }

    if (ext === 'docx') {
      // docxをzip解凍してXMLからテキスト抽出（簡易実装）
      const text = buffer.toString('utf-8');
      const cleaned = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return cleaned.substring(0, 10000) || `[${filename}の内容を読み取れませんでした]`;
    }

    if (ext === 'pptx') {
      // pptxもzip内のXMLからテキスト抽出（簡易実装）
      const text = buffer.toString('utf-8');
      const cleaned = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return cleaned.substring(0, 10000) || `[${filename}の内容を読み取れませんでした]`;
    }

    return `[${filename}の内容]`;
  } catch (e) {
    logger.warn('[aiChat] ファイルテキスト抽出エラー:', { filename, ext, error: e.message });
    return `[${filename}の内容を読み取れませんでした]`;
  }
}

/**
 * 最初のメッセージからセッションタイトルを自動生成
 */
function generateSessionTitle(message) {
  // 30文字以内に切り詰め
  const cleaned = (message || '').trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  if (cleaned.length <= 30) return cleaned;
  return cleaned.substring(0, 30) + '…';
}
