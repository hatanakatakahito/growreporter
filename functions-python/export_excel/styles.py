"""
xlsxwriter 用のスタイル定義（正式採用版）
brand: グローレポータ #3758F9 プライマリ
"""

FONT_NAME = "Yu Gothic"
FONT_SIZE = 10

# ─── ブランドカラー ─────────────────────────────────────
PRIMARY = "#3758F9"
PRIMARY_LIGHT = "#EBF0FF"
PRIMARY_MID = "#6B8AFF"
DARK = "#111928"
BODY = "#637381"
STROKE = "#DFE4EA"
STROKE_LIGHT = "#F3F4F6"
WHITE = "#FFFFFF"
BG_LIGHT = "#F9FAFB"

# ─── 共通フォント ───────────────────────────────────────
FOOTER_TEXT = "&C© グローレポータ  Produced by GrowGroup Co.,Ltd."

# ─── ヘッダー (プライマリブルー背景 + 白文字) ────────────
HEADER_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "bold": True,
    "font_color": WHITE,
    "bg_color": PRIMARY,
    "align": "center",
    "valign": "vcenter",
    "text_wrap": True,
    "border": 1,
    "border_color": PRIMARY_MID,
}

# ─── データセル (奇数行) ────────────────────────────────
DATA_CELL_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "font_color": DARK,
    "valign": "vcenter",
    "text_wrap": True,
    "border": 1,
    "border_color": STROKE,
}

# ─── データセル (偶数行・ゼブラ) ────────────────────────
DATA_CELL_ALT_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "font_color": DARK,
    "valign": "vcenter",
    "text_wrap": True,
    "bg_color": BG_LIGHT,
    "border": 1,
    "border_color": STROKE,
}

# ─── 数値セル ──────────────────────────────────────────
NUMBER_CELL_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "font_color": DARK,
    "align": "right",
    "valign": "vcenter",
    "num_format": "#,##0",
    "border": 1,
    "border_color": STROKE,
}

NUMBER_CELL_ALT_STYLE = {
    **NUMBER_CELL_STYLE,
    "bg_color": BG_LIGHT,
}

# ─── 小数セル ──────────────────────────────────────────
DECIMAL_CELL_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "font_color": DARK,
    "align": "right",
    "valign": "vcenter",
    "num_format": "0.00",
    "border": 1,
    "border_color": STROKE,
}

DECIMAL_CELL_ALT_STYLE = {
    **DECIMAL_CELL_STYLE,
    "bg_color": BG_LIGHT,
}

# ─── テキスト右寄せ (パーセンテージ・duration 文字列) ───
TEXT_RIGHT_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "font_color": DARK,
    "align": "right",
    "valign": "vcenter",
    "border": 1,
    "border_color": STROKE,
}

TEXT_RIGHT_ALT_STYLE = {
    **TEXT_RIGHT_STYLE,
    "bg_color": BG_LIGHT,
}

# percent 書式用 (旧互換 — 未使用だが builder で参照される)
PERCENT_CELL_STYLE = TEXT_RIGHT_STYLE

# ─── 合計行 (プライマリライト背景 + 上部プライマリ線) ───
TOTAL_LABEL_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "bold": True,
    "font_color": DARK,
    "bg_color": PRIMARY_LIGHT,
    "align": "center",
    "valign": "vcenter",
    "top": 2,
    "top_color": PRIMARY,
    "bottom": 1,
    "bottom_color": STROKE,
    "left": 1,
    "left_color": STROKE,
    "right": 1,
    "right_color": STROKE,
}

TOTAL_NUMBER_STYLE = {
    **TOTAL_LABEL_STYLE,
    "align": "right",
    "num_format": "#,##0",
}

TOTAL_TEXT_STYLE = {
    **TOTAL_LABEL_STYLE,
    "align": "right",
}

# ─── AI 分析セクション ─────────────────────────────────
AI_SECTION_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 11,
    "bold": True,
    "font_color": WHITE,
    "bg_color": "#7C3AED",
    "align": "left",
    "valign": "vcenter",
    "border": 1,
    "border_color": "#7C3AED",
}

AI_CONTENT_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "font_color": DARK,
    "bg_color": "#F5F3FF",
    "align": "left",
    "valign": "top",
    "text_wrap": True,
    "border": 1,
    "border_color": "#DDD6FE",
}

# ─── メモセクション ────────────────────────────────────
MEMO_SECTION_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 11,
    "bold": True,
    "font_color": WHITE,
    "bg_color": "#7030A0",
    "align": "left",
    "valign": "vcenter",
    "border": 1,
    "border_color": "#7030A0",
}

# ─── 表紙スタイル ──────────────────────────────────────
COVER_TITLE_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 22,
    "bold": True,
    "font_color": DARK,
    "align": "left",
    "valign": "vcenter",
}

COVER_SUBTITLE_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 12,
    "font_color": BODY,
    "align": "left",
    "valign": "vcenter",
}

COVER_LABEL_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "bold": True,
    "font_color": BODY,
    "align": "left",
    "valign": "vcenter",
    "bottom": 1,
    "bottom_color": STROKE,
}

COVER_VALUE_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "font_color": DARK,
    "align": "left",
    "valign": "vcenter",
    "bottom": 1,
    "bottom_color": STROKE,
}

COVER_BRAND_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 9,
    "bold": True,
    "font_color": PRIMARY,
    "align": "left",
    "valign": "vcenter",
}

BRAND_LINE_STYLE = {"bg_color": PRIMARY}

# ─── KPI カード ────────────────────────────────────────
KPI_HEADER_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 10,
    "bold": True,
    "font_color": WHITE,
    "bg_color": PRIMARY,
    "align": "left",
    "valign": "vcenter",
    "left": 1,
    "left_color": PRIMARY,
    "right": 1,
    "right_color": PRIMARY,
    "top": 1,
    "top_color": PRIMARY,
}

KPI_NUM_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 14,
    "bold": True,
    "font_color": DARK,
    "align": "center",
    "valign": "vcenter",
    "top": 1,
    "top_color": PRIMARY,
    "bottom": 1,
    "bottom_color": STROKE,
    "left": 1,
    "left_color": STROKE,
    "right": 1,
    "right_color": STROKE,
}

KPI_LABEL_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 9,
    "font_color": BODY,
    "align": "center",
    "valign": "vcenter",
    "bg_color": BG_LIGHT,
    "bottom": 1,
    "bottom_color": STROKE,
    "left": 1,
    "left_color": STROKE,
    "right": 1,
    "right_color": STROKE,
}

# ─── 目次 ──────────────────────────────────────────────
TOC_SECTION_TITLE_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 11,
    "bold": True,
    "font_color": PRIMARY,
    "bottom": 2,
    "bottom_color": PRIMARY,
    "align": "left",
    "valign": "vcenter",
}

TOC_NUM_HEADER_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 9,
    "bold": True,
    "font_color": BODY,
    "align": "center",
    "valign": "vcenter",
    "bottom": 2,
    "bottom_color": PRIMARY,
}

TOC_HEADER_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 9,
    "bold": True,
    "font_color": BODY,
    "align": "left",
    "valign": "vcenter",
    "bottom": 2,
    "bottom_color": PRIMARY,
}

TOC_NUM_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 10,
    "bold": True,
    "font_color": PRIMARY,
    "align": "center",
    "valign": "vcenter",
    "bottom": 1,
    "bottom_color": STROKE,
}

TOC_NAME_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 10,
    "bold": True,
    "font_color": DARK,
    "align": "left",
    "valign": "vcenter",
    "bottom": 1,
    "bottom_color": STROKE,
    "underline": 1,
}

TOC_DESC_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 9,
    "font_color": BODY,
    "align": "left",
    "valign": "vcenter",
    "bottom": 1,
    "bottom_color": STROKE,
}

# ─── セクション区切り ──────────────────────────────────
SECTION_TITLE_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 11,
    "bold": True,
    "font_color": PRIMARY,
    "bottom": 2,
    "bottom_color": PRIMARY,
    "align": "left",
    "valign": "vcenter",
}

# ─── 定数 ─────────────────────────────────────────────
LINE_HEIGHT_PT = 15.5
MIN_ROW_HEIGHT_PT = 22
MAX_ROW_HEIGHT_PT = 409

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
