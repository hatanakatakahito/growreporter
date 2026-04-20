"""
本番 Cloud Function (functions-python/export_excel/builder.py) を直接叩いて
リファイン後デザインを目視確認するためのサンプル生成スクリプト。

レガシーの generate_excel_mock.py と違い、こちらは実際の本番コードを呼ぶため
スタイル変更が即座にここで確認できる。

使い方:
  functions-python/venv/Scripts/python.exe mockups/generate_cf_excel_sample.py
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "functions-python"))

from export_excel.builder import build_excel_workbook  # noqa: E402


def _monthly_rows():
    rows = []
    for i, m in enumerate([
        "2025-05", "2025-06", "2025-07", "2025-08", "2025-09",
        "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04",
    ]):
        base = 8000 + i * 350
        rows.append({
            "label": m, "yearMonth": m, "month": m,
            "sessions": base, "users": int(base * 0.78), "newUsers": int(base * 0.45),
            "pageViews": int(base * 2.3), "engagementRate": 0.62 + (i % 3) * 0.01,
            "conversions": 18 + i, "conversionRate": (18 + i) / base,
            "averageSessionDuration": 120 + i * 5,
        })
    return rows


def _channel_rows():
    return [
        {"channelName": "Organic Search", "sessions": 12500, "users": 9800, "conversions": 145, "engagementRate": 0.71},
        {"channelName": "Direct", "sessions": 7200, "users": 5500, "conversions": 88, "engagementRate": 0.65},
        {"channelName": "Referral", "sessions": 3100, "users": 2200, "conversions": 31, "engagementRate": 0.58},
        {"channelName": "Organic Social", "sessions": 1800, "users": 1500, "conversions": 12, "engagementRate": 0.43},
    ]


def main():
    payload = {
        "siteName": "サンプルサイト株式会社",
        "dateRange": {"from": "2025-04-01", "to": "2026-03-31"},
        "comparisonRange": None,
        "sheets": {
            "monthly": {
                "visibleColumns": [
                    {"key": "label", "label": "月", "format": "string", "required": True},
                    {"key": "sessions", "label": "セッション", "format": "number"},
                    {"key": "users", "label": "ユーザー", "format": "number"},
                    {"key": "pageViews", "label": "PV", "format": "number"},
                    {"key": "engagementRate", "label": "ENG率", "format": "percent"},
                    {"key": "conversions", "label": "CV", "format": "number"},
                ],
                "rows": list(reversed(_monthly_rows())),
            },
            "channels": {
                "visibleColumns": [
                    {"key": "channelName", "label": "チャネル", "format": "string", "required": True},
                    {"key": "sessions", "label": "セッション", "format": "number"},
                    {"key": "users", "label": "ユーザー", "format": "number"},
                    {"key": "conversions", "label": "CV", "format": "number"},
                    {"key": "engagementRate", "label": "ENG率", "format": "percent"},
                ],
                "rows": _channel_rows(),
            },
        },
        "customSheets": {
            "siteUrl": "https://example.com",
            "kpiSettings": {"sessionsTarget": 100000, "usersTarget": 80000, "conversionsTarget": 1500},
            "conversionEvents": [{"eventName": "form_submit"}, {"eventName": "purchase"}],
            "summary": {
                "metrics": {
                    "sessions": 120500, "totalUsers": 92800, "newUsers": 51200,
                    "pageViews": 277000, "engagementRate": 0.68, "conversions": 1245,
                    "clicks": 88500, "impressions": 1450000, "ctr": 0.061, "position": 12.4,
                },
                "conversions": {"form_submit": 980, "purchase": 265},
            },
            "compSummary": None,
            "monthlyDelta": {
                "sessions": {"mom": 0.082, "yoy": 0.155},
                "totalUsers": {"mom": 0.063, "yoy": 0.143},
                "newUsers": {"mom": -0.022, "yoy": 0.090},
                "pageViews": {"mom": 0.111, "yoy": 0.189},
                "engagementRate": {"mom": 0.012, "yoy": -0.030},
                "conversions": {"mom": 0.058, "yoy": 0.205},
            },
            "users": {
                "data": {
                    "newReturning": [
                        {"name": "新規", "value": 51200, "percentage": 55.2},
                        {"name": "リピーター", "value": 41600, "percentage": 44.8},
                    ],
                    "device": [
                        {"name": "Mobile", "value": 60500, "percentage": 65.2},
                        {"name": "Desktop", "value": 27800, "percentage": 30.0},
                        {"name": "Tablet", "value": 4500, "percentage": 4.8},
                    ],
                }
            },
            "conversions": {
                "data": [
                    {"label": "2025-05", "form_submit": 75, "purchase": 18},
                    {"label": "2025-06", "form_submit": 82, "purchase": 21},
                    {"label": "2025-07", "form_submit": 90, "purchase": 24},
                    {"label": "2026-04", "form_submit": 110, "purchase": 32},
                ],
            },
            "improvements": [
                {"order": 1, "title": "LP のヒーロー画像を最適化", "description": "ファーストビューの離脱率改善のため、画像を WebP 化し圧縮。",
                 "category": "design", "priority": "high", "status": "in_progress",
                 "targetPageUrl": "/lp/main", "targetArea": "ヒーロー", "expectedImpact": "離脱率 -10%"},
                {"order": 2, "title": "問い合わせフォーム項目削減", "description": "10 項目 → 5 項目に削減し送信完了率を向上。",
                 "category": "feature", "priority": "medium", "status": "draft",
                 "targetPageUrl": "/contact", "targetArea": "フォーム", "expectedImpact": "送信完了率 +15%"},
            ],
        },
        "aiAnalysis": {
            "analysis/summary": {
                "summary": "対象期間中、セッション数は前年同月比で +15.5% と健全に成長しています。一方でモバイルのエンゲージメント率がやや低下しており、改善余地があります。"
            },
            "analysis/month": {
                "summary": "直近 3 ヶ月で CV 数が顕著に伸びています。2026 年 4 月は前月比 +5.8%。"
            },
        },
        "memos": {},
    }

    out_path = os.path.join(ROOT, "mockups", "cf_sample_output.xlsx")
    buf = io.BytesIO()
    build_excel_workbook(buf, payload)
    with open(out_path, "wb") as f:
        f.write(buf.getvalue())
    print(f"OK: {out_path}  ({len(buf.getvalue()):,} bytes)")


if __name__ == "__main__":
    main()
