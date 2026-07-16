"""
ユーザージャーニーシート: 流入元→KW/参照元→LP→中間→結果 の 5層フローを表形式で出力

各セクションで意味する列が違うため、すべて 8 列固定構造で マージで適切に配置:
1. 主要ジャーニー TOP 3 — 1 件 = 2 行 (上: 番号/タイトル/数値/性質, 下: AI コメント全幅)
2. 流入元別セッション — 流入元 (マージ B+C+D+E) / セッション (F) / シェア (G) / 前期比 (H)
3. ランディングページ TOP — LP path (マージ B+C+D+E) / セッション (F) / 前期比 (G+H)
4. コンバージョン内訳 — イベント (マージ B+C+D+E) / 件数 (F) / CV率 (G) / 前期比 (H)
5. 詳細パステーブル — # / 流入元 / LP / 中間 / 結果 / セッション / CV率 / 前期比
"""

from ..helpers import append_ai_and_memo_sections, calc_row_height, safe_sheet_name
from ..sheet_builder import write_sheet_title_bar
from ..styles import FOOTER_TEXT


# 全セクション共通の 8 列幅（詳細パステーブル基準）
_COL_WIDTHS = [4, 16, 34, 28, 20, 12, 10, 12]
# Excel 列インデックス
COL_NUM, COL_SOURCE, COL_LP, COL_MID, COL_RESULT, COL_SESS, COL_RATE, COL_CHG = range(8)


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
    ws.set_column(COL_NUM, COL_NUM, _COL_WIDTHS[COL_NUM])
    ws.set_column(COL_SOURCE, COL_SOURCE, _COL_WIDTHS[COL_SOURCE])
    ws.set_column(COL_LP, COL_LP, _COL_WIDTHS[COL_LP])
    ws.set_column(COL_MID, COL_MID, _COL_WIDTHS[COL_MID])
    ws.set_column(COL_RESULT, COL_RESULT, _COL_WIDTHS[COL_RESULT])
    ws.set_column(COL_SESS, COL_SESS, _COL_WIDTHS[COL_SESS])
    ws.set_column(COL_RATE, COL_RATE, _COL_WIDTHS[COL_RATE])
    ws.set_column(COL_CHG, COL_CHG, _COL_WIDTHS[COL_CHG])

    row = write_sheet_title_bar(ws, "ユーザージャーニー", sheet_subtitle, 8, formats)

    nodes = user_journey.get("nodes") or []
    story_top3 = user_journey.get("storyTop3") or []
    detail_paths = user_journey.get("detailPaths") or []

    # ─── 1. 主要ジャーニー TOP 3 ─────────────────────────
    if story_top3:
        row = _section_marker(ws, row, "■ 主要ジャーニー TOP 3", formats)

        # ヘッダー (上段の数値カードのみ。AI コメントは下段で全幅表示)
        ws.set_row(row, 24)
        ws.write(row, COL_NUM, "#", formats["header"])
        ws.merge_range(row, COL_SOURCE, row, COL_MID, "ジャーニータイトル", formats["header"])
        ws.write(row, COL_RESULT, "性質", formats["header"])
        ws.write(row, COL_SESS, "セッション", formats["header"])
        ws.write(row, COL_RATE, "構成比", formats["header"])
        ws.write(row, COL_CHG, "CV 率", formats["header"])
        row += 1

        for s in story_top3:
            if not isinstance(s, dict):
                continue
            title = s.get("title") or ""
            # 上段: 数値カード
            title_w = _COL_WIDTHS[COL_SOURCE] + _COL_WIDTHS[COL_LP] + _COL_WIDTHS[COL_MID]  # 78
            row_h = max(28, calc_row_height([title], [title_w]))
            ws.set_row(row, row_h)
            ws.write(row, COL_NUM, s.get("rank") or "", formats["data"])
            ws.merge_range(row, COL_SOURCE, row, COL_MID, title, formats["data"])
            ws.write(row, COL_RESULT, _story_type_label(s.get("type")), formats["data"])
            try:
                ws.write_number(row, COL_SESS, float(s.get("sessions") or 0), formats["number"])
            except (ValueError, TypeError):
                ws.write_number(row, COL_SESS, 0, formats["number"])
            ws.write(row, COL_RATE, f"{float(s.get('sharePct') or 0):.0f}%", formats["text_right"])
            ws.write(row, COL_CHG, f"{float(s.get('cvRate') or 0):.1f}%", formats["text_right"])
            row += 1

            # 下段: AI コメントを全幅マージで表示 (折返し対応 + 動的行高)
            ai_comment = s.get("aiComment") or ""
            if ai_comment:
                full_w = sum(_COL_WIDTHS[1:])  # B..H
                comment_h = max(24, calc_row_height([f"AI コメント：{ai_comment}"], [full_w]))
                ws.set_row(row, comment_h)
                ws.write(row, COL_NUM, "", formats["data"])
                ws.merge_range(
                    row, COL_SOURCE, row, COL_CHG,
                    f"AI コメント：{ai_comment}",
                    formats["data"],
                )
                row += 1

        row += 1

    # ─── 2. 流入元別セッション ─────────────────────────
    sources = [n for n in nodes if isinstance(n, dict) and n.get("type") == "source"]
    if sources:
        row = _section_marker(ws, row, "■ 流入元別セッション", formats)
        ws.set_row(row, 24)
        ws.merge_range(row, COL_NUM, row, COL_MID, "流入元", formats["header"])
        ws.write(row, COL_RESULT, "シェア", formats["header"])
        ws.write(row, COL_SESS, "セッション", formats["header"])
        ws.write(row, COL_RATE, "構成比", formats["header"])
        ws.write(row, COL_CHG, "前期比", formats["header"])
        row += 1
        for n in sorted(sources, key=lambda x: -(x.get("value") or 0)):
            ws.set_row(row, 22)
            ws.merge_range(row, COL_NUM, row, COL_MID, n.get("name") or "", formats["data"])
            share = float(n.get("share") or 0)
            ws.write(row, COL_RESULT, f"{share * 100:.1f}%", formats["text_right"])
            try:
                ws.write_number(row, COL_SESS, float(n.get("value") or 0), formats["number"])
            except (ValueError, TypeError):
                ws.write_number(row, COL_SESS, 0, formats["number"])
            ws.write(row, COL_RATE, f"{share * 100:.1f}%", formats["text_right"])
            ws.write(row, COL_CHG, _format_change(n.get("change")), formats["text_right"])
            row += 1
        row += 1

    # ─── 3. ランディングページ TOP ─────────────────────
    lps = [n for n in nodes if isinstance(n, dict) and n.get("type") == "lp"]
    if lps:
        row = _section_marker(ws, row, "■ 入口ページ TOP", formats)
        ws.set_row(row, 24)
        ws.merge_range(row, COL_NUM, row, COL_RESULT, "入口ページ", formats["header"])
        ws.write(row, COL_SESS, "セッション", formats["header"])
        ws.merge_range(row, COL_RATE, row, COL_CHG, "前期比", formats["header"])
        row += 1
        for n in sorted(lps, key=lambda x: -(x.get("value") or 0)):
            name = n.get("name") or ""
            lp_w = sum(_COL_WIDTHS[COL_NUM:COL_RESULT + 1])  # 4+16+34+28+20 = 102
            ws.set_row(row, max(22, calc_row_height([name], [lp_w])))
            ws.merge_range(row, COL_NUM, row, COL_RESULT, name, formats["data"])
            try:
                ws.write_number(row, COL_SESS, float(n.get("value") or 0), formats["number"])
            except (ValueError, TypeError):
                ws.write_number(row, COL_SESS, 0, formats["number"])
            ws.merge_range(
                row, COL_RATE, row, COL_CHG,
                _format_change(n.get("change")),
                formats["text_right"],
            )
            row += 1
        row += 1

    # ─── 4. コンバージョン内訳 ─────────────────────────
    cvs = [n for n in nodes if isinstance(n, dict) and n.get("type") == "cv"]
    if cvs:
        row = _section_marker(ws, row, "■ コンバージョン内訳", formats)
        ws.set_row(row, 24)
        ws.merge_range(row, COL_NUM, row, COL_MID, "イベント", formats["header"])
        ws.write(row, COL_RESULT, "シェア", formats["header"])
        ws.write(row, COL_SESS, "件数", formats["header"])
        ws.write(row, COL_RATE, "CV 率", formats["header"])
        ws.write(row, COL_CHG, "前期比", formats["header"])
        row += 1
        for n in sorted(cvs, key=lambda x: -(x.get("value") or 0)):
            name = n.get("name") or ""
            ev_w = sum(_COL_WIDTHS[COL_NUM:COL_MID + 1])  # 4+16+34+28 = 82
            ws.set_row(row, max(22, calc_row_height([name], [ev_w])))
            ws.merge_range(row, COL_NUM, row, COL_MID, name, formats["data"])
            share = float(n.get("share") or 0)
            ws.write(row, COL_RESULT, f"{share * 100:.2f}%", formats["text_right"])
            try:
                ws.write_number(row, COL_SESS, float(n.get("value") or 0), formats["number"])
            except (ValueError, TypeError):
                ws.write_number(row, COL_SESS, 0, formats["number"])
            ws.write(row, COL_RATE, f"{share * 100:.2f}%", formats["text_right"])
            ws.write(row, COL_CHG, _format_change(n.get("change")), formats["text_right"])
            row += 1
        row += 1

    # ─── 5. 詳細パステーブル ─────────────────────────
    if detail_paths:
        row = _section_marker(ws, row, "■ 詳細パステーブル", formats)
        ws.set_row(row, 24)
        for c, h in enumerate(["#", "流入元", "ランディング", "中間", "結果", "セッション", "CV 率", "前期比"]):
            ws.write(row, c, h, formats["header"])
        row += 1
        for p in detail_paths:
            if not isinstance(p, dict):
                continue
            lp = p.get("lp") or ""
            middle = p.get("middle") or "—"
            result = p.get("result") or ""
            row_values = [
                p.get("rank") or "", p.get("source") or "", lp, middle,
                result, p.get("sessions") or 0, "", "",
            ]
            ws.set_row(row, calc_row_height(row_values, _COL_WIDTHS))
            ws.write(row, COL_NUM, p.get("rank") or "", formats["data"])
            ws.write(row, COL_SOURCE, p.get("source") or "", formats["data"])
            ws.write(row, COL_LP, lp, formats["data"])
            ws.write(row, COL_MID, middle, formats["data"])
            ws.write(row, COL_RESULT, result, formats["data"])
            try:
                ws.write_number(row, COL_SESS, float(p.get("sessions") or 0), formats["number"])
            except (ValueError, TypeError):
                ws.write_number(row, COL_SESS, 0, formats["number"])
            ws.write(row, COL_RATE, f"{float(p.get('cvRate') or 0):.1f}%", formats["text_right"])
            ws.write(row, COL_CHG, _format_change(p.get("change")), formats["text_right"])
            row += 1
        row += 1

    # AI + メモ
    append_ai_and_memo_sections(
        ws, workbook, row, 8,
        ai_data, memos,
        formats["ai_header"], formats["ai_content"],
        formats["memo_header"], formats["memo_content"],
        ai_placeholder_fmt=formats.get("ai_placeholder"),
    )

    return ws


def _section_marker(ws, row: int, title: str, formats: dict) -> int:
    """セクション帯を 1 行で挿入し、次の行番号を返す。"""
    ws.set_row(row, 26)
    ws.merge_range(row, 0, row, 7, title, formats["section_marker"])
    return row + 1


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
