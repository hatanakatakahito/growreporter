"""
Excel ワークブック生成のエントリポイント

クライアントから受信する data の形式:
{
  siteName: str,
  dateRange: { from: str, to: str },
  comparisonRange: { from, to } | None,
  sheets: {
    monthly: { visibleColumns, rows, compRows },
    daily: { visibleColumns, rows, compRows },
    ... (12 シート)
  },
  customSheets: {
    cover: { siteUrl, kpiSettings, conversionEvents },
    summary: { ...summaryMetrics },
    users: { ...demographics },
    conversions: { ...conversions },
    reverseFlows: [ ... ]
  },
  aiAnalysis: { 'analysis/month': { summary }, ... },
  memos: { 'analysis/month': [ ... ], ... }
}
"""

import io
from typing import Any

import xlsxwriter

from .helpers import safe_sheet_name
from .sheet_builder import build_dynamic_sheet
from .sheets.cover import create_cover_sheet
from .sheets.summary import create_summary_sheet
from .sheets.users import create_users_sheet
from .sheets.conversions import create_conversions_sheet
from .sheets.reverse_flow import create_reverse_flow_sheet
from .styles import (
    AI_CONTENT_STYLE,
    AI_SECTION_STYLE,
    COVER_LABEL_STYLE,
    COVER_TITLE_STYLE,
    COVER_VALUE_STYLE,
    DATA_CELL_STYLE,
    DECIMAL_CELL_STYLE,
    HEADER_STYLE,
    MEMO_SECTION_STYLE,
    NUMBER_CELL_STYLE,
    PERCENT_CELL_STYLE,
    TEXT_RIGHT_STYLE,
    TOTAL_LABEL_STYLE,
    TOTAL_NUMBER_STYLE,
    TOTAL_TEXT_STYLE,
)


# 動的シート名マッピング (クライアントのキー → Excel シート名 + 比較 join key)
DYNAMIC_SHEETS = [
    ("monthly", "月別", None),
    ("daily", "日別", "date"),
    ("weekly", "曜日別", None),
    ("hourly", "時間帯別", None),
    ("channels", "集客チャネル", "channelName"),
    ("keywords", "流入キーワード", None),
    ("referrals", "被リンク元", "source"),
    ("pages", "ページ別", "path"),
    ("pageCategories", "ページ分類別", None),
    ("landingPages", "ランディングページ", "path"),
    ("fileDownloads", "ファイルDL", None),
    ("externalLinks", "外部リンク", None),
]


# クライアントの sheet キー → AI / memos のキー
SHEET_TO_AI_KEY = {
    "monthly": "analysis/month",
    "daily": "analysis/day",
    "weekly": "analysis/week",
    "hourly": "analysis/hour",
    "channels": "analysis/channels",
    "keywords": "analysis/keywords",
    "referrals": "analysis/referrals",
    "pages": "analysis/pages",
    "pageCategories": "analysis/page-categories",
    "landingPages": "analysis/landing-pages",
    "fileDownloads": "analysis/file-downloads",
    "externalLinks": "analysis/external-links",
}


def build_excel_workbook(buffer: io.BytesIO, data: dict[str, Any]) -> None:
    """受信データから Excel ワークブックを buffer に書き出す。"""
    workbook = xlsxwriter.Workbook(buffer, {"in_memory": True})

    # フォーマット辞書 (全シートで共有)
    formats = _create_formats(workbook)

    site_name = data.get("siteName") or "GrowReporter"
    date_range = data.get("dateRange") or {}
    comparison_range = data.get("comparisonRange")

    sheets_data = data.get("sheets") or {}
    custom = data.get("customSheets") or {}
    ai_analysis = data.get("aiAnalysis") or {}
    memos = data.get("memos") or {}

    # ─── 1. レポート概要 (表紙) ───────────────────────────
    create_cover_sheet(
        workbook,
        site_name=site_name,
        site_url=custom.get("siteUrl") or "",
        date_range=date_range,
        comp_date_range=comparison_range,
        formats=formats,
    )

    # ─── 2. 全体サマリー ─────────────────────────────────
    if custom.get("summary"):
        create_summary_sheet(
            workbook,
            summary_metrics=custom["summary"],
            comp_summary_metrics=custom.get("compSummary"),
            kpi_settings=custom.get("kpiSettings"),
            ai_data=ai_analysis.get("analysis/summary"),
            memos=memos.get("analysis/summary"),
            formats=formats,
        )

    # ─── 3〜14. 動的カラム系シート ─────────────────────────
    for key, sheet_name, join_key in DYNAMIC_SHEETS:
        sheet_payload = sheets_data.get(key)
        if not sheet_payload:
            continue

        visible_cols = sheet_payload.get("visibleColumns") or []
        rows = sheet_payload.get("rows") or []
        comp_rows = sheet_payload.get("compRows")

        if not rows:
            continue

        ai_key = SHEET_TO_AI_KEY.get(key)
        ai = ai_analysis.get(ai_key) if ai_key else None
        mm = memos.get(ai_key) if ai_key else None

        # ユーザー属性シートの直前に 4. ユーザー属性を挟む
        if key == "hourly" and custom.get("users"):
            # 月別・日別・曜日別・時間帯別 の後 (2→3→4→5→6) にユーザー属性
            pass

        build_dynamic_sheet(
            workbook,
            sheet_name=safe_sheet_name(sheet_name),
            visible_columns=visible_cols,
            rows=rows,
            comp_rows=comp_rows,
            comp_join_key=join_key,
            ai_data=ai,
            memos=mm,
            formats=formats,
            chart_key=key,
        )

    # ─── 4. ユーザー属性 (カスタムレイアウト) ───────────────
    # Phase 2/3 では動的シートの後に挿入
    if custom.get("users"):
        create_users_sheet(
            workbook,
            demographics=custom["users"],
            ai_data=ai_analysis.get("analysis/users"),
            memos=memos.get("analysis/users"),
            formats=formats,
        )

    # ─── 16. コンバージョン一覧 ────────────────────────────
    if custom.get("conversions"):
        create_conversions_sheet(
            workbook,
            conversions=custom["conversions"],
            conversion_events=custom.get("conversionEvents") or [],
            ai_data=ai_analysis.get("analysis/conversions"),
            memos=memos.get("analysis/conversions"),
            formats=formats,
        )

    # ─── 17. 逆算フロー ─────────────────────────────────
    reverse_flows = custom.get("reverseFlows")
    if reverse_flows:
        create_reverse_flow_sheet(
            workbook,
            reverse_flows=reverse_flows,
            ai_data=ai_analysis.get("analysis/reverse-flow"),
            memos=memos.get("analysis/reverse-flow"),
            formats=formats,
        )

    workbook.close()


def _create_formats(workbook) -> dict:
    """ワークブックに全スタイルのフォーマットを登録して辞書で返す。"""
    return {
        "header": workbook.add_format(HEADER_STYLE),
        "data": workbook.add_format(DATA_CELL_STYLE),
        "number": workbook.add_format(NUMBER_CELL_STYLE),
        "decimal": workbook.add_format(DECIMAL_CELL_STYLE),
        "percent": workbook.add_format(PERCENT_CELL_STYLE),
        "text_right": workbook.add_format(TEXT_RIGHT_STYLE),
        "total_label": workbook.add_format(TOTAL_LABEL_STYLE),
        "total_number": workbook.add_format(TOTAL_NUMBER_STYLE),
        "total_text": workbook.add_format(TOTAL_TEXT_STYLE),
        "ai_header": workbook.add_format(AI_SECTION_STYLE),
        "ai_content": workbook.add_format(AI_CONTENT_STYLE),
        "memo_header": workbook.add_format(MEMO_SECTION_STYLE),
        "memo_content": workbook.add_format(AI_CONTENT_STYLE),  # メモ本文は AI と同スタイル
        "cover_title": workbook.add_format(COVER_TITLE_STYLE),
        "cover_label": workbook.add_format(COVER_LABEL_STYLE),
        "cover_value": workbook.add_format(COVER_VALUE_STYLE),
    }
