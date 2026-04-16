"""
動的カラムシート生成 (buildDynamicSheet の Python 版)

クライアント側から送られる:
  - visible_columns: [{ key, label, format, comparison }, ...]
  - rows: [{ key: value, ... }, ...]
  - comp_rows: [{ ... }, ...] or None (比較モード時)
  - comp_join_key: 'date' | 'channelName' | 'source' | 'path' | None

Python 側はすでに解決された可視列情報を受け取るだけなので
localStorage の解決ロジックは不要 (クライアント側で完了済み)。
"""

from typing import Any

from .charts import insert_chart_for_sheet
from .helpers import (
    append_ai_and_memo_sections,
    calc_row_height,
    compute_totals_row,
    fmt_change,
    format_cell_for_export,
)


def _default_col_width(col: dict) -> int:
    """列定義に応じたデフォルト幅を返す。"""
    key = col.get("key", "")
    fmt = col.get("format")

    # 文字列系 (ラベル列)
    if col.get("required") or fmt is None or fmt == "string":
        if key in ("path", "linkUrl", "fileName", "keyword", "source"):
            return 36
        if key in ("channelName", "category"):
            return 22
        return 16

    if fmt == "number":
        return 14
    if fmt == "percent":
        return 12
    if fmt == "decimal":
        return 12
    if fmt == "duration":
        return 12
    return 14


def build_dynamic_sheet(
    workbook,
    sheet_name: str,
    visible_columns: list[dict],
    rows: list[dict],
    comp_rows: list[dict] | None,
    comp_join_key: str | None,
    ai_data: dict | None,
    memos: list | None,
    formats: dict,
    chart_key: str | None = None,
):
    """
    動的列対応シートを作成し workbook に追加。
    戻り値: ワークシートオブジェクト
    """
    ws = workbook.add_worksheet(sheet_name)

    if not visible_columns:
        ws.set_column(0, 0, 20)
        ws.write(0, 0, "データなし", formats["header"])
        return ws

    is_comparing = comp_rows is not None

    # 比較行の索引 (join キーありなら dict, なしなら index)
    comp_map: dict[Any, dict] = {}
    if is_comparing and comp_join_key:
        for c in comp_rows:
            k = c.get(comp_join_key)
            if k is not None:
                comp_map[k] = c

    # ヘッダー組み立て
    headers: list[str] = []
    col_widths: list[int] = []
    # out_cols[i] = {'type': 'current'|'prev'|'delta', 'col': col_def}
    out_cols: list[dict] = []

    for col in visible_columns:
        headers.append(col["label"])
        col_widths.append(_default_col_width(col))
        out_cols.append({"type": "current", "col": col})

        if is_comparing and col.get("comparison"):
            headers.append("前期")
            col_widths.append(_default_col_width(col))
            out_cols.append({"type": "prev", "col": col})

            headers.append("変化率")
            col_widths.append(10)
            out_cols.append({"type": "delta", "col": col})

    # 列幅を設定
    for c, w in enumerate(col_widths):
        ws.set_column(c, c, w)

    # ヘッダー行 (行 0)
    ws.set_row(0, 28)
    for c, header in enumerate(headers):
        ws.write(0, c, header, formats["header"])

    # データ行
    data_rows: list[list[Any]] = []
    for idx, row in enumerate(rows):
        if is_comparing:
            if comp_join_key:
                comp_row = comp_map.get(row.get(comp_join_key))
            else:
                comp_row = comp_rows[idx] if idx < len(comp_rows) else None
        else:
            comp_row = None

        out_row: list[Any] = []
        for out_col in out_cols:
            col = out_col["col"]
            col_type = out_col["type"]
            if col_type == "current":
                out_row.append(format_cell_for_export(col, row.get(col["key"])))
            elif col_type == "prev":
                out_row.append(format_cell_for_export(col, comp_row.get(col["key"]) if comp_row else None))
            else:  # delta
                cur = row.get(col["key"])
                prv = comp_row.get(col["key"]) if comp_row else None
                out_row.append(fmt_change(cur, prv))
        data_rows.append(out_row)

    # データ行を書き込み
    for r, row_vals in enumerate(data_rows, start=1):
        row_height = calc_row_height(row_vals, col_widths)
        ws.set_row(r, row_height)
        for c, val in enumerate(row_vals):
            col = out_cols[c]["col"]
            col_type = out_cols[c]["type"]
            _write_value(ws, r, c, val, col, col_type, formats)

    # 合計/平均行
    next_row = len(data_rows) + 1
    if data_rows:
        totals = compute_totals_row(headers, data_rows, out_cols)
        ws.set_row(next_row, 24)
        for c, (val, kind) in enumerate(zip(totals["values"], totals["kinds"])):
            if kind == "label":
                ws.write(next_row, c, val, formats["total_label"])
            elif kind == "number":
                ws.write(next_row, c, val, formats["total_number"])
            elif kind == "text":
                ws.write(next_row, c, val, formats["total_text"])
            else:
                ws.write(next_row, c, "", formats["total_text"])
        next_row += 1

    # AI 分析 + メモセクション
    append_ai_and_memo_sections(
        ws,
        workbook,
        next_row,
        len(headers),
        ai_data,
        memos,
        formats["ai_header"],
        formats["ai_content"],
        formats["memo_header"],
        formats["memo_content"],
    )

    # ネイティブチャート挿入 (比較モード時はスキップ: current 列の index が乱れるため)
    if chart_key and not is_comparing:
        insert_chart_for_sheet(
            workbook=workbook,
            ws=ws,
            sheet_key=chart_key,
            visible_columns=visible_columns,
            rows=rows,
            data_start_row=1,
        )

    return ws


def _write_value(ws, r: int, c: int, val: Any, col: dict, col_type: str, formats: dict):
    """セル値を適切なフォーマットで書き込む。"""
    if col_type == "delta":
        # 変化率は常に文字列
        ws.write(r, c, val, formats["text_right"])
        return

    if val == "-" or val is None:
        ws.write(r, c, "-", formats["text_right"])
        return

    fmt = col.get("format")

    if fmt == "number" and isinstance(val, (int, float)):
        ws.write_number(r, c, val, formats["number"])
    elif fmt == "decimal" and isinstance(val, (int, float)):
        ws.write_number(r, c, val, formats["decimal"])
    elif fmt == "percent":
        # val は "X.XX%" 文字列
        ws.write_string(r, c, str(val), formats["text_right"])
    elif fmt == "duration":
        ws.write_string(r, c, str(val), formats["text_right"])
    else:
        ws.write(r, c, val, formats["data"])
