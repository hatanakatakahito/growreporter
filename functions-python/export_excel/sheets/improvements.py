"""
改善提案シート: 改善案一覧テーブル
既存の exportImprovementsToExcel.js と同じカラム構成。
"""

from ..helpers import safe_sheet_name

CATEGORY_LABELS = {
    "acquisition": "集客",
    "content": "コンテンツ",
    "design": "デザイン",
    "feature": "機能",
    "other": "その他",
}

PRIORITY_LABELS = {"high": "高", "medium": "中", "low": "低"}
STATUS_LABELS = {"draft": "起案", "in_progress": "対応中", "completed": "完了"}

COL_WIDTHS = [4, 50, 60, 10, 6, 8, 40, 20, 40]
HEADERS = [
    "No.",
    "タイトル",
    "説明",
    "カテゴリ",
    "優先度",
    "ステータス",
    "対象URL",
    "対象箇所",
    "期待効果",
]


def create_improvements_sheet(workbook, improvements: list, formats: dict):
    """改善提案シートを作成。"""
    if not improvements:
        return None

    ws = workbook.add_worksheet(safe_sheet_name("改善提案"))

    # 列幅
    for c, w in enumerate(COL_WIDTHS):
        ws.set_column(c, c, w)

    # ヘッダー
    ws.set_row(0, 28)
    for c, h in enumerate(HEADERS):
        ws.write(0, c, h, formats["header"])

    # データ行（order → createdAt 順にソート）
    sorted_items = sorted(improvements, key=lambda x: (
        x.get("order") if x.get("order") is not None else 999999,
        _get_timestamp(x.get("createdAt")),
    ))

    for idx, item in enumerate(sorted_items):
        row = idx + 1
        ws.set_row(row, max(22, _estimate_row_height(item)))

        ws.write_number(row, 0, idx + 1, formats["number"])
        ws.write(row, 1, item.get("title") or "", formats["data"])
        ws.write(row, 2, (item.get("description") or "").strip(), formats["data"])

        cat = item.get("category") or ""
        ws.write(row, 3, CATEGORY_LABELS.get(cat, cat), formats["data"])

        pri = item.get("priority") or ""
        ws.write(row, 4, PRIORITY_LABELS.get(pri, pri), formats["data"])

        status = item.get("status") or ""
        ws.write(row, 5, STATUS_LABELS.get(status, status), formats["data"])

        ws.write(row, 6, (item.get("targetPageUrl") or "").strip(), formats["data"])
        ws.write(row, 7, item.get("targetArea") or "", formats["data"])
        ws.write(row, 8, item.get("expectedImpact") or "", formats["data"])

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
