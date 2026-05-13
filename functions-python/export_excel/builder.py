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
import re
import zipfile
from typing import Any

import xlsxwriter

from shared.metrics import label_of

from .helpers import safe_sheet_name
from .sheet_builder import build_dynamic_sheet
from .sheets.cover import create_cover_sheet
from .sheets.summary import create_summary_sheet
from .sheets.users import create_users_sheet
from .sheets.conversions import create_conversions_sheet
from .sheets.improvements import create_improvements_sheet
from .sheets.reverse_flow import create_reverse_flow_sheet
from .sheets.user_journey import create_user_journey_sheet
from .sheets.keywords_funnel import create_keywords_funnel_sheet
from .styles import (
    AI_CONTENT_STYLE,
    AI_PLACEHOLDER_STYLE,
    AI_SECTION_STYLE,
    COVER_BRAND_STYLE,
    COVER_LABEL_STYLE,
    COVER_SUBTITLE_STYLE,
    COVER_TITLE_STYLE,
    COVER_VALUE_STYLE,
    DATA_CELL_ALT_STYLE,
    DATA_CELL_STYLE,
    DECIMAL_CELL_ALT_STYLE,
    DECIMAL_CELL_STYLE,
    FOOTER_TEXT,
    HEADER_STYLE,
    KPI_HEADER_STYLE,
    KPI_LABEL_STYLE,
    KPI_NUM_STYLE,
    MEMO_SECTION_STYLE,
    NUMBER_CELL_ALT_STYLE,
    NUMBER_CELL_STYLE,
    PERCENT_CELL_STYLE,
    SECTION_MARKER_STYLE,
    SHEET_TITLE_NAME_STYLE,
    SHEET_TITLE_SUBTITLE_STYLE,
    TEXT_RIGHT_ALT_STYLE,
    TEXT_RIGHT_STYLE,
    TOC_DESC_STYLE,
    TOC_HEADER_STYLE,
    TOC_NAME_STYLE,
    TOC_NUM_HEADER_STYLE,
    TOC_NUM_STYLE,
    TOC_SECTION_TITLE_STYLE,
    TOTAL_LABEL_STYLE,
    TOTAL_NUMBER_STYLE,
    TOTAL_TEXT_STYLE,
)


# 動的シート名マッピング (クライアントのキー → Excel シート名 + 比較 join key)
# ナビ順: 時系列 → 集客 (channels のみ／流入KWファネルは custom 経由) → ページ
# 旧 "流入キーワード" Top20 は "流入KWファネル"（custom）が代替するため削除
DYNAMIC_SHEETS = [
    # ── 時系列 ──
    ("monthly", "月別", None),
    ("daily", "日別", "date"),
    ("weekly", "曜日別", None),
    ("hourly", "時間帯別", None),
    # ── 集客（流入KWファネルは custom で別ハンドリング） ──
    ("channels", "集客チャネル", "channelName"),
    ("referrals", "参照元サイト", "source"),
    # ── ページ ──
    ("pages", "ページ別", "path"),
    ("pageCategories", "ページ分類別", None),
    ("landingPages", "入口ページ", "path"),
    ("fileDownloads", "資料ダウンロード", None),
    ("externalLinks", "外部リンククリック", None),
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

    site_name = data.get("siteName") or "グローレポータ"
    date_range = data.get("dateRange") or {}
    comparison_range = data.get("comparisonRange")

    sheets_data = data.get("sheets") or {}
    custom = data.get("customSheets") or {}
    ai_analysis = data.get("aiAnalysis") or {}
    memos = data.get("memos") or {}

    # ─── 1. 表紙を先に作成（目次のため） ──────────────────
    # 実際にデータがあるシートを列挙して目次に載せる
    available = _compute_available_sheets(custom, sheets_data)
    kpi_cards = _compute_kpi_cards(custom)

    create_cover_sheet(
        workbook,
        site_name=site_name,
        site_url=custom.get("siteUrl") or "",
        date_range=date_range,
        comp_date_range=comparison_range,
        formats=formats,
        kpi_cards=kpi_cards,
        available_sheets=available,
    )

    # サブタイトル文字列（全シートで共通）
    sheet_subtitle = _make_sheet_subtitle(date_range, comparison_range)

    # ナビ順 (アプリと完全一致):
    #  分析する: 全体サマリー → ユーザー属性
    #  時系列:   月別 → 日別 → 曜日別 → 時間帯別
    #  集客:     集客チャネル → 流入キーワード元(=流入KWファネル) → 被リンク元
    #  ページ:   ページ別 → ページ分類別 → ランディングページ → ファイルダウンロード →
    #           外部リンククリック → ユーザージャーニー
    #  コンバージョン: コンバージョン一覧 → 逆算フロー
    #  その他:   改善提案

    def _build_dynamic(key: str):
        sheet_payload = sheets_data.get(key)
        if not sheet_payload:
            return
        rows = sheet_payload.get("rows") or []
        if not rows:
            return
        # DYNAMIC_SHEETS から sheet_name と join_key を引く
        spec = next(((k, n, j) for k, n, j in DYNAMIC_SHEETS if k == key), None)
        if spec is None:
            return
        _, sheet_name, join_key = spec
        ai_key = SHEET_TO_AI_KEY.get(key)
        build_dynamic_sheet(
            workbook,
            sheet_name=safe_sheet_name(sheet_name),
            visible_columns=sheet_payload.get("visibleColumns") or [],
            rows=rows,
            comp_rows=sheet_payload.get("compRows"),
            comp_join_key=join_key,
            ai_data=ai_analysis.get(ai_key) if ai_key else None,
            memos=memos.get(ai_key) if ai_key else None,
            formats=formats,
            chart_key=key,
            sheet_subtitle=sheet_subtitle,
        )

    # ── 分析する ──
    if custom.get("summary"):
        create_summary_sheet(
            workbook,
            summary_metrics=custom["summary"],
            comp_summary_metrics=custom.get("compSummary"),
            kpi_settings=custom.get("kpiSettings"),
            ai_data=ai_analysis.get("analysis/summary"),
            memos=memos.get("analysis/summary"),
            formats=formats,
            sheet_subtitle=sheet_subtitle,
            monthly_delta=custom.get("monthlyDelta"),
        )
    if custom.get("users"):
        create_users_sheet(
            workbook,
            demographics=custom["users"],
            ai_data=ai_analysis.get("analysis/users"),
            memos=memos.get("analysis/users"),
            formats=formats,
            sheet_subtitle=sheet_subtitle,
        )

    # ── 時系列 ──
    for k in ("monthly", "daily", "weekly", "hourly"):
        _build_dynamic(k)

    # ── 集客 ──
    _build_dynamic("channels")
    keywords_v2 = custom.get("keywordsFunnel")
    if keywords_v2 and (keywords_v2.get("funnel") or keywords_v2.get("keywords")):
        create_keywords_funnel_sheet(
            workbook,
            keywords_v2=keywords_v2,
            ai_data=ai_analysis.get("analysis/keywords"),
            memos=memos.get("analysis/keywords"),
            formats=formats,
            sheet_subtitle=sheet_subtitle,
        )
    _build_dynamic("referrals")

    # ── ページ ──
    for k in ("pages", "pageCategories", "landingPages", "fileDownloads", "externalLinks"):
        _build_dynamic(k)
    user_journey = custom.get("userJourney")
    if user_journey and user_journey.get("nodes"):
        create_user_journey_sheet(
            workbook,
            user_journey=user_journey,
            ai_data=ai_analysis.get("analysis/user-journey"),
            memos=memos.get("analysis/user-journey"),
            formats=formats,
            sheet_subtitle=sheet_subtitle,
        )

    # ── コンバージョン ──
    if custom.get("conversions"):
        create_conversions_sheet(
            workbook,
            conversions=custom["conversions"],
            conversion_events=custom.get("conversionEvents") or [],
            ai_data=ai_analysis.get("analysis/conversions"),
            memos=memos.get("analysis/conversions"),
            formats=formats,
            sheet_subtitle=sheet_subtitle,
        )
    reverse_flows = custom.get("reverseFlows")
    if reverse_flows:
        create_reverse_flow_sheet(
            workbook,
            reverse_flows=reverse_flows,
            ai_data=ai_analysis.get("analysis/reverse-flow"),
            memos=memos.get("analysis/reverse-flow"),
            formats=formats,
            sheet_subtitle=sheet_subtitle,
        )

    # ── その他 ──
    improvements = custom.get("improvements")
    if improvements and len(improvements) > 0:
        create_improvements_sheet(workbook, improvements, formats, sheet_subtitle=sheet_subtitle)

    workbook.close()

    # XML ポスト処理: テキストボックスを oneCellAnchor + 明示 ext に変換
    # → Excel の列幅変更で AI セクションがリサイズされない (固定 18.3 cm を保証)
    _convert_textboxes_to_oneCellAnchor(buffer)


# ─── XML ポスト処理 ─────────────────────────────────
# xlsxwriter は埋め込み shape を twoCellAnchor で出力するが、Excel は cell range で
# サイズを再計算してしまう。oneCellAnchor + 明示 ext に書き換えて固定サイズを保証する。

_TEXTBOX_ANCHOR_PATTERN = re.compile(
    r'<xdr:twoCellAnchor[^>]*>'
    r'(\s*<xdr:from>.*?</xdr:from>)'
    r'\s*<xdr:to>.*?</xdr:to>'
    r'(.*?)'
    r'</xdr:twoCellAnchor>',
    re.DOTALL,
)
_SHAPE_EXT_PATTERN = re.compile(r'<a:ext cx="(\d+)" cy="(\d+)"')


def _convert_textboxes_to_oneCellAnchor(buf: io.BytesIO) -> None:
    """xl/drawings/drawing*.xml 内の text box (xdr:sp) を oneCellAnchor へ変換。
    チャート (xdr:graphicFrame) は touch しない。"""
    buf.seek(0)
    in_data = buf.getvalue()

    out_buf = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(in_data), "r") as zin:
        with zipfile.ZipFile(out_buf, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename.startswith("xl/drawings/drawing") and item.filename.endswith(".xml"):
                    try:
                        modified = _convert_textbox_anchors(data.decode("utf-8"))
                        data = modified.encode("utf-8")
                    except Exception:
                        pass  # 失敗時は元の XML をそのまま出力
                zout.writestr(item, data)

    buf.seek(0)
    buf.truncate()
    buf.write(out_buf.getvalue())


def _convert_textbox_anchors(xml: str) -> str:
    """drawing XML 内のテキストボックスの twoCellAnchor → oneCellAnchor 変換。"""
    def replacer(m: re.Match) -> str:
        block = m.group(0)
        # チャート (graphicFrame) は変換しない — twoCellAnchor のままにする
        if "<xdr:sp " not in block:
            return block

        from_block = m.group(1)
        rest = m.group(2)

        # シェイプの spPr/xfrm/ext から実サイズを取得
        ext_m = _SHAPE_EXT_PATTERN.search(rest)
        if not ext_m:
            return block
        cx, cy = ext_m.group(1), ext_m.group(2)

        return (
            f"<xdr:oneCellAnchor>{from_block}"
            f"<xdr:ext cx=\"{cx}\" cy=\"{cy}\"/>{rest}"
            f"</xdr:oneCellAnchor>"
        )

    return _TEXTBOX_ANCHOR_PATTERN.sub(replacer, xml)


def _make_sheet_subtitle(date_range: dict | None, comp_range: dict | None = None) -> str:
    """シートタイトルバーの 2 行目（サブタイトル）を生成。"""
    parts = []
    if date_range and date_range.get("from") and date_range.get("to"):
        parts.append(f"{date_range['from']} 〜 {date_range['to']}")
    if comp_range and comp_range.get("from") and comp_range.get("to"):
        parts.append(f"比較: {comp_range['from']} 〜 {comp_range['to']}")
    return "  /  ".join(parts) if parts else ""


def _compute_available_sheets(custom: dict, sheets_data: dict) -> list[str]:
    """実際にデータが存在するシート名を列挙（目次に載せる順 = ナビ順）。"""
    names = []
    # 分析する
    if custom.get("summary"):
        names.append("全体サマリー")
    if custom.get("users"):
        names.append("ユーザー属性")
    # 時系列
    for key, label in (
        ("monthly", "月別"),
        ("daily", "日別"),
        ("weekly", "曜日別"),
        ("hourly", "時間帯別"),
    ):
        s = sheets_data.get(key)
        if s and s.get("rows"):
            names.append(label)
    # 集客
    s = sheets_data.get("channels")
    if s and s.get("rows"):
        names.append("集客チャネル")
    kw_v2 = custom.get("keywordsFunnel")
    if kw_v2 and (kw_v2.get("funnel") or kw_v2.get("keywords")):
        names.append("検索キーワード")
    s = sheets_data.get("referrals")
    if s and s.get("rows"):
        names.append("参照元サイト")
    # ページ
    for key, label in (
        ("pages", "ページ別"),
        ("pageCategories", "ページ分類別"),
        ("landingPages", "入口ページ"),
        ("fileDownloads", "資料ダウンロード"),
        ("externalLinks", "外部リンククリック"),
    ):
        s = sheets_data.get(key)
        if s and s.get("rows"):
            names.append(label)
    if custom.get("userJourney") and custom["userJourney"].get("nodes"):
        names.append("ユーザージャーニー")
    # コンバージョン
    if custom.get("conversions"):
        names.append("コンバージョン一覧")
    if custom.get("reverseFlows"):
        names.append("成果までの到達ステップ")
    # その他
    if custom.get("improvements"):
        names.append("改善提案")
    return names


def _compute_kpi_cards(custom: dict) -> list[tuple[str, str]]:
    """表紙の主要指標カード 4 件を返す。"""
    metrics = (custom.get("summary") or {}).get("metrics") or {}
    sessions = metrics.get("sessions") or 0
    conversions = metrics.get("conversions") or 0
    clicks = metrics.get("clicks") or 0  # GSC クリック

    def fmt_int(v):
        try:
            return f"{int(v):,}"
        except (ValueError, TypeError):
            return "-"

    def fmt_count(v):
        try:
            return f"{int(v):,}件"
        except (ValueError, TypeError):
            return "-"

    cvr = (conversions / sessions * 100) if sessions else 0
    cvr_str = f"{cvr:.2f}%"

    cards = [
        (fmt_int(sessions), label_of("sessions")),
        (fmt_count(conversions), label_of("conversions")),
        (fmt_int(clicks), label_of("clicks")),
        (cvr_str, label_of("conversionRate")),
    ]
    return cards


def _create_formats(workbook) -> dict:
    """ワークブックに全スタイルのフォーマットを登録して辞書で返す。"""
    return {
        "header": workbook.add_format(HEADER_STYLE),
        "data": workbook.add_format(DATA_CELL_STYLE),
        "data_alt": workbook.add_format(DATA_CELL_ALT_STYLE),
        "number": workbook.add_format(NUMBER_CELL_STYLE),
        "number_alt": workbook.add_format(NUMBER_CELL_ALT_STYLE),
        "decimal": workbook.add_format(DECIMAL_CELL_STYLE),
        "decimal_alt": workbook.add_format(DECIMAL_CELL_ALT_STYLE),
        "percent": workbook.add_format(PERCENT_CELL_STYLE),
        "text_right": workbook.add_format(TEXT_RIGHT_STYLE),
        "text_right_alt": workbook.add_format(TEXT_RIGHT_ALT_STYLE),
        "total_label": workbook.add_format(TOTAL_LABEL_STYLE),
        "total_number": workbook.add_format(TOTAL_NUMBER_STYLE),
        "total_text": workbook.add_format(TOTAL_TEXT_STYLE),
        "ai_header": workbook.add_format(AI_SECTION_STYLE),
        "ai_content": workbook.add_format(AI_CONTENT_STYLE),
        "ai_placeholder": workbook.add_format(AI_PLACEHOLDER_STYLE),
        "memo_header": workbook.add_format(MEMO_SECTION_STYLE),
        "memo_content": workbook.add_format(AI_CONTENT_STYLE),
        # シートタイトルバー
        "sheet_title_name": workbook.add_format(SHEET_TITLE_NAME_STYLE),
        "sheet_title_subtitle": workbook.add_format(SHEET_TITLE_SUBTITLE_STYLE),
        "section_marker": workbook.add_format(SECTION_MARKER_STYLE),
        # 表紙
        "cover_title": workbook.add_format(COVER_TITLE_STYLE),
        "cover_subtitle": workbook.add_format(COVER_SUBTITLE_STYLE),
        "cover_label": workbook.add_format(COVER_LABEL_STYLE),
        "cover_value": workbook.add_format(COVER_VALUE_STYLE),
        "cover_brand": workbook.add_format(COVER_BRAND_STYLE),
        # 主要指標カード
        "kpi_header": workbook.add_format(KPI_HEADER_STYLE),
        "kpi_num": workbook.add_format(KPI_NUM_STYLE),
        "kpi_label": workbook.add_format(KPI_LABEL_STYLE),
        # 目次
        "toc_section_title": workbook.add_format(TOC_SECTION_TITLE_STYLE),
        "toc_num_header": workbook.add_format(TOC_NUM_HEADER_STYLE),
        "toc_header": workbook.add_format(TOC_HEADER_STYLE),
        "toc_num": workbook.add_format(TOC_NUM_STYLE),
        "toc_name": workbook.add_format(TOC_NAME_STYLE),
        "toc_desc": workbook.add_format(TOC_DESC_STYLE),
    }
