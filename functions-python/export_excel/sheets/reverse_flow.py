"""
逆算フローシート: フォームページ到達 → CV 完了までのファネル
JS 側の createReverseFlowSheet 相当。
ファネル縦棒チャート付き。
"""

from ..charts import CHART_COLORS
from ..helpers import append_ai_and_memo_sections, fmt_year_month, safe_sheet_name
from ..sheet_builder import write_sheet_title_bar
from ..styles import FOOTER_TEXT


def create_reverse_flow_sheet(workbook, reverse_flows: list, ai_data: dict | None, memos: list | None, formats: dict, sheet_subtitle: str | None = None):
    """逆算フローシートを作成。"""
    ws = workbook.add_worksheet(safe_sheet_name("逆算フロー"))
    ws.hide_gridlines(2)
    ws.set_footer(FOOTER_TEXT)

    ws.set_column(0, 0, 20)
    ws.set_column(1, 1, 16)
    ws.set_column(2, 2, 16)
    ws.set_column(3, 3, 16)
    ws.set_column(4, 4, 14)
    ws.set_column(5, 5, 14)

    # シートタイトルバー (行 0-2)
    row = write_sheet_title_bar(ws, "逆算フロー", sheet_subtitle, 6, formats)
    first_flow = True

    for flow in reverse_flows:
        if not isinstance(flow, dict):
            continue

        flow_name = flow.get("flowName") or "名称未設定"
        form_path = flow.get("formPagePath") or "-"
        target_cv = flow.get("targetCvEvent") or "-"

        # フロー名ヘッダー（■ セクション帯）
        if not first_flow:
            row += 1
        first_flow = False
        ws.set_row(row, 26)
        ws.merge_range(row, 0, row, 5, f"■ {flow_name}", formats["section_marker"])
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

        # サマリー + ファネルチャート
        summary = flow.get("summary") or {}
        if summary:
            row += 1
            ws.set_row(row, 24)
            ws.write(row, 0, "項目", formats["header"])
            ws.write(row, 1, "値", formats["header"])
            row += 1

            funnel_start_row = row
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
            funnel_end_row = row - 1

            # ファネルチャート（サイト全体 → フォーム到達 → CV完了 + 遷移率表示）
            if funnel_end_row >= funnel_start_row:
                site_val = float(summary.get("totalSiteViews") or 0)
                form_val = float(summary.get("formPageViews") or 0)
                reach_pct = f"{form_val / site_val * 100:.2f}%" if site_val > 0 else "0%"
                cv_val = float(summary.get("submissionComplete") or 0)
                cv_pct = f"{cv_val / form_val * 100:.2f}%" if form_val > 0 else "0%"

                funnel_chart = workbook.add_chart({"type": "column"})
                funnel_chart.add_series({
                    "name": flow_name,
                    "categories": [ws.name, funnel_start_row, 0, funnel_end_row, 0],
                    "values": [ws.name, funnel_start_row, 1, funnel_end_row, 1],
                    "data_labels": {
                        "value": True,
                        "num_format": "#,##0",
                        "font": {"name": "Yu Gothic", "size": 9},
                        "position": "outside_end",
                    },
                    "points": [
                        {"fill": {"color": CHART_COLORS[0]}},
                        {"fill": {"color": CHART_COLORS[1]}},
                        {"fill": {"color": CHART_COLORS[3]}},
                    ],
                    "gap": 60,
                })
                funnel_chart.set_title({
                    "name": f"{flow_name} ファネル\n到達率: {reach_pct} ／ CV率: {cv_pct}",
                    "name_font": {"name": "Yu Gothic", "bold": True, "size": 11},
                })
                funnel_chart.set_style(2)
                funnel_chart.set_plotarea({"border": {"none": True}, "shadow": False, "fill": {"none": True}})
                funnel_chart.set_chartarea({"border": {"none": True}, "shadow": False, "fill": {"none": True}})
                funnel_chart.set_legend({"none": True})
                axis_font = {"name": "Yu Gothic", "size": 9}
                funnel_chart.set_x_axis({"num_font": axis_font})
                funnel_chart.set_y_axis({"num_font": axis_font, "num_format": "#,##0"})
                funnel_chart.set_size({"width": 420, "height": 320})
                # 月次テーブルの右横に配置
                ws.insert_chart(row + 1, 7, funnel_chart)

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
        ai_placeholder_fmt=formats.get("ai_placeholder"),
    )

    return ws
