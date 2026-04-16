"""
コンバージョン一覧シート: 月次 × イベント種別の CV 数マトリクス
JS 側の createConversionsSheet 相当。
"""

from ..helpers import append_ai_and_memo_sections, fmt_year_month, safe_sheet_name


def create_conversions_sheet(workbook, conversions: dict, conversion_events: list, ai_data: dict | None, memos: list | None, formats: dict):
    """コンバージョン一覧シートを作成。"""
    ws = workbook.add_worksheet(safe_sheet_name("コンバージョン一覧"))

    # conversion_events から全イベント名を抽出
    event_names = []
    if isinstance(conversion_events, list):
        for ev in conversion_events:
            if isinstance(ev, dict):
                name = ev.get("eventName") or ev.get("name")
                if name and name not in event_names:
                    event_names.append(name)
            elif isinstance(ev, str):
                if ev not in event_names:
                    event_names.append(ev)

    # データから発見された追加のイベント名も取り込む
    monthly_data = conversions.get("data") or conversions.get("rows") or []
    for row in monthly_data:
        if isinstance(row, dict):
            for k in row.keys():
                if k not in ("month", "label", "yearMonth", "year_month", "period") and k not in event_names:
                    event_names.append(k)

    # ヘッダー: 月 + 各イベント
    headers = ["月"] + event_names + ["合計"]
    num_cols = len(headers)

    ws.set_column(0, 0, 14)
    for c in range(1, num_cols):
        ws.set_column(c, c, 14)

    # ヘッダー行
    ws.set_row(0, 28)
    for c, h in enumerate(headers):
        ws.write(0, c, h, formats["header"])

    # データ行
    row_idx = 1
    totals = [0] * len(event_names)
    for entry in monthly_data:
        if not isinstance(entry, dict):
            continue
        month_label = fmt_year_month(entry.get("label") or entry.get("month") or entry.get("yearMonth") or "")
        ws.set_row(row_idx, 22)
        ws.write(row_idx, 0, month_label, formats["data"])
        row_total = 0
        for c, ev in enumerate(event_names, start=1):
            val = entry.get(ev, 0)
            try:
                num = float(val or 0)
            except (ValueError, TypeError):
                num = 0
            ws.write_number(row_idx, c, num, formats["number"])
            totals[c - 1] += num
            row_total += num
        ws.write_number(row_idx, num_cols - 1, row_total, formats["number"])
        row_idx += 1

    # 合計行
    if row_idx > 1:
        ws.set_row(row_idx, 24)
        ws.write(row_idx, 0, "合計", formats["total_label"])
        for c, total in enumerate(totals, start=1):
            ws.write_number(row_idx, c, total, formats["total_number"])
        ws.write_number(row_idx, num_cols - 1, sum(totals), formats["total_number"])
        row_idx += 1

    # AI + メモ
    append_ai_and_memo_sections(
        ws,
        workbook,
        row_idx,
        num_cols,
        ai_data,
        memos,
        formats["ai_header"],
        formats["ai_content"],
        formats["memo_header"],
        formats["memo_content"],
    )

    return ws
