"""
xlsxwriter 用のスタイル定義。
既存の src/utils/exportAnalysisToExcel.js のスタイル定数を 1:1 で Python に移植。
"""

FONT_NAME = "Yu Gothic"  # xlsxwriter は MS Gothic より Yu Gothic が安定
FONT_SIZE = 10

# ヘッダー (#404040 背景 + 白文字 + 太字 + 中央揃え)
HEADER_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "bold": True,
    "font_color": "#FFFFFF",
    "bg_color": "#404040",
    "align": "center",
    "valign": "vcenter",
    "text_wrap": True,
    "border": 1,
    "border_color": "#CCCCCC",
}

# 通常データセル (折り返し・縦中央)
DATA_CELL_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "valign": "vcenter",
    "text_wrap": True,
    "border": 1,
    "border_color": "#CCCCCC",
}

# 数値セル (右寄せ・カンマ区切り)
NUMBER_CELL_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "align": "right",
    "valign": "vcenter",
    "num_format": "#,##0",
    "border": 1,
    "border_color": "#CCCCCC",
}

# 小数セル (右寄せ・小数2桁)
DECIMAL_CELL_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "align": "right",
    "valign": "vcenter",
    "num_format": "#,##0.00",
    "border": 1,
    "border_color": "#CCCCCC",
}

# パーセンテージセル (右寄せ)
PERCENT_CELL_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "align": "right",
    "valign": "vcenter",
    "num_format": '0.00"%"',
    "border": 1,
    "border_color": "#CCCCCC",
}

# 文字列右寄せ (duration "m:ss" 等)
TEXT_RIGHT_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "align": "right",
    "valign": "vcenter",
    "border": 1,
    "border_color": "#CCCCCC",
}

# 合計 / 平均行 ラベル
TOTAL_LABEL_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "bold": True,
    "bg_color": "#F3F4F6",
    "align": "center",
    "valign": "vcenter",
    "border": 1,
    "border_color": "#9CA3AF",
    "top": 2,
    "top_color": "#6B7280",
}

# 合計 / 平均行 数値
TOTAL_NUMBER_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "bold": True,
    "bg_color": "#F3F4F6",
    "align": "right",
    "valign": "vcenter",
    "num_format": "#,##0",
    "border": 1,
    "border_color": "#9CA3AF",
    "top": 2,
    "top_color": "#6B7280",
}

# 合計 / 平均行 テキスト (パーセンテージ・秒数など)
TOTAL_TEXT_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "bold": True,
    "bg_color": "#F3F4F6",
    "align": "right",
    "valign": "vcenter",
    "border": 1,
    "border_color": "#9CA3AF",
    "top": 2,
    "top_color": "#6B7280",
}

# AI 分析セクション ヘッダー (紫背景 + 白文字)
AI_SECTION_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 11,
    "bold": True,
    "font_color": "#FFFFFF",
    "bg_color": "#9333EA",
    "align": "left",
    "valign": "vcenter",
    "border": 1,
    "border_color": "#CCCCCC",
}

# AI 分析本文 (折返し・薄紫背景)
AI_CONTENT_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "bg_color": "#FAF5FF",
    "align": "left",
    "valign": "top",
    "text_wrap": True,
    "border": 1,
    "border_color": "#E9D5FF",
}

# メモセクション ヘッダー (濃い紫)
MEMO_SECTION_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 11,
    "bold": True,
    "font_color": "#FFFFFF",
    "bg_color": "#7030A0",
    "align": "left",
    "valign": "vcenter",
    "border": 1,
    "border_color": "#CCCCCC",
}

# 表紙用スタイル
COVER_TITLE_STYLE = {
    "font_name": FONT_NAME,
    "font_size": 20,
    "bold": True,
    "font_color": "#333333",
    "align": "left",
    "valign": "vcenter",
}

COVER_LABEL_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "bold": True,
    "font_color": "#666666",
    "align": "left",
    "valign": "vcenter",
}

COVER_VALUE_STYLE = {
    "font_name": FONT_NAME,
    "font_size": FONT_SIZE,
    "font_color": "#333333",
    "align": "left",
    "valign": "vcenter",
}

# ─── 定数 ─────────────────────────────────────────────────────
LINE_HEIGHT_PT = 15.5
MIN_ROW_HEIGHT_PT = 22
MAX_ROW_HEIGHT_PT = 409

# 曜日名
DAY_NAMES = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"]

# チャネル日本語変換
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
