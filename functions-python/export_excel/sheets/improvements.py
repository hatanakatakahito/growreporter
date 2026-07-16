"""
改善提案シート: 改善案一覧テーブル
既存の exportImprovementsToExcel.js と同じカラム構成。
"""

import re

from ..helpers import calc_row_height, safe_sheet_name
from ..sheet_builder import write_sheet_title_bar
from ..styles import FOOTER_TEXT


def _format_description_with_sections(text: str) -> str:
    """【現状の問題】【提案内容】【なぜ効くか】等のセクションマーカーで区切って改行整形。

    例:
      入力: "【現状の問題】 ... 【提案内容】 ... 【なぜ効くか】 ..."
      出力:
        【現状の問題】
        ...

        【提案内容】
        ...

        【なぜ効くか】
        ...
    """
    if not text:
        return ""
    s = text.strip()
    if "【" not in s:
        return s
    # 【XXX】 を区切りとして split (区切り自体も保持)
    parts = re.split(r"(【[^】]+】)", s)
    sections = []
    i = 0
    # 最初に【...】が来る前のテキストがあればそのまま先頭に
    if parts and parts[0].strip():
        sections.append(parts[0].strip())
    i = 1
    while i < len(parts):
        if parts[i].startswith("【"):
            marker = parts[i]
            body = parts[i + 1].strip() if i + 1 < len(parts) else ""
            sections.append(f"{marker}\n{body}")
            i += 2
        else:
            i += 1
    return "\n\n".join(sections)

CATEGORY_LABELS = {
    "acquisition": "集客",
    "content": "コンテンツ",
    "design": "デザイン",
    "feature": "機能",
    "other": "その他",
}

PRIORITY_LABELS = {"high": "高", "medium": "中", "low": "低"}
STATUS_LABELS = {"draft": "起案", "in_progress": "対応中", "completed": "完了"}

# Firebase Hosting rewrite (firebase.json: /page-mockups/** → serveMockup) で
# Storage 直 URL を隠して自社ドメインで配信
MOCKUP_SHARE_BASE_URL = "https://grow-reporter.com"

# 列順は exportImprovementsToExcel.js (フロント側) と揃える
# モックアップURL 列を 対象URL の隣 (index 5) に挿入
COL_WIDTHS = [4, 12, 6, 50, 40, 60, 60, 40, 24]
HEADERS = [
    "No.",
    "カテゴリ",
    "優先度",
    "タイトル",
    "対象URL",
    "モックアップURL",
    "説明",
    "期待効果",
    "目安料金・納期",
]
# モックアップURL 列のインデックス (ハイパーリンク化対象)
MOCKUP_URL_COL_INDEX = 5


def _build_mockup_share_url(mockup_storage_url: str) -> str:
    """mockupStorageUrl から siteId / improvementId を抽出して
    grow-reporter.com 形式の共有 URL を組み立てる。未生成 (None / 空) の場合は空文字を返す。
    """
    if not mockup_storage_url:
        return ""
    m = re.search(r"/page-mockups/([^/]+)/([^/]+)\.html", str(mockup_storage_url))
    if not m:
        return ""
    return f"{MOCKUP_SHARE_BASE_URL}/page-mockups/{m.group(1)}/{m.group(2)}.html"


def _get_mockup_cell_display(item: dict) -> tuple[str, bool]:
    """モックアップ列に表示する値を決定。
    返り値: (表示文字列, is_url)
    - URL あり: (URL, True) → ハイパーリンク化
    - URL なし + mockupSkipped=True: ("対応不要", False) → プレーンテキスト
    - URL なし + 通常: ("未生成", False) → プレーンテキスト
    """
    url = _build_mockup_share_url(item.get("mockupStorageUrl"))
    if url:
        return (url, True)
    if item.get("mockupSkipped"):
        return ("対応不要", False)
    return ("未生成", False)


def create_improvements_sheet(workbook, improvements: list, formats: dict, sheet_subtitle: str | None = None):
    """改善提案シートを作成。"""
    if not improvements:
        return None

    ws = workbook.add_worksheet(safe_sheet_name("改善提案"))
    ws.hide_gridlines(2)
    ws.set_footer(FOOTER_TEXT)

    # 列幅
    for c, w in enumerate(COL_WIDTHS):
        ws.set_column(c, c, w)

    num_cols = len(HEADERS)

    # シートタイトルバー (行 0-2) — サブタイトルに件数を併記
    n = len(improvements)
    title_subtitle = f"{sheet_subtitle}  /  全 {n} 件" if sheet_subtitle else f"全 {n} 件"
    title_next_row = write_sheet_title_bar(ws, "改善提案アクションプラン", title_subtitle, num_cols, formats)

    # ヘッダー
    header_row = title_next_row
    ws.set_row(header_row, 28)
    for c, h in enumerate(HEADERS):
        ws.write(header_row, c, h, formats["header"])

    # データ行（order → createdAt 順にソート、ゼブラ）
    sorted_items = sorted(improvements, key=lambda x: (
        x.get("order") if x.get("order") is not None else 999999,
        _get_timestamp(x.get("createdAt")),
    ))

    # ハイパーリンク用フォーマット (モックアップURL 列専用、青色 + 下線)
    # ゼブラに合わせて 2 種類用意
    link_fmt = workbook.add_format({
        "font_name": "Yu Gothic",
        "font_size": 10,
        "font_color": "#0563C1",
        "underline": 1,
        "text_wrap": True,
        "valign": "vcenter",
        "border": 1,
        "border_color": "#E5E7EB",
    })
    link_fmt_alt = workbook.add_format({
        "font_name": "Yu Gothic",
        "font_size": 10,
        "font_color": "#0563C1",
        "underline": 1,
        "text_wrap": True,
        "valign": "vcenter",
        "bg_color": "#F5F7FF",
        "border": 1,
        "border_color": "#E5E7EB",
    })

    # 各行の値を先に組み立てて、最大必要高さを 1 つだけ計算 → 全行統一
    rows_data = []
    for item in sorted_items:
        cat = item.get("category") or ""
        pri = item.get("priority") or ""
        mockup_text, _ = _get_mockup_cell_display(item)
        rows_data.append([
            "",  # No. は数値、改行なし
            CATEGORY_LABELS.get(cat, cat),
            PRIORITY_LABELS.get(pri, pri),
            item.get("title") or "",
            (item.get("targetPageUrl") or "").strip(),
            mockup_text,
            _format_description_with_sections(item.get("description") or ""),
            item.get("expectedImpact") or "",
            item.get("costDeliveryLabel") or "要相談",
        ])
    uniform_height = max(
        (calc_row_height(r, COL_WIDTHS) for r in rows_data),
        default=22,
    )

    for idx, item in enumerate(sorted_items):
        row = header_row + 1 + idx
        ws.set_row(row, uniform_height)

        is_alt = (idx % 2 == 1)
        data_fmt = formats["data_alt"] if is_alt else formats["data"]
        num_fmt = formats["number_alt"] if is_alt else formats["number"]
        cur_link_fmt = link_fmt_alt if is_alt else link_fmt

        ws.write_number(row, 0, idx + 1, num_fmt)

        cat = item.get("category") or ""
        ws.write(row, 1, CATEGORY_LABELS.get(cat, cat), data_fmt)

        pri = item.get("priority") or ""
        ws.write(row, 2, PRIORITY_LABELS.get(pri, pri), data_fmt)

        ws.write(row, 3, item.get("title") or "", data_fmt)
        ws.write(row, 4, (item.get("targetPageUrl") or "").strip(), data_fmt)

        # モックアップURL 列:
        #   - URL あり: ハイパーリンク化
        #   - URL なし + mockupSkipped: "対応不要" (プレーンテキスト)
        #   - URL なし + 通常: "未生成" (プレーンテキスト)
        mockup_text, mockup_is_url = _get_mockup_cell_display(item)
        if mockup_is_url:
            ws.write_url(row, 5, mockup_text, cur_link_fmt, mockup_text)
        else:
            ws.write(row, 5, mockup_text, data_fmt)

        ws.write(row, 6, _format_description_with_sections(item.get("description") or ""), data_fmt)
        ws.write(row, 7, item.get("expectedImpact") or "", data_fmt)
        ws.write(row, 8, item.get("costDeliveryLabel") or "要相談", data_fmt)

    return ws


def _get_timestamp(ts) -> float:
    """Firestore Timestamp / dict / epoch を float に変換。"""
    if ts is None:
        return 0
    if isinstance(ts, (int, float)):
        return float(ts)
    if isinstance(ts, dict):
        return float(ts.get("seconds") or ts.get("_seconds") or 0)
    return 0
