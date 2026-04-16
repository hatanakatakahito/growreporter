"""
全体サマリーシート: 主要指標 + KPI 目標達成率 + CV 内訳
JS 側の createSummarySheet と同等。
"""

from typing import Any

from ..charts import CHART_COLORS
from ..helpers import append_ai_and_memo_sections, fmt_change, safe_sheet_name


def create_summary_sheet(
    workbook,
    summary_metrics: dict,
    comp_summary_metrics: dict | None,
    kpi_settings: dict | None,
    ai_data: dict | None,
    memos: list | None,
    formats: dict,
):
    """全体サマリーシートを作成。"""
    ws = workbook.add_worksheet(safe_sheet_name("全体サマリー"))

    # 列幅
    ws.set_column(0, 0, 20)
    ws.set_column(1, 1, 16)
    ws.set_column(2, 2, 16)
    ws.set_column(3, 3, 12)

    row = 0
    metrics = summary_metrics.get("metrics") or {}
    comp_metrics = (comp_summary_metrics or {}).get("metrics") or {}
    has_comp = bool(comp_summary_metrics)

    # ─── セクション 1: 主要指標 ─────────────────────────
    if has_comp:
        headers = ["指標", "当期", "前期", "変化率"]
    else:
        headers = ["指標", "値"]

    # セクションタイトル
    ws.set_row(row, 26)
    ws.merge_range(row, 0, row, len(headers) - 1, "■ 主要指標", formats["header"])
    row += 1

    # ヘッダー行
    ws.set_row(row, 24)
    for c, h in enumerate(headers):
        ws.write(row, c, h, formats["header"])
    row += 1

    # データ行
    metric_labels = [
        ("sessions", "セッション数", "number"),
        ("totalUsers", "ユーザー数", "number"),
        ("newUsers", "新規ユーザー", "number"),
        ("pageViews", "PV 数", "number"),
        ("engagementRate", "エンゲージメント率", "percent"),
        ("conversions", "コンバージョン数", "number"),
        ("clicks", "GSC クリック数", "number"),
        ("impressions", "GSC 表示回数", "number"),
        ("ctr", "GSC CTR", "percent"),
        ("position", "GSC 平均掲載順位", "decimal"),
    ]

    for key, label, kind in metric_labels:
        cur_val = metrics.get(key, 0)
        if cur_val in (None, 0) and not has_comp:
            continue

        ws.set_row(row, 22)
        ws.write(row, 0, label, formats["data"])
        _write_metric(ws, row, 1, cur_val, kind, formats)

        if has_comp:
            prev_val = comp_metrics.get(key, 0)
            _write_metric(ws, row, 2, prev_val, kind, formats)
            change = fmt_change(cur_val, prev_val)
            ws.write(row, 3, change, formats["text_right"])

        row += 1

    # ─── セクション 2: KPI 目標達成率 ─────────────────────
    if kpi_settings and isinstance(kpi_settings, dict):
        row += 1
        kpi_headers = ["KPI 指標", "目標値", "実績値", "達成率"]

        ws.set_row(row, 26)
        ws.merge_range(row, 0, row, 3, "■ KPI 目標達成率", formats["header"])
        row += 1

        ws.set_row(row, 24)
        for c, h in enumerate(kpi_headers):
            ws.write(row, c, h, formats["header"])
        row += 1

        kpi_targets = [
            ("sessionsTarget", "セッション数", metrics.get("sessions", 0)),
            ("usersTarget", "ユーザー数", metrics.get("totalUsers", 0)),
            ("conversionsTarget", "コンバージョン数", metrics.get("conversions", 0)),
        ]
        for target_key, label, actual in kpi_targets:
            target = kpi_settings.get(target_key)
            if target is None:
                continue
            try:
                target_f = float(target)
                actual_f = float(actual or 0)
                rate = (actual_f / target_f * 100) if target_f > 0 else 0
                ws.set_row(row, 22)
                ws.write(row, 0, label, formats["data"])
                ws.write_number(row, 1, target_f, formats["number"])
                ws.write_number(row, 2, actual_f, formats["number"])
                ws.write(row, 3, f"{rate:.1f}%", formats["text_right"])
                row += 1
            except (ValueError, TypeError):
                continue

    # ─── セクション 3: CV 内訳 ──────────────────────────
    conversions_breakdown = summary_metrics.get("conversions") or {}
    if isinstance(conversions_breakdown, dict) and conversions_breakdown:
        row += 1
        ws.set_row(row, 26)
        ws.merge_range(row, 0, row, 1, "■ コンバージョン内訳", formats["header"])
        row += 1

        ws.set_row(row, 24)
        ws.write(row, 0, "イベント名", formats["header"])
        ws.write(row, 1, "回数", formats["header"])
        row += 1

        cv_data_start_row = row
        for event_name, count in conversions_breakdown.items():
            try:
                cnt = float(count or 0)
                if cnt <= 0:
                    continue
                ws.set_row(row, 22)
                ws.write(row, 0, event_name, formats["data"])
                ws.write_number(row, 1, cnt, formats["number"])
                row += 1
            except (ValueError, TypeError):
                continue

        # CV内訳の円グラフ（データラベル付き）
        cv_data_end_row = row - 1
        if cv_data_end_row >= cv_data_start_row:
            pie_chart = workbook.add_chart({"type": "pie"})
            num_points = cv_data_end_row - cv_data_start_row + 1
            pie_chart.add_series({
                "name": "コンバージョン内訳",
                "categories": [ws.name, cv_data_start_row, 0, cv_data_end_row, 0],
                "values": [ws.name, cv_data_start_row, 1, cv_data_end_row, 1],
                "data_labels": {
                    "value": True,
                    "percentage": True,
                    "category": False,
                    "num_format": "#,##0",
                    "separator": "\n",
                    "position": "outside_end",
                    "font": {"name": "Yu Gothic", "size": 8},
                },
                "points": [{"fill": {"color": CHART_COLORS[i % len(CHART_COLORS)]}} for i in range(num_points)],
            })
            pie_chart.set_title({"name": "コンバージョン内訳", "name_font": {"name": "Yu Gothic", "bold": True, "size": 12}})
            pie_chart.set_legend({"position": "right", "font": {"bold": False}})
            pie_chart.set_size({"width": 480, "height": 360})
            pie_chart.set_style(2)
            pie_chart.set_plotarea({"border": {"none": True}, "shadow": False, "fill": {"none": True}})
            pie_chart.set_chartarea({"border": {"none": True}, "shadow": False, "fill": {"none": True}})
            ws.insert_chart(cv_data_start_row - 2, 3, pie_chart)

    # AI + メモセクション
    append_ai_and_memo_sections(
        ws,
        workbook,
        row,
        4,
        ai_data,
        memos,
        formats["ai_header"],
        formats["ai_content"],
        formats["memo_header"],
        formats["memo_content"],
    )

    return ws


def _write_metric(ws, row: int, col: int, value: Any, kind: str, formats: dict):
    """メトリクス値を種類に応じて書き込み。"""
    if value is None:
        ws.write(row, col, "-", formats["text_right"])
        return
    try:
        v = float(value)
    except (ValueError, TypeError):
        ws.write(row, col, "-", formats["text_right"])
        return

    if kind == "number":
        ws.write_number(row, col, v, formats["number"])
    elif kind == "decimal":
        ws.write_number(row, col, v, formats["decimal"])
    elif kind == "percent":
        pct = v * 100 if abs(v) <= 1 else v
        ws.write(row, col, f"{pct:.2f}%", formats["text_right"])
    else:
        ws.write(row, col, str(v), formats["text_right"])
