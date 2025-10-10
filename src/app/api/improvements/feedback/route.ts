import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, doc, setDoc, getDoc, updateDoc, Timestamp, increment } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { templateId, templateTitle, rating, comment } = body;
    
    if (!templateId || !rating) {
      return NextResponse.json(
        { error: '必要なデータが不足しています' },
        { status: 400 }
      );
    }
    
    // フィードバックを保存
    const feedbackRef = doc(collection(db, 'template_feedback'));
    await setDoc(feedbackRef, {
      templateId,
      userId,
      templateTitle,
      templateVersion: '1.0',
      businessType: 'btob', // TODO: ユーザープロファイルから取得
      siteType: 'corporate', // TODO: ユーザープロファイルから取得
      rating,
      comment: comment || null,
      submittedAt: Timestamp.now()
    });
    
    console.log('✅ フィードバック保存:', feedbackRef.id);
    
    // テンプレートの集計を更新
    await updateTemplateFeedbackSummary(templateId, rating);
    
    return NextResponse.json({
      success: true,
      message: 'フィードバックを受け付けました'
    });
    
  } catch (error) {
    console.error('フィードバック保存エラー:', error);
    return NextResponse.json(
      { error: 'フィードバックの保存に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * テンプレートのフィードバック集計を更新
 */
async function updateTemplateFeedbackSummary(
  templateId: string, 
  rating: 'good' | 'neutral' | 'bad'
): Promise<void> {
  try {
    const templateRef = doc(db, 'improvement_templates', templateId);
    const templateSnap = await getDoc(templateRef);
    
    if (!templateSnap.exists()) {
      console.warn('テンプレートが見つかりません:', templateId);
      return;
    }
    
    const currentSummary = templateSnap.data().feedbackSummary || {
      goodCount: 0,
      neutralCount: 0,
      badCount: 0,
      totalCount: 0,
      score: 50
    };
    
    // カウントを更新
    const updates: any = {
      'feedbackSummary.totalCount': increment(1),
      'feedbackSummary.lastUpdated': Timestamp.now()
    };
    
    if (rating === 'good') {
      updates['feedbackSummary.goodCount'] = increment(1);
    } else if (rating === 'neutral') {
      updates['feedbackSummary.neutralCount'] = increment(1);
    } else if (rating === 'bad') {
      updates['feedbackSummary.badCount'] = increment(1);
    }
    
    await updateDoc(templateRef, updates);
    
    // スコアを再計算（別のトランザクションで）
    const updatedSnap = await getDoc(templateRef);
    if (updatedSnap.exists()) {
      const summary = updatedSnap.data().feedbackSummary;
      const goodCount = summary.goodCount || 0;
      const neutralCount = summary.neutralCount || 0;
      const badCount = summary.badCount || 0;
      const total = goodCount + neutralCount + badCount;
      
      if (total > 0) {
        // スコア計算: good=100点, neutral=50点, bad=0点
        const score = Math.round(
          ((goodCount * 100) + (neutralCount * 50) + (badCount * 0)) / total
        );
        
        await updateDoc(templateRef, {
          'feedbackSummary.score': score
        });
        
        console.log(`✅ テンプレート ${templateId} のスコアを更新: ${score}`);
      }
    }
    
  } catch (error) {
    console.error('フィードバック集計更新エラー:', error);
  }
}

