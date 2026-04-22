"""
全体サマリーシート: 主要指標 + 目標達成率 + CV 内訳 + AI 所感
v5.11.1 リデザイン: サンプル準拠の ■ セクション + 補足列付き 3 列指標表
"""

import math
from typing import Any

from shared.metrics import METRICS, label_of, summary_metric_rows
from ..charts import CHART_COLORS
from ..helpers import append_ai_and_memo_sections, fmt_change, safe_sheet_name
from ..sheet_builder import write_sheet_title_bar
from ..styles import FOOTER_TEXT


# Excel 全体サマリーで並べる順番を定義（metrics.json の canonical key）
_SUMMARY_METRIC_KEYS = [
    "sessions",
    "totalUsers",
    "newUsers",
    "screenPageViews",  # canonical (旧 pageViews は alias として解決)
    "engagementRate",
    "conversions",
    "clicks",
    "impressions",
    "ctr",
    "position",
]

METRIC_LABELS = summary_metric_rows(_SUMMARY_METRIC_KEYS)


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

    # ─── ■ 主要指標 ─────────────────────────────────────
    row = _write_section_marker(ws, row, "■ 主要指標", 4, formats)

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
        cur_val = _lookup_metric_value(metrics, key)
        if cur_val in (None, 0) and not has_comp:
            continue

        is_alt = (data_idx % 2 == 1)
        data_fmt = formats["data_alt"] if is_alt else formats["data"]
        txt_fmt = formats["text_right_alt"] if is_alt else formats["text_right"]

        ws.set_row(row, 22)
        ws.write(row, 0, label, data_fmt)
        _write_metric(ws, row, 1, cur_val, kind, formats, is_alt=is_alt)

        if has_comp:
            prev_val = _lookup_metric_value(comp_metrics, key)
            _write_metric(ws, row, 2, prev_val, kind, formats, is_alt=is_alt)
            change = fmt_change(cur_val, prev_val)
            ws.write(row, 3, change, txt_fmt)
        else:
            # 通常モード: 補足列に 前月比 / 前年同月比 を併記
            delta = monthly_delta.get(key)
            if delta is None:
                # monthly_delta 側が alias キー (pageViews 等) の可能性に対応
                for alias in (METRICS.get(key, {}).get("aliases") or []):
                    if alias in monthly_delta:
                        delta = monthly_delta[alias]
                        break
            note = _format_mom_yoy(delta)
            ws.merge_range(row, 2, row, 3, note, txt_fmt)
        row += 1
        data_idx += 1

    # ─── ■ 目標達成率 ─────────────────────────────
    if kpi_settings and isinstance(kpi_settings, dict):
        kpi_targets = [
            ("sessionsTarget", label_of("sessions"), metrics.get("sessions", 0)),
            ("usersTarget", label_of("totalUsers"), metrics.get("totalUsers", 0)),
            ("conversionsTarget", label_of("conversions"), metrics.get("conversions", 0)),
        ]
        valid = [(t, l, a) for t, l, a in kpi_targets if kpi_settings.get(t) is not None]
        if valid:
            row += 1
            row = _write_section_marker(ws, row, "■ 目標達成率", 4, formats)

            ws.set_row(row, 24)
            for c, h in enumerate(["目標指標", "目標値", "実績値", "達成率"]):
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

        # ヘッダー: イベント名 (A:C 結合) + 回数 (D)
        ws.set_row(row, 24)
        ws.merge_range(row, 0, row, 2, "イベント名", formats["header"])
        ws.write(row, 3, "回数", formats["header"])
        row += 1

        cv_data_start_row = row
        # まず全件をフィルタ → 全行で均一な行高を決める
        cv_items = []
        for event_name, count in conversions_breakdown.items():
            try:
                cnt = float(count or 0)
                if cnt <= 0:
                    continue
                cv_items.append((str(event_name or ""), cnt))
            except (ValueError, TypeError):
                continue
        # 最長のイベント名から統一行高を算出 (A:C 結合幅 ≒ 22+16+32 = 70 chars)
        merged_width = 70
        max_visual = max((sum(2 if ord(c) > 0x7F else 1 for c in n) for n, _ in cv_items), default=0)
        wrap_lines = max(1, math.ceil(max_visual / merged_width))
        cv_uniform_height = max(22, wrap_lines * 18)

        for cv_idx, (ev_name, cnt) in enumerate(cv_items):
            is_alt = (cv_idx % 2 == 1)
            data_fmt = formats["data_alt"] if is_alt else formats["data"]
            num_fmt = formats["number_alt"] if is_alt else formats["number"]
            ws.set_row(row, cv_uniform_height)
            ws.merge_range(row, 0, row, 2, ev_name, data_fmt)
            ws.write_number(row, 3, cnt, num_fmt)
            row += 1

        cv_data_end_row = row - 1
        if cv_data_end_row >= cv_data_start_row:
            pie_chart = workbook.add_chart({"type": "pie"})
            num_points = cv_data_end_row - cv_data_start_row + 1
            pie_chart.add_series({
                "name": "コンバージョン内訳",
                # カテゴリは A 列 (結合元), 値は D 列
                "categories": [ws.name, cv_data_start_row, 0, cv_data_end_row, 0],
                "values": [ws.name, cv_data_start_row, 3, cv_data_end_row, 3],
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

    # ─── ■ AI による所感 ─────────────────────────────
    # AI セクションは常時表示（未生成の場合はプレースホルダ）
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
        ai_placeholder_fmt=formats.get("ai_placeholder"),
    )

    return ws


def _lookup_metric_value(metrics_dict: dict, canonical_key: str, default=0):
    """canonical キー優先で値を取得、未存在なら alias キーをフォールバック。

    (例) canonical=screenPageViews でも、送信データは旧キー pageViews の
    可能性があるため aliases を走査する。
    """
    if not isinstance(metrics_dict, dict):
        return default
    if canonical_key in metrics_dict:
        return metrics_dict.get(canonical_key, default)
    aliases = (METRICS.get(canonical_key, {}) or {}).get("aliases") or []
    for alias in aliases:
        if alias in metrics_dict:
            return metrics_dict.get(alias, default)
    return default


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
