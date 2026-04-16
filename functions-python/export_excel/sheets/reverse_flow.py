"""
逆算フローシート: フォームページ到達 → CV 完了までのファネル
JS 側の createReverseFlowSheet 相当。
"""

from ..helpers import append_ai_and_memo_sections, fmt_year_month, safe_sheet_name


def create_reverse_flow_sheet(workbook, reverse_flows: list, ai_data: dict | None, memos: list | None, formats: dict):
    """逆算フローシートを作成。"""
    ws = workbook.add_worksheet(safe_sheet_name("逆算フロー"))

    ws.set_column(0, 0, 20)
    ws.set_column(1, 1, 16)
    ws.set_column(2, 2, 16)
    ws.set_column(3, 3, 16)
    ws.set_column(4, 4, 14)
    ws.set_column(5, 5, 14)

    row = 0

    for flow in reverse_flows:
        if not isinstance(flow, dict):
            continue

        flow_name = flow.get("flowName") or "名称未設定"
        form_path = flow.get("formPagePath") or "-"
        target_cv = flow.get("targetCvEvent") or "-"

        # フロー名ヘッダー
        if row > 0:
            row += 1
        ws.set_row(row, 28)
        ws.merge_range(row, 0, row, 5, f"▼ {flow_name}", formats["header"])
        row += 1

        # 設定情報
        ws.set_row(row, 22)
        ws.write(row, 0, "フォームページ", formats["data"])
        ws.merge_range(row, 1, row, 5, form_path, formats["data"])
        row += 1

        ws.set_row(row, 22)
        ws.write(row, 0, "CV イベント", formats["data"])
        ws.merge_range(row, 1, row, 5, target_cv, formats["data"])
        row += 1

        # サマリー
        summary = flow.get("summary") or {}
        if summary:
            row += 1
            ws.set_row(row, 24)
            ws.write(row, 0, "項目", formats["header"])
            ws.write(row, 1, "値", formats["header"])
            row += 1

            summary_rows = [
                ("サイト全体セッション", summary.get("totalSiteViews")),
                ("フォームページ到達", summary.get("formPageViews")),
                ("CV 完了", summary.get("submissionComplete")),
            ]
            for label, val in summary_rows:
                if val is None:
                    continue
                ws.set_row(row, 22)
                ws.write(row, 0, label, formats["data"])
                try:
                    ws.write_number(row, 1, float(val), formats["number"])
                except (ValueError, TypeError):
                    ws.write(row, 1, 0, formats["number"])
                row += 1

        # 月次テーブル
        monthly_table = flow.get("monthlyTable") or []
        if monthly_table:
            row += 1
            headers = ["月", "サイト全体", "フォーム到達", "CV 完了", "到達率", "CV率"]
            ws.set_row(row, 24)
            for c, h in enumerate(headers):
                ws.write(row, c, h, formats["header"])
            row += 1

            for entry in monthly_table:
                if not isinstance(entry, dict):
                    continue
                ws.set_row(row, 22)
                ws.write(row, 0, fmt_year_month(entry.get("label") or entry.get("month") or entry.get("yearMonth") or ""), formats["data"])

                site = float(entry.get("totalSiteViews") or 0)
                form = float(entry.get("formPageViews") or 0)
                cv = float(entry.get("submissionComplete") or 0)

                ws.write_number(row, 1, site, formats["number"])
                ws.write_number(row, 2, form, formats["number"])
                ws.write_number(row, 3, cv, formats["number"])

                reach_rate = (form / site * 100) if site > 0 else 0
                cv_rate = (cv / form * 100) if form > 0 else 0
                ws.write(row, 4, f"{reach_rate:.2f}%", formats["text_right"])
                ws.write(row, 5, f"{cv_rate:.2f}%", formats["text_right"])
                row += 1

    # AI + メモ
    append_ai_and_memo_sections(
        ws,
        workbook,
        row,
        6,
        ai_data,
        memos,
        formats["ai_header"],
        formats["ai_content"],
        formats["memo_header"],
        formats["memo_content"],
    )

    return ws
