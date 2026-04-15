"""
PPTX プレゼンテーション生成 (python-pptx)

Phase 1 では最小限のプレースホルダ実装。
Phase 6 で全スライドを本実装に置き換える。
"""

import io
from typing import Any

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE
from pptx.dml.color import RGBColor


def build_pptx_presentation(buffer: io.BytesIO, data: dict[str, Any]) -> None:
    """受信データから PPTX を生成して buffer に書き出す。"""
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    site_name = data.get("siteName") or "GrowReporter"
    date_range = data.get("dateRange") or {}

    # 表紙スライド
    _add_cover_slide(prs, site_name, date_range)

    # 全体サマリースライド (KPI + チャート)
    custom = data.get("customSheets") or {}
    if custom.get("summary"):
        _add_summary_slide(prs, custom["summary"], custom.get("compSummary"))

    # 動的シートごとにタイトル + チャートスライド
    sheets_data = data.get("sheets") or {}
    sheet_meta = [
        ("monthly", "月別推移"),
        ("daily", "日別推移"),
        ("weekly", "曜日別"),
        ("hourly", "時間帯別"),
        ("channels", "集客チャネル"),
        ("keywords", "流入キーワード"),
        ("referrals", "被リンク元"),
        ("pages", "ページ別"),
        ("pageCategories", "ページ分類別"),
        ("landingPages", "ランディングページ"),
        ("fileDownloads", "ファイルDL"),
        ("externalLinks", "外部リンク"),
    ]

    for key, label in sheet_meta:
        sheet = sheets_data.get(key)
        if not sheet or not sheet.get("rows"):
            continue
        _add_sheet_slide(prs, label, sheet)

    prs.save(buffer)


# ─── スライド実装 ───────────────────────────────────────


def _add_cover_slide(prs: Presentation, site_name: str, date_range: dict):
    """表紙スライド。"""
    layout = prs.slide_layouts[5]  # Title Only
    slide = prs.slides.add_slide(layout)

    title = slide.shapes.title
    title.text = f"{site_name} 分析レポート"

    # サブタイトル (テキストボックス)
    from pptx.util import Emu
    txBox = slide.shapes.add_textbox(Inches(1), Inches(4), Inches(11), Inches(1))
    tf = txBox.text_frame
    p = tf.paragraphs[0]
    period = ""
    if date_range.get("from") and date_range.get("to"):
        period = f"{date_range['from']} 〜 {date_range['to']}"
    p.text = period
    p.runs[0].font.size = Pt(18)
    p.runs[0].font.color.rgb = RGBColor(0x66, 0x66, 0x66)


def _add_summary_slide(prs: Presentation, summary: dict, comp_summary: dict | None):
    """全体サマリースライド (KPI テーブル + 棒チャート)。"""
    layout = prs.slide_layouts[5]
    slide = prs.slides.add_slide(layout)
    slide.shapes.title.text = "全体サマリー"

    metrics = summary.get("metrics") or {}
    comp_metrics = (comp_summary or {}).get("metrics") or {}

    # 左側: KPI テーブル
    metric_labels = [
        ("sessions", "セッション"),
        ("totalUsers", "ユーザー"),
        ("pageViews", "PV"),
        ("conversions", "CV"),
    ]

    # チャート用データ
    chart_data = CategoryChartData()
    chart_data.categories = [label for _, label in metric_labels]
    chart_data.add_series("当期", tuple(float(metrics.get(k) or 0) for k, _ in metric_labels))
    if comp_metrics:
        chart_data.add_series("前期", tuple(float(comp_metrics.get(k) or 0) for k, _ in metric_labels))

    chart = slide.shapes.add_chart(
        XL_CHART_TYPE.COLUMN_CLUSTERED,
        Inches(1),
        Inches(1.5),
        Inches(11.3),
        Inches(5.5),
        chart_data,
    ).chart
    chart.has_legend = True
    chart.legend.include_in_layout = False


def _add_sheet_slide(prs: Presentation, title: str, sheet: dict):
    """データシートに対応するスライド (タイトル + チャート)。"""
    layout = prs.slide_layouts[5]
    slide = prs.slides.add_slide(layout)
    slide.shapes.title.text = title

    rows = sheet.get("rows") or []
    visible_cols = sheet.get("visibleColumns") or []
    if not rows or not visible_cols:
        return

    # カテゴリ列 (最初の required 列)
    cat_col = next((c for c in visible_cols if c.get("required")), visible_cols[0])
    cat_key = cat_col["key"]

    # メトリクス列 (number format で先頭〜上位 3 個まで)
    metric_cols = [c for c in visible_cols if c.get("format") == "number"][:3]
    if not metric_cols:
        return

    # 上位 20 行に絞る
    top_rows = rows[:20]

    chart_data = CategoryChartData()
    chart_data.categories = [str(r.get(cat_key) or "") for r in top_rows]
    for mcol in metric_cols:
        vals = []
        for r in top_rows:
            try:
                vals.append(float(r.get(mcol["key"]) or 0))
            except (ValueError, TypeError):
                vals.append(0)
        chart_data.add_series(mcol["label"], tuple(vals))

    # 縦棒グラフ
    chart = slide.shapes.add_chart(
        XL_CHART_TYPE.COLUMN_CLUSTERED,
        Inches(0.5),
        Inches(1.3),
        Inches(12.3),
        Inches(5.8),
        chart_data,
    ).chart
    chart.has_legend = True
    chart.legend.include_in_layout = False
