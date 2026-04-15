"""
レポート概要 (表紙) シート
JS 側の createCoverSheet と同等のレイアウト。
"""

from datetime import datetime

from ..helpers import safe_sheet_name


def create_cover_sheet(workbook, site_name: str, site_url: str, date_range: dict, comp_date_range: dict | None, formats: dict):
    """表紙シートを作成。"""
    ws = workbook.add_worksheet(safe_sheet_name("レポート概要"))

    # 列幅
    ws.set_column(0, 0, 3)
    ws.set_column(1, 1, 18)
    ws.set_column(2, 2, 30)
    ws.set_column(3, 3, 20)
    ws.set_column(4, 4, 15)
    ws.set_column(5, 5, 3)

    # タイトル
    ws.set_row(1, 36)
    ws.merge_range(1, 1, 1, 4, f"{site_name} 分析レポート", formats["cover_title"])

    # サブタイトル
    ws.set_row(2, 22)
    ws.merge_range(2, 1, 2, 4, "GA4 / GSC データ + AI 分析", formats["cover_label"])

    # 情報テーブル
    row = 5
    info_rows = [
        ("サイト名", site_name),
        ("サイト URL", site_url or "-"),
    ]

    if date_range.get("from") and date_range.get("to"):
        info_rows.append(("分析期間", f"{date_range['from']} 〜 {date_range['to']}"))
    if comp_date_range and comp_date_range.get("from") and comp_date_range.get("to"):
        info_rows.append(("比較期間", f"{comp_date_range['from']} 〜 {comp_date_range['to']}"))

    info_rows.append(("生成日時", datetime.now().strftime("%Y/%m/%d %H:%M")))

    for label, value in info_rows:
        ws.set_row(row, 22)
        ws.write(row, 1, label, formats["cover_label"])
        ws.merge_range(row, 2, row, 4, value, formats["cover_value"])
        row += 1

    return ws
