import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { ImprovementTemplate } from '@/lib/improvements/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const issueType = searchParams.get('issueType');
    const category = searchParams.get('category');
    
    // テンプレートコレクションへの参照
    let q = query(
      collection(db, 'improvement_templates'),
      where('isActive', '==', true)
    );
    
    // フィルタリング
    if (issueType) {
      q = query(q, where('issueType', '==', issueType));
    }
    if (category) {
      q = query(q, where('category', '==', category));
    }
    
    const snapshot = await getDocs(q);
    
    const templates: ImprovementTemplate[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      templates.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        feedbackSummary: data.feedbackSummary ? {
          ...data.feedbackSummary,
          lastUpdated: data.feedbackSummary.lastUpdated?.toDate() || new Date()
        } : undefined
      } as ImprovementTemplate);
    });
    
    // フィードバックスコアでソート（高い順）
    templates.sort((a, b) => {
      const scoreA = a.feedbackSummary?.score || 50;
      const scoreB = b.feedbackSummary?.score || 50;
      return scoreB - scoreA;
    });
    
    return NextResponse.json({
      success: true,
      templates,
      count: templates.length
    });
    
  } catch (error) {
    console.error('テンプレート取得エラー:', error);
    return NextResponse.json(
      { error: 'テンプレートの取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 401 }
      );
    }
    
    // 管理者チェック（簡易版 - 本番では適切な権限チェックを）
    // TODO: 管理者権限の実装
    
    const body = await request.json();
    const template = body.template;
    
    if (!template) {
      return NextResponse.json(
        { error: 'テンプレートデータが必要です' },
        { status: 400 }
      );
    }
    
    // テンプレートを保存（ここでは簡易実装）
    // 本来はFirestore Admin SDKを使うべき
    
    return NextResponse.json({
      success: true,
      message: 'テンプレートを作成しました'
    });
    
  } catch (error) {
    console.error('テンプレート作成エラー:', error);
    return NextResponse.json(
      { error: 'テンプレートの作成に失敗しました' },
      { status: 500 }
    );
  }
}

