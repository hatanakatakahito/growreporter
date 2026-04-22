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

COL_WIDTHS = [4, 12, 6, 50, 40, 60, 40, 24]
HEADERS = [
    "No.",
    "カテゴリ",
    "優先度",
    "タイトル",
    "対象URL",
    "説明",
    "期待効果",
    "目安料金・納期",
]


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

    # 各行の値を先に組み立てて、最大必要高さを 1 つだけ計算 → 全行統一
    rows_data = []
    for item in sorted_items:
        cat = item.get("category") or ""
        pri = item.get("priority") or ""
        rows_data.append([
            "",  # No. は数値、改行なし
            CATEGORY_LABELS.get(cat, cat),
            PRIORITY_LABELS.get(pri, pri),
            item.get("title") or "",
            (item.get("targetPageUrl") or "").strip(),
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

        ws.write_number(row, 0, idx + 1, num_fmt)

        cat = item.get("category") or ""
        ws.write(row, 1, CATEGORY_LABELS.get(cat, cat), data_fmt)

        pri = item.get("priority") or ""
        ws.write(row, 2, PRIORITY_LABELS.get(pri, pri), data_fmt)

        ws.write(row, 3, item.get("title") or "", data_fmt)
        ws.write(row, 4, (item.get("targetPageUrl") or "").strip(), data_fmt)
        ws.write(row, 5, _format_description_with_sections(item.get("description") or ""), data_fmt)
        ws.write(row, 6, item.get("expectedImpact") or "", data_fmt)
        ws.write(row, 7, item.get("costDeliveryLabel") or "要相談", data_fmt)

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
