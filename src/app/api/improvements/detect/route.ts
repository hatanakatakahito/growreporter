import { NextRequest, NextResponse } from 'next/server';
import { ImprovementDetectionService } from '@/lib/improvements/detectionService';
import { KPIService } from '@/lib/kpi/kpiService';

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
    const { analyticsData } = body;
    
    if (!analyticsData) {
      return NextResponse.json(
        { error: '分析データが必要です' },
        { status: 400 }
      );
    }
    
    // KPI設定を取得（エラーが発生しても続行）
    let kpiSettings: any[] = [];
    try {
      kpiSettings = await KPIService.getKPISettings(userId);
      console.log('✅ KPI設定取得成功:', kpiSettings.length);
    } catch (kpiError) {
      console.warn('⚠️ KPI設定取得エラー（続行）:', kpiError);
      // エラーが発生してもKPI以外の問題検出は続行
    }
    
    // KPI達成率を計算
    const kpiAchievement: any = {};
    if (kpiSettings && kpiSettings.length > 0 && analyticsData.currentMonth) {
      kpiSettings.forEach(kpi => {
        const currentValue = analyticsData.currentMonth[kpi.metric] || 0;
        const targetValue = parseFloat(kpi.targetValue);
        
        if (targetValue > 0) {
          kpiAchievement[kpi.metric] = {
            current: currentValue,
            target: targetValue,
            achievementRate: currentValue / targetValue
          };
        }
      });
    }
    
    // 検出データを準備
    const detectionData = {
      ...analyticsData,
      kpiSettings,
      kpiAchievement
    };
    
    // 問題を検出
    const issues = await ImprovementDetectionService.detectIssues(userId, detectionData);
    
    return NextResponse.json({
      success: true,
      issues,
      detectedAt: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ 問題検出エラー:', error);
    console.error('❌ エラー詳細:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { 
        error: '問題の検出に失敗しました',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

