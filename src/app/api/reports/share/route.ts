/**
 * 🔗 レポート共有API
 * POST: 共有リンク生成
 * PUT: 共有設定更新
 * DELETE: 共有無効化
 */

import { NextRequest, NextResponse } from 'next/server';
import { SharingService } from '@/lib/analysis/sharingService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, reportId, expiresInDays, password, allowedViewers } = body;
    
    if (!userId || !reportId) {
      return NextResponse.json(
        { error: 'userId and reportId are required' },
        { status: 400 }
      );
    }
    
    const shareUrl = await SharingService.createShareLink(userId, {
      reportId,
      expiresInDays,
      password,
      allowedViewers,
    });
    
    return NextResponse.json({ shareUrl });
    
  } catch (error: any) {
    console.error('❌ 共有リンク生成API エラー:', error);
    return NextResponse.json(
      { error: error.message || '共有リンクの生成に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, reportId, ...updates } = body;
    
    if (!userId || !reportId) {
      return NextResponse.json(
        { error: 'userId and reportId are required' },
        { status: 400 }
      );
    }
    
    await SharingService.updateShareLink(userId, reportId, updates);
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('❌ 共有設定更新API エラー:', error);
    return NextResponse.json(
      { error: error.message || '共有設定の更新に失敗しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const reportId = searchParams.get('reportId');
    
    if (!userId || !reportId) {
      return NextResponse.json(
        { error: 'userId and reportId are required' },
        { status: 400 }
      );
    }
    
    await SharingService.revokeShareLink(userId, reportId);
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('❌ 共有無効化API エラー:', error);
    return NextResponse.json(
      { error: error.message || '共有の無効化に失敗しました' },
      { status: 500 }
    );
  }
}





