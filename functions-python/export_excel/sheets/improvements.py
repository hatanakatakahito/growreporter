"""
改善提案シート: 改善案一覧テーブル
既存の exportImprovementsToExcel.js と同じカラム構成。
"""

from ..helpers import safe_sheet_name
from ..sheet_builder import write_sheet_title_bar
from ..styles import FOOTER_TEXT

CATEGORY_LABELS = {
    "acquisition": "集客",
    "content": "コンテンツ",
    "design": "デザイン",
    "feature": "機能",
    "other": "その他",
}

PRIORITY_LABELS = {"high": "高", "medium": "中", "low": "低"}
STATUS_LABELS = {"draft": "起案", "in_progress": "対応中", "completed": "完了"}

COL_WIDTHS = [4, 12, 6, 50, 60, 40, 40, 24]
HEADERS = [
    "No.",
    "カテゴリ",
    "優先度",
    "タイトル",
    "説明",
    "対象URL",
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

    for idx, item in enumerate(sorted_items):
        row = header_row + 1 + idx
        ws.set_row(row, max(22, _estimate_row_height(item)))

        is_alt = (idx % 2 == 1)
        data_fmt = formats["data_alt"] if is_alt else formats["data"]
        num_fmt = formats["number_alt"] if is_alt else formats["number"]

        ws.write_number(row, 0, idx + 1, num_fmt)

        cat = item.get("category") or ""
        ws.write(row, 1, CATEGORY_LABELS.get(cat, cat), data_fmt)

        pri = item.get("priority") or ""
        ws.write(row, 2, PRIORITY_LABELS.get(pri, pri), data_fmt)

        ws.write(row, 3, item.get("title") or "", data_fmt)
        ws.write(row, 4, (item.get("description") or "").strip(), data_fmt)
        ws.write(row, 5, (item.get("targetPageUrl") or "").strip(), data_fmt)
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


def _estimate_row_height(item: dict) -> float:
    """テキスト長に基づいた行の高さ推定。"""
    max_lines = 1
    for key in ("description", "expectedImpact"):
        text = item.get(key) or ""
        lines = len(text) / 30 + text.count("\n")
        max_lines = max(max_lines, lines)
    return min(409, max(22, max_lines * 15.5))
