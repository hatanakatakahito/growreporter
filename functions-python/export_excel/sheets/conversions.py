"""
コンバージョン一覧シート: 月次 × イベント種別の CV 数マトリクス
JS 側の createConversionsSheet 相当。
"""

from ..helpers import append_ai_and_memo_sections, fmt_year_month, safe_sheet_name
from ..sheet_builder import write_sheet_title_bar
from ..styles import FOOTER_TEXT


def create_conversions_sheet(workbook, conversions: dict, conversion_events: list, ai_data: dict | None, memos: list | None, formats: dict, sheet_subtitle: str | None = None):
    """コンバージョン一覧シートを作成。"""
    ws = workbook.add_worksheet(safe_sheet_name("コンバージョン一覧"))
    ws.hide_gridlines(2)
    ws.set_footer(FOOTER_TEXT)

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

    # シートタイトルバー (行 0-2)
    title_next_row = write_sheet_title_bar(ws, "コンバージョン一覧", sheet_subtitle, num_cols, formats)

    # ヘッダー行
    header_row = title_next_row
    ws.set_row(header_row, 28)
    for c, h in enumerate(headers):
        ws.write(header_row, c, h, formats["header"])

    # データ行（ゼブラ）
    row_idx = header_row + 1
    totals = [0] * len(event_names)
    data_idx = 0
    for entry in monthly_data:
        if not isinstance(entry, dict):
            continue
        is_alt = (data_idx % 2 == 1)
        data_fmt = formats["data_alt"] if is_alt else formats["data"]
        num_fmt = formats["number_alt"] if is_alt else formats["number"]

        month_label = fmt_year_month(entry.get("label") or entry.get("month") or entry.get("yearMonth") or "")
        ws.set_row(row_idx, 22)
        ws.write(row_idx, 0, month_label, data_fmt)
        row_total = 0
        for c, ev in enumerate(event_names, start=1):
            val = entry.get(ev, 0)
            try:
                num = float(val or 0)
            except (ValueError, TypeError):
                num = 0
            ws.write_number(row_idx, c, num, num_fmt)
            totals[c - 1] += num
            row_total += num
        ws.write_number(row_idx, num_cols - 1, row_total, num_fmt)
        row_idx += 1
        data_idx += 1

    # 合計行
    if row_idx > header_row + 1:
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
