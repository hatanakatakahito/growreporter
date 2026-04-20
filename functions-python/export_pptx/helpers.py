"""
PPTX 生成用のヘルパー — 旧 exportAnalysisToPptx.js の helpers/constants を Python に移植。
"""

from __future__ import annotations

import math
import re
from typing import Any

from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt, Emu


# ─── ブランドカラー（旧 JS COLORS と一致） ──────────────
class Color:
    PRIMARY = RGBColor(0x37, 0x58, 0xF9)
    ACCENT = RGBColor(0x93, 0x33, 0xEA)
    WHITE = RGBColor(0xFF, 0xFF, 0xFF)
    DARK = RGBColor(0x33, 0x33, 0x33)
    SUB_TEXT = RGBColor(0x66, 0x66, 0x66)
    ALT_ROW = RGBColor(0xEE, 0xF2, 0xFF)
    BORDER = RGBColor(0xD1, 0xD5, 0xDB)
    LIGHT_GRAY = RGBColor(0xF5, 0xF5, 0xF5)


CHART_PALETTE_HEX = [
    "3b82f6", "ef4444", "10b981", "f59e0b",
    "8b5cf6", "ec4899", "06b6d4", "f97316",
]


def hex_to_rgb(hex_str: str) -> RGBColor:
    h = hex_str.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


CHART_PALETTE = [hex_to_rgb(h) for h in CHART_PALETTE_HEX]


FONT_FACE = "Yu Gothic"

# スライドサイズ
SLIDE_W = 11.0
SLIDE_H = 7.5
MARGIN_X = 0.4
CONTENT_W = SLIDE_W - MARGIN_X * 2
TITLE_Y = 0.15
TITLE_H = 0.45
CONTENT_Y = TITLE_Y + TITLE_H + 0.4
FOOTER_H = 0.3
FOOTER_Y = SLIDE_H - FOOTER_H
AI_MIN_H = 0.5


DAY_NAMES = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"]

CHANNEL_MAP = {
    "Organic Search": "オーガニック検索",
    "Direct": "ダイレクト",
    "Referral": "参照元サイト",
    "Organic Social": "オーガニックSNS",
    "Paid Search": "リスティング広告",
    "Paid Social": "SNS広告",
    "Email": "メール",
    "Display": "ディスプレイ広告",
    "Affiliates": "アフィリエイト",
    "Unassigned": "未分類",
    "(other)": "その他",
}


# ─── フォーマット ────────────────────────────────────────


def fmt_num(value: Any) -> float:
    """数値化（旧 JS fmtNum）。None/空/非数値は 0。"""
    if value is None or value == "":
        return 0
    if isinstance(value, (int, float)):
        return value
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0


def format_number(value: Any) -> str:
    """カンマ付き整数文字列。None は '-'。"""
    if value is None or value == "":
        return "-"
    try:
        n = float(value) if not isinstance(value, (int, float)) else value
    except (ValueError, TypeError):
        return str(value)
    if math.isnan(n):
        return "-"
    if abs(n - int(n)) < 1e-9:
        return f"{int(n):,}"
    return f"{n:,.2f}"


def fmt_pct(value: Any) -> str:
    """0-1 の小数を 'X.XX%'。"""
    if value is None or value == "":
        return "-"
    try:
        n = float(value)
    except (ValueError, TypeError):
        return "-"
    return f"{n * 100:.2f}%"


def fmt_date(date_str: Any) -> str:
    """YYYYMMDD → YYYY/MM/DD、または既に YYYY-MM-DD なら YYYY/MM/DD に。"""
    if not date_str:
        return ""
    s = str(date_str)
    if len(s) == 8 and s.isdigit():
        return f"{s[:4]}/{s[4:6]}/{s[6:8]}"
    if "-" in s:
        return s.replace("-", "/")
    return s


def fmt_year_month(ym: Any) -> str:
    """YYYYMM → YYYY年MM月。"""
    if not ym:
        return ""
    s = str(ym)
    if len(s) == 6 and s.isdigit():
        return f"{s[:4]}年{s[4:]}月"
    if "-" in s:
        parts = s.split("-")
        if len(parts) == 2:
            return f"{parts[0]}年{parts[1]}月"
    # "2026年04月" 形式で渡された場合はそのまま
    return s


def fmt_duration(seconds: Any) -> str:
    """秒数 → m:ss。"""
    try:
        v = float(seconds or 0)
    except (ValueError, TypeError):
        return "0:00"
    m = int(v // 60)
    s = int(v % 60)
    return f"{m}:{s:02d}"


def fmt_change(current: Any, prev: Any) -> str:
    """(current - prev) / prev × 100 を (+X.X%) / (X.X%) 形式で返す。差が出せない場合は空文字。"""
    try:
        c = float(current) if current is not None else None
        p = float(prev) if prev is not None else None
    except (ValueError, TypeError):
        return ""
    if c is None or p is None or p == 0:
        return ""
    pct = ((c - p) / p) * 100
    sign = "+" if pct > 0 else ""
    return f"({sign}{pct:.1f}%)"


def clean_markdown(text: str | None) -> str:
    if not text:
        return ""
    t = text
    t = re.sub(r"^#{1,6}\s+", "", t, flags=re.MULTILINE)
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)
    t = re.sub(r"\*(.+?)\*", r"\1", t)
    t = re.sub(r"^[-*]\s+", "・", t, flags=re.MULTILINE)
    t = re.sub(r"^\d+\.\s+", "", t, flags=re.MULTILINE)
    return t.strip()


# ─── セル値抽出（sheets.visibleColumns 対応） ───────────


def format_cell_value(col: dict, value: Any) -> str:
    """列定義の format に応じて表示用文字列を返す（画面の formatCellValue と同じ結果）。"""
    if value is None or value == "":
        return "-"
    fmt = col.get("format")
    if fmt == "number":
        return format_number(value)
    if fmt == "decimal":
        try:
            n = float(value)
            return f"{n:,.2f}"
        except (ValueError, TypeError):
            return str(value)
    if fmt == "percent":
        return fmt_pct(value)
    if fmt == "duration":
        return fmt_duration(value)
    return str(value)


def column_align(col: dict) -> str:
    fmt = col.get("format")
    if fmt in ("number", "decimal", "percent", "duration"):
        return "right"
    return "left"


# ─── python-pptx 便利関数 ─────────────────────────────


def set_cell_bg(cell, rgb: RGBColor) -> None:
    cell.fill.solid()
    cell.fill.fore_color.rgb = rgb


def set_cell_text(
    cell,
    text: str,
    *,
    font_size: float = 10,
    bold: bool = False,
    color: RGBColor = Color.DARK,
    align: str = "left",
    vertical: str = "middle",
    font_name: str = FONT_FACE,
) -> None:
    cell.text = ""  # clear
    tf = cell.text_frame
    tf.word_wrap = True
    # python-pptx auto-creates a paragraph
    p = tf.paragraphs[0]
    p.alignment = {
        "left": PP_ALIGN.LEFT,
        "center": PP_ALIGN.CENTER,
        "right": PP_ALIGN.RIGHT,
    }.get(align, PP_ALIGN.LEFT)
    run = p.add_run()
    run.text = str(text) if text is not None else ""
    run.font.name = font_name
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.color.rgb = color

    cell.vertical_anchor = {
        "top": MSO_ANCHOR.TOP,
        "middle": MSO_ANCHOR.MIDDLE,
        "bottom": MSO_ANCHOR.BOTTOM,
    }.get(vertical, MSO_ANCHOR.MIDDLE)
    # セル内マージン
    cell.margin_left = Emu(45720)  # 約 0.05"
    cell.margin_right = Emu(45720)
    cell.margin_top = Emu(18288)
    cell.margin_bottom = Emu(18288)


def get_table_font_size(row_count: int) -> float:
    """テーブル内フォントサイズ。見やすさ優先で 10pt を基本に、どうしても収まらない時だけ段階的に縮小。"""
    if row_count <= 20:
        return 10
    if row_count <= 30:
        return 9
    return 8


# ─── レイアウト計算（旧 calcLayout / calcTableOnlyLayout） ─


def calc_layout(data_row_count: int, has_ai: bool) -> dict:
    ai_h = AI_MIN_H if has_ai else 0
    available = FOOTER_Y - CONTENT_Y - ai_h - 0.1
    if data_row_count <= 8:
        chart_h = available * 0.55
        table_h = available * 0.45
    elif data_row_count <= 15:
        chart_h = available * 0.42
        table_h = available * 0.58
    elif data_row_count <= 24:
        chart_h = available * 0.35
        table_h = available * 0.65
    else:
        chart_h = available * 0.28
        table_h = available * 0.72
    table_y = CONTENT_Y + chart_h + 0.05
    ai_y = table_y + table_h + 0.05
    return {
        "chart_h": chart_h,
        "chart_y": CONTENT_Y,
        "table_h": table_h,
        "table_y": table_y,
        "ai_y": ai_y,
        "ai_h": ai_h,
    }


def calc_table_only_layout(has_ai: bool) -> dict:
    ai_h = AI_MIN_H if has_ai else 0
    table_y = CONTENT_Y
    table_h = FOOTER_Y - CONTENT_Y - ai_h - 0.1
    ai_y = table_y + table_h + 0.05
    return {
        "table_y": table_y,
        "table_h": table_h,
        "ai_y": ai_y,
        "ai_h": ai_h,
    }
