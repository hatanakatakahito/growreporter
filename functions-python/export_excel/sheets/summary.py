"""
全体サマリーシート: 主要 KPI + KPI 目標達成率 + CV 内訳 + AI 所感
v5.11.1 リデザイン: サンプル準拠の ■ セクション + 補足列付き 3 列 KPI 表
"""

from typing import Any

from ..charts import CHART_COLORS
from ..helpers import append_ai_and_memo_sections, fmt_change, safe_sheet_name
from ..sheet_builder import write_sheet_title_bar
from ..styles import FOOTER_TEXT


METRIC_LABELS = [
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


def create_summary_sheet(
    workbook,
    summary_metrics: dict,
    comp_summary_metrics: dict | None,
    kpi_settings: dict | None,
    ai_data: dict | None,
    memos: list | None,
    formats: dict,
    sheet_subtitle: str | None = None,
    monthly_delta: dict | None = None,
):
    """全体サマリーシートを作成。

    monthly_delta: 通常モード時の補足列用データ
        { metricKey: { 'mom': float|None, 'yoy': float|None } }
        mom = 前月比（小数: 0.123 → +12.3%）, yoy = 前年同月比
    """
    ws = workbook.add_worksheet(safe_sheet_name("全体サマリー"))
    ws.hide_gridlines(2)
    ws.set_footer(FOOTER_TEXT)

    # 列幅
    ws.set_column(0, 0, 22)
    ws.set_column(1, 1, 16)
    ws.set_column(2, 2, 32)
    ws.set_column(3, 3, 14)

    metrics = summary_metrics.get("metrics") or {}
    comp_metrics = (comp_summary_metrics or {}).get("metrics") or {}
    has_comp = bool(comp_summary_metrics)
    monthly_delta = monthly_delta or {}

    # シートタイトルバー (4 列分)
    row = write_sheet_title_bar(ws, "全体サマリー", sheet_subtitle, 4, formats)

    # ─── ■ 主要 KPI ─────────────────────────────────────
    row = _write_section_marker(ws, row, "■ 主要 KPI", 4, formats)

    # ヘッダー: 比較モード時は 4 列、通常モード時は 3 列
    if has_comp:
        kpi_headers = ["指標", "当期", "前期", "変化率"]
    else:
        kpi_headers = ["指標", "値", "補足", ""]

    ws.set_row(row, 24)
    if has_comp:
        for c, h in enumerate(kpi_headers):
            ws.write(row, c, h, formats["header"])
    else:
        ws.write(row, 0, "指標", formats["header"])
        ws.write(row, 1, "値", formats["header"])
        ws.merge_range(row, 2, row, 3, "前月比 / 前年同月比", formats["header"])
    row += 1

    # データ行（ゼブラ）
    data_idx = 0
    for key, label, kind in METRIC_LABELS:
        cur_val = metrics.get(key, 0)
        if cur_val in (None, 0) and not has_comp:
            continue

        is_alt = (data_idx % 2 == 1)
        data_fmt = formats["data_alt"] if is_alt else formats["data"]
        txt_fmt = formats["text_right_alt"] if is_alt else formats["text_right"]

        ws.set_row(row, 22)
        ws.write(row, 0, label, data_fmt)
        _write_metric(ws, row, 1, cur_val, kind, formats, is_alt=is_alt)

        if has_comp:
            prev_val = comp_metrics.get(key, 0)
            _write_metric(ws, row, 2, prev_val, kind, formats, is_alt=is_alt)
            change = fmt_change(cur_val, prev_val)
            ws.write(row, 3, change, txt_fmt)
        else:
            # 通常モード: 補足列に 前月比 / 前年同月比 を併記
            note = _format_mom_yoy(monthly_delta.get(key))
            ws.merge_range(row, 2, row, 3, note, txt_fmt)
        row += 1
        data_idx += 1

    # ─── ■ KPI 目標達成率 ─────────────────────────────
    if kpi_settings and isinstance(kpi_settings, dict):
        kpi_targets = [
            ("sessionsTarget", "セッション数", metrics.get("sessions", 0)),
            ("usersTarget", "ユーザー数", metrics.get("totalUsers", 0)),
            ("conversionsTarget", "コンバージョン数", metrics.get("conversions", 0)),
        ]
        valid = [(t, l, a) for t, l, a in kpi_targets if kpi_settings.get(t) is not None]
        if valid:
            row += 1
            row = _write_section_marker(ws, row, "■ KPI 目標達成率", 4, formats)

            ws.set_row(row, 24)
            for c, h in enumerate(["KPI 指標", "目標値", "実績値", "達成率"]):
                ws.write(row, c, h, formats["header"])
            row += 1

            for idx, (target_key, label, actual) in enumerate(valid):
                target = kpi_settings.get(target_key)
                try:
                    target_f = float(target)
                    actual_f = float(actual or 0)
                    rate = (actual_f / target_f * 100) if target_f > 0 else 0
                    is_alt = (idx % 2 == 1)
                    data_fmt = formats["data_alt"] if is_alt else formats["data"]
                    num_fmt = formats["number_alt"] if is_alt else formats["number"]
                    txt_fmt = formats["text_right_alt"] if is_alt else formats["text_right"]
                    ws.set_row(row, 22)
                    ws.write(row, 0, label, data_fmt)
                    ws.write_number(row, 1, target_f, num_fmt)
                    ws.write_number(row, 2, actual_f, num_fmt)
                    ws.write(row, 3, f"{rate:.1f}%", txt_fmt)
                    row += 1
                except (ValueError, TypeError):
                    continue

    # ─── ■ コンバージョン内訳 ──────────────────────────
    conversions_breakdown = summary_metrics.get("conversions") or {}
    if isinstance(conversions_breakdown, dict) and conversions_breakdown:
        row += 1
        row = _write_section_marker(ws, row, "■ コンバージョン内訳", 4, formats)

        ws.set_row(row, 24)
        ws.write(row, 0, "イベント名", formats["header"])
        ws.write(row, 1, "回数", formats["header"])
        # CV 内訳は 2 列だけ使うので右の 2 列はチャート領域
        ws.write(row, 2, "", formats["header"])
        ws.write(row, 3, "", formats["header"])
        row += 1

        cv_data_start_row = row
        cv_idx = 0
        for event_name, count in conversions_breakdown.items():
            try:
                cnt = float(count or 0)
                if cnt <= 0:
                    continue
                is_alt = (cv_idx % 2 == 1)
                data_fmt = formats["data_alt"] if is_alt else formats["data"]
                num_fmt = formats["number_alt"] if is_alt else formats["number"]
                ws.set_row(row, 22)
                ws.write(row, 0, event_name, data_fmt)
                ws.write_number(row, 1, cnt, num_fmt)
                row += 1
                cv_idx += 1
            except (ValueError, TypeError):
                continue

        cv_data_end_row = row - 1
        if cv_data_end_row >= cv_data_start_row:
            pie_chart = workbook.add_chart({"type": "pie"})
            num_points = cv_data_end_row - cv_data_start_row + 1
            pie_chart.add_series({
                "name": "コンバージョン内訳",
                "categories": [ws.name, cv_data_start_row, 0, cv_data_end_row, 0],
                "values": [ws.name, cv_data_start_row, 1, cv_data_end_row, 1],
                "data_labels": {
                    "value": False,
                    "percentage": True,
                    "category": False,
                    "position": "outside_end",
                    "font": {"name": "Yu Gothic", "size": 9, "bold": True},
                    "num_format": "0.0%",
                },
                "points": [{"fill": {"color": CHART_COLORS[i % len(CHART_COLORS)]}} for i in range(num_points)],
            })
            pie_chart.set_title({"name": "コンバージョン内訳", "name_font": {"name": "Yu Gothic", "bold": True, "size": 12}})
            pie_chart.set_legend({"position": "right", "font": {"name": "Yu Gothic", "bold": False, "size": 9}})
            pie_chart.set_size({"width": 480, "height": 360})
            pie_chart.set_style(2)
            pie_chart.set_plotarea({"border": {"none": True}, "shadow": False, "fill": {"none": True}})
            pie_chart.set_chartarea({"border": {"none": True}, "shadow": False, "fill": {"none": True}})
            ws.insert_chart(cv_data_start_row - 2, 5, pie_chart)

    # ─── ■ AI による所感（AI 分析がある場合）───────────
    # AI セクションは既存ヘルパーで追加（紫系のヘッダ + 内容）
    row += 1
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


def _write_section_marker(ws, row: int, label: str, num_cols: int, formats: dict) -> int:
    """■ セクションマーカー行を書き込み、次の行番号を返す。"""
    ws.set_row(row, 26)
    end_col = max(0, num_cols - 1)
    if end_col > 0:
        ws.merge_range(row, 0, row, end_col, label, formats["section_marker"])
    else:
        ws.write(row, 0, label, formats["section_marker"])
    return row + 1


def _format_mom_yoy(delta: dict | None) -> str:
    """通常モードの補足列: 前月比 / 前年同月比 を併記。"""
    if not delta or not isinstance(delta, dict):
        return "ー"

    def pct(v):
        if v is None:
            return None
        try:
            f = float(v) * 100
            sign = "+" if f >= 0 else ""
            return f"{sign}{f:.1f}%"
        except (ValueError, TypeError):
            return None

    mom = pct(delta.get("mom"))
    yoy = pct(delta.get("yoy"))

    parts = []
    if mom is not None:
        parts.append(f"前月比 {mom}")
    if yoy is not None:
        parts.append(f"前年同月 {yoy}")
    return "  /  ".join(parts) if parts else "ー"


def _write_metric(ws, row: int, col: int, value: Any, kind: str, formats: dict, is_alt: bool = False):
    """メトリクス値を種類に応じて書き込み。"""
    num_fmt = formats["number_alt"] if is_alt else formats["number"]
    dec_fmt = formats["decimal_alt"] if is_alt else formats["decimal"]
    txt_fmt = formats["text_right_alt"] if is_alt else formats["text_right"]

    if value is None:
        ws.write(row, col, "-", txt_fmt)
        return
    try:
        v = float(value)
    except (ValueError, TypeError):
        ws.write(row, col, "-", txt_fmt)
        return

    if kind == "number":
        ws.write_number(row, col, v, num_fmt)
    elif kind == "decimal":
        ws.write_number(row, col, v, dec_fmt)
    elif kind == "percent":
        pct = v * 100 if abs(v) <= 1 else v
        ws.write(row, col, f"{pct:.2f}%", txt_fmt)
    else:
        ws.write(row, col, str(v), txt_fmt)
