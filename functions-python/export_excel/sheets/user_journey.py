"""
ユーザージャーニーシート: 流入元→KW/参照元→LP→中間→結果 の 5層フローを表形式で出力

サンキー図そのものは Excel では再現難しいため、以下を表形式で集約:
1. 主要ジャーニー TOP 3 (ストーリーカード相当)
2. 流入元別セッション (列1)
3. ランディングページ別セッション (列3)
4. CV / 離脱内訳 (列5)
5. 詳細パステーブル
"""

from ..helpers import append_ai_and_memo_sections, safe_sheet_name
from ..sheet_builder import write_sheet_title_bar
from ..styles import FOOTER_TEXT


def create_user_journey_sheet(
    workbook,
    user_journey: dict,
    ai_data: dict | None,
    memos: list | None,
    formats: dict,
    sheet_subtitle: str | None = None,
):
    """ユーザージャーニーシートを作成。"""
    ws = workbook.add_worksheet(safe_sheet_name("ユーザージャーニー"))
    ws.hide_gridlines(2)
    ws.set_footer(FOOTER_TEXT)

    # 列幅
    ws.set_column(0, 0, 4)   # #
    ws.set_column(1, 1, 14)  # 流入元
    ws.set_column(2, 2, 28)  # ランディング
    ws.set_column(3, 3, 22)  # 中間
    ws.set_column(4, 4, 14)  # 結果
    ws.set_column(5, 5, 12)  # セッション
    ws.set_column(6, 6, 10)  # CV率
    ws.set_column(7, 7, 10)  # 前期比

    # タイトルバー
    row = write_sheet_title_bar(ws, "ユーザージャーニー", sheet_subtitle, 8, formats)

    nodes = user_journey.get("nodes") or []
    story_top3 = user_journey.get("storyTop3") or []
    detail_paths = user_journey.get("detailPaths") or []
    total_sessions = user_journey.get("totalSessions") or 0

    # ─── 1. 主要ジャーニー TOP 3 ─────────────────────────
    if story_top3:
        ws.set_row(row, 26)
        ws.merge_range(row, 0, row, 7, "■ 主要ジャーニー TOP 3", formats["section_marker"])
        row += 1

        # ヘッダー
        ws.set_row(row, 24)
        story_headers = ["#", "タイトル", "セッション", "構成比", "CV 率", "性質", "AI コメント"]
        col_spans = [(0, 0), (1, 1), (5, 5), (6, 6), (7, 7), (4, 4), (2, 3)]
        for header, span in zip(story_headers, col_spans):
            ws.merge_range(row, span[0], row, span[1], header, formats["header"])
        row += 1

        for s in story_top3:
            if not isinstance(s, dict):
                continue
            ws.set_row(row, 36)
            ws.write(row, 0, s.get("rank") or "", formats["data"])
            ws.write(row, 1, s.get("title") or "", formats["data"])
            try:
                ws.write_number(row, 5, float(s.get("sessions") or 0), formats["number"])
            except (ValueError, TypeError):
                ws.write(row, 5, 0, formats["number"])
            ws.write(row, 6, f"{float(s.get('sharePct') or 0):.0f}%", formats["text_right"])
            ws.write(row, 7, f"{float(s.get('cvRate') or 0):.1f}%", formats["text_right"])
            ws.write(row, 4, _story_type_label(s.get("type")), formats["data"])
            ws.merge_range(row, 2, row, 3, s.get("aiComment") or "", formats["data"])
            row += 1

        row += 1

    # ─── 2. 流入元別セッション ─────────────────────────
    sources = [n for n in nodes if isinstance(n, dict) and n.get("type") == "source"]
    if sources:
        ws.set_row(row, 26)
        ws.merge_range(row, 0, row, 7, "■ 流入元別セッション", formats["section_marker"])
        row += 1

        ws.set_row(row, 24)
        for c, h in enumerate(["流入元", "セッション", "シェア", "前期比"]):
            ws.write(row, c, h, formats["header"])
        row += 1

        for n in sorted(sources, key=lambda x: -(x.get("value") or 0)):
            ws.set_row(row, 22)
            ws.write(row, 0, n.get("name") or "", formats["data"])
            try:
                ws.write_number(row, 1, float(n.get("value") or 0), formats["number"])
            except (ValueError, TypeError):
                ws.write(row, 1, 0, formats["number"])
            share = n.get("share")
            ws.write(row, 2, f"{float(share or 0) * 100:.1f}%", formats["text_right"])
            ws.write(row, 3, _format_change(n.get("change")), formats["text_right"])
            row += 1

        row += 1

    # ─── 3. ランディングページ別セッション ─────────────────
    lps = [n for n in nodes if isinstance(n, dict) and n.get("type") == "lp"]
    if lps:
        ws.set_row(row, 26)
        ws.merge_range(row, 0, row, 7, "■ ランディングページ TOP", formats["section_marker"])
        row += 1

        ws.set_row(row, 24)
        for c, h in enumerate(["ランディングページ", "セッション", "前期比"]):
            ws.write(row, c, h, formats["header"])
        row += 1

        for n in sorted(lps, key=lambda x: -(x.get("value") or 0)):
            ws.set_row(row, 22)
            ws.write(row, 0, n.get("name") or "", formats["data"])
            try:
                ws.write_number(row, 1, float(n.get("value") or 0), formats["number"])
            except (ValueError, TypeError):
                ws.write(row, 1, 0, formats["number"])
            ws.write(row, 2, _format_change(n.get("change")), formats["text_right"])
            row += 1

        row += 1

    # ─── 4. コンバージョン内訳 ─────────────────────────
    cvs = [n for n in nodes if isinstance(n, dict) and n.get("type") == "cv"]
    if cvs:
        ws.set_row(row, 26)
        ws.merge_range(row, 0, row, 7, "■ コンバージョン内訳", formats["section_marker"])
        row += 1

        ws.set_row(row, 24)
        for c, h in enumerate(["イベント", "件数", "CV 率", "前期比"]):
            ws.write(row, c, h, formats["header"])
        row += 1

        for n in sorted(cvs, key=lambda x: -(x.get("value") or 0)):
            ws.set_row(row, 22)
            ws.write(row, 0, n.get("name") or "", formats["data"])
            try:
                ws.write_number(row, 1, float(n.get("value") or 0), formats["number"])
            except (ValueError, TypeError):
                ws.write(row, 1, 0, formats["number"])
            share = n.get("share")
            ws.write(row, 2, f"{float(share or 0) * 100:.2f}%", formats["text_right"])
            ws.write(row, 3, _format_change(n.get("change")), formats["text_right"])
            row += 1

        row += 1

    # ─── 5. 詳細パステーブル ─────────────────────────
    if detail_paths:
        ws.set_row(row, 26)
        ws.merge_range(row, 0, row, 7, "■ 詳細パステーブル", formats["section_marker"])
        row += 1

        ws.set_row(row, 24)
        for c, h in enumerate(["#", "流入元", "ランディング", "中間", "結果", "セッション", "CV 率", "前期比"]):
            ws.write(row, c, h, formats["header"])
        row += 1

        for p in detail_paths:
            if not isinstance(p, dict):
                continue
            ws.set_row(row, 22)
            ws.write(row, 0, p.get("rank") or "", formats["data"])
            ws.write(row, 1, p.get("source") or "", formats["data"])
            ws.write(row, 2, p.get("lp") or "", formats["data"])
            ws.write(row, 3, p.get("middle") or "—", formats["data"])
            ws.write(row, 4, p.get("result") or "", formats["data"])
            try:
                ws.write_number(row, 5, float(p.get("sessions") or 0), formats["number"])
            except (ValueError, TypeError):
                ws.write(row, 5, 0, formats["number"])
            ws.write(row, 6, f"{float(p.get('cvRate') or 0):.1f}%", formats["text_right"])
            ws.write(row, 7, _format_change(p.get("change")), formats["text_right"])
            row += 1

        row += 1

    # AI + メモ
    append_ai_and_memo_sections(
        ws,
        workbook,
        row,
        8,
        ai_data,
        memos,
        formats["ai_header"],
        formats["ai_content"],
        formats["memo_header"],
        formats["memo_content"],
        ai_placeholder_fmt=formats.get("ai_placeholder"),
    )

    return ws


def _story_type_label(t: str | None) -> str:
    return {"success": "成功型", "warning": "改善余地大", "normal": "中位"}.get(t or "", "中位")


def _format_change(change) -> str:
    if change is None:
        return "—"
    try:
        v = float(change)
    except (ValueError, TypeError):
        return "—"
    if v == 0:
        return "0%"
    sign = "▲" if v > 0 else "▼"
    return f"{sign} {abs(round(v * 100))}%"
