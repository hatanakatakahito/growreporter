"""
xlsxwriter 用のスタイル定義（v5.11.1 リファイン版）
brand: グローレポータ — サンプル準拠ネイビー基調
"""

FONT_NAME = "Yu Gothic"
FONT_SIZE = 10

# ─── ブランドカラー（サンプル準拠） ──────────────────────
PRIMARY = "#2347A0"        # ネイビー（タイトル・合計行・強調）
PRIMARY_MID = "#3D68CC"    # ミッドブルー（テーブルヘッダ）
SUB_TEXT = "#3D4F80"       # サブテキスト・ラベル
DARK = "#1E293B"           # 本文
BODY = "#637381"           # 補助テキスト
STROKE = "#DFE4EA"
STROKE_LIGHT = "#E5E7EB"
WHITE = "#FFFFFF"
BG_LIGHT = "#F5F7FF"       # ゼブラ alt 行（薄ブルー）
SECTION_BG = "#ECF0FF"     # ■ セクション帯背景
HIGHLIGHT_BG = "#EEF2FF"   # 当期ハイライト

FOOTER_TEXT = "&C© グローレポータ  Produced by GrowGroup Co.,Ltd."

# ─── シートタイトル（プレーン: 帯なし、文字のみ） ────────
SHEET_TITLE_NAME_STYLE = {
    "font_name": FONT_NAME, "font_size": 18, "bold": True,
    "font_color": DARK,
    "align": "left", "valign": "vcenter",
}

SHEET_TITLE_SUBTITLE_STYLE = {
    "font_name": FONT_NAME, "font_size": 9, "bold": False,
    "font_color": SUB_TEXT,
    "align": "left", "valign": "vcenter",
}

# ─── ■ セクションマーカー ──────────────────────────────
SECTION_MARKER_STYLE = {
    "font_name": FONT_NAME, "font_size": 11, "bold": True,
    "font_color": PRIMARY, "bg_color": SECTION_BG,
    "align": "left", "valign": "vcenter",
    "border": 1, "border_color": SECTION_BG,
}

# ─── ヘッダー（ミッドブルー + 白文字 9pt） ──────────────
HEADER_STYLE = {
    "font_name": FONT_NAME, "font_size": 9, "bold": True,
    "font_color": WHITE, "bg_color": PRIMARY_MID,
    "align": "center", "valign": "vcenter", "text_wrap": True,
    "border": 1, "border_color": PRIMARY_MID,
}

# ─── データセル ────────────────────────────────────────
DATA_CELL_STYLE = {
    "font_name": FONT_NAME, "font_size": FONT_SIZE,
    "font_color": DARK,
    "valign": "vcenter", "text_wrap": True,
    "border": 1, "border_color": STROKE,
}

DATA_CELL_ALT_STYLE = {
    **DATA_CELL_STYLE,
    "bg_color": BG_LIGHT,
}

NUMBER_CELL_STYLE = {
    "font_name": FONT_NAME, "font_size": FONT_SIZE,
    "font_color": DARK,
    "align": "right", "valign": "vcenter", "num_format": "#,##0",
    "border": 1, "border_color": STROKE,
}

NUMBER_CELL_ALT_STYLE = {
    **NUMBER_CELL_STYLE,
    "bg_color": BG_LIGHT,
}

DECIMAL_CELL_STYLE = {
    "font_name": FONT_NAME, "font_size": FONT_SIZE,
    "font_color": DARK,
    "align": "right", "valign": "vcenter", "num_format": "0.00",
    "border": 1, "border_color": STROKE,
}

DECIMAL_CELL_ALT_STYLE = {
    **DECIMAL_CELL_STYLE,
    "bg_color": BG_LIGHT,
}

TEXT_RIGHT_STYLE = {
    "font_name": FONT_NAME, "font_size": FONT_SIZE,
    "font_color": DARK,
    "align": "right", "valign": "vcenter",
    "border": 1, "border_color": STROKE,
}

TEXT_RIGHT_ALT_STYLE = {
    **TEXT_RIGHT_STYLE,
    "bg_color": BG_LIGHT,
}

PERCENT_CELL_STYLE = TEXT_RIGHT_STYLE

# ─── 合計行（ネイビー背景 + 白文字） ────────────────────
TOTAL_LABEL_STYLE = {
    "font_name": FONT_NAME, "font_size": FONT_SIZE, "bold": True,
    "font_color": WHITE, "bg_color": PRIMARY,
    "align": "center", "valign": "vcenter",
    "border": 1, "border_color": PRIMARY,
}

TOTAL_NUMBER_STYLE = {
    **TOTAL_LABEL_STYLE,
    "align": "right", "num_format": "#,##0",
}

TOTAL_TEXT_STYLE = {
    **TOTAL_LABEL_STYLE,
    "align": "right",
}

# ─── AI 分析セクション（紫系維持・落ち着かせる） ────────
AI_SECTION_STYLE = {
    "font_name": FONT_NAME, "font_size": 11, "bold": True,
    "font_color": WHITE, "bg_color": "#7C3AED",
    "align": "left", "valign": "vcenter",
    "border": 1, "border_color": "#7C3AED",
}

AI_CONTENT_STYLE = {
    "font_name": FONT_NAME, "font_size": FONT_SIZE,
    "font_color": DARK, "bg_color": "#F5F3FF",
    "align": "left", "valign": "top", "text_wrap": True,
    "border": 1, "border_color": "#DDD6FE",
}

AI_PLACEHOLDER_STYLE = {
    "font_name": FONT_NAME, "font_size": 9, "italic": True,
    "font_color": "#9CA3AF", "bg_color": "#F9FAFB",
    "align": "left", "valign": "vcenter", "text_wrap": True,
    "border": 1, "border_color": "#E5E7EB",
}

# ─── メモセクション ────────────────────────────────────
MEMO_SECTION_STYLE = {
    "font_name": FONT_NAME, "font_size": 11, "bold": True,
    "font_color": WHITE, "bg_color": "#7030A0",
    "align": "left", "valign": "vcenter",
    "border": 1, "border_color": "#7030A0",
}

# ─── 表紙スタイル ──────────────────────────────────────
COVER_TITLE_STYLE = {
    "font_name": FONT_NAME, "font_size": 22, "bold": True,
    "font_color": PRIMARY,
    "align": "left", "valign": "vcenter",
}

COVER_SUBTITLE_STYLE = {
    "font_name": FONT_NAME, "font_size": 12,
    "font_color": SUB_TEXT,
    "align": "left", "valign": "vcenter",
}

COVER_LABEL_STYLE = {
    "font_name": FONT_NAME, "font_size": 9, "bold": True,
    "font_color": SUB_TEXT,
    "align": "left", "valign": "vcenter",
    "bottom": 1, "bottom_color": STROKE,
}

COVER_VALUE_STYLE = {
    "font_name": FONT_NAME, "font_size": FONT_SIZE,
    "font_color": DARK,
    "align": "left", "valign": "vcenter",
    "bottom": 1, "bottom_color": STROKE,
}

COVER_BRAND_STYLE = {
    "font_name": FONT_NAME, "font_size": 9, "bold": True,
    "font_color": PRIMARY,
    "align": "left", "valign": "vcenter",
}

BRAND_LINE_STYLE = {"bg_color": PRIMARY}

# ─── KPI カード（表紙） ───────────────────────────────
KPI_HEADER_STYLE = {
    "font_name": FONT_NAME, "font_size": 10, "bold": True,
    "font_color": WHITE, "bg_color": PRIMARY,
    "align": "left", "valign": "vcenter",
    "left": 1, "left_color": PRIMARY,
    "right": 1, "right_color": PRIMARY,
    "top": 1, "top_color": PRIMARY,
}

KPI_NUM_STYLE = {
    "font_name": FONT_NAME, "font_size": 14, "bold": True,
    "font_color": PRIMARY,
    "align": "center", "valign": "vcenter",
    "top": 1, "top_color": PRIMARY,
    "bottom": 1, "bottom_color": STROKE,
    "left": 1, "left_color": STROKE,
    "right": 1, "right_color": STROKE,
}

KPI_LABEL_STYLE = {
    "font_name": FONT_NAME, "font_size": 9,
    "font_color": SUB_TEXT,
    "align": "center", "valign": "vcenter", "bg_color": BG_LIGHT,
    "bottom": 1, "bottom_color": STROKE,
    "left": 1, "left_color": STROKE,
    "right": 1, "right_color": STROKE,
}

# ─── 目次 ──────────────────────────────────────────────
TOC_SECTION_TITLE_STYLE = {
    "font_name": FONT_NAME, "font_size": 11, "bold": True,
    "font_color": PRIMARY,
    "bottom": 2, "bottom_color": PRIMARY,
    "align": "left", "valign": "vcenter",
}

TOC_NUM_HEADER_STYLE = {
    "font_name": FONT_NAME, "font_size": 9, "bold": True,
    "font_color": SUB_TEXT,
    "align": "center", "valign": "vcenter",
    "bottom": 2, "bottom_color": PRIMARY,
}

TOC_HEADER_STYLE = {
    "font_name": FONT_NAME, "font_size": 9, "bold": True,
    "font_color": SUB_TEXT,
    "align": "left", "valign": "vcenter",
    "bottom": 2, "bottom_color": PRIMARY,
}

TOC_NUM_STYLE = {
    "font_name": FONT_NAME, "font_size": 10, "bold": True,
    "font_color": PRIMARY,
    "align": "center", "valign": "vcenter",
    "bottom": 1, "bottom_color": STROKE,
}

TOC_NAME_STYLE = {
    "font_name": FONT_NAME, "font_size": 10, "bold": True,
    "font_color": PRIMARY,
    "align": "left", "valign": "vcenter",
    "bottom": 1, "bottom_color": STROKE,
    "underline": 1,
}

TOC_DESC_STYLE = {
    "font_name": FONT_NAME, "font_size": 9,
    "font_color": SUB_TEXT,
    "align": "left", "valign": "vcenter",
    "bottom": 1, "bottom_color": STROKE,
}

# ─── 旧互換 alias ───────────────────────────────────
SECTION_TITLE_STYLE = SECTION_MARKER_STYLE

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
