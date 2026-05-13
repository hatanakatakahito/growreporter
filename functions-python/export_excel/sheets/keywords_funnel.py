"""
流入キーワード ファネル シート

fetchGSCKeywordsV2Data の結果を以下の構造で出力:
1. ファネル 5 層集計（指名/純顕在/顕在/潜在/無関係）
2. 意味的クラスタ TOP（AI 命名）
3. 改善候補（CTR 損失検出 KW）
4. ファネル別の主要 KW TOP 5
"""

from ..helpers import append_ai_and_memo_sections, calc_row_height, safe_sheet_name
from ..sheet_builder import write_sheet_title_bar
from ..styles import FOOTER_TEXT


# 列幅 (set_column と一致) — calc_row_height 用
_COL_WIDTHS = [18, 14, 16, 12, 12, 12, 14, 38]


_LAYER_ORDER = ["branded", "pureIntent", "intent", "latent", "noise"]
_LAYER_LABELS = {
    "branded": "指名",
    "pureIntent": "純顕在",
    "intent": "顕在",
    "latent": "潜在",
    "noise": "無関係",
}


def create_keywords_funnel_sheet(
    workbook,
    keywords_v2: dict,
    ai_data: dict | None,
    memos: list | None,
    formats: dict,
    sheet_subtitle: str | None = None,
):
    """流入キーワード ファネル シートを作成（タブ名は「流入キーワード元」= ナビ準拠）。"""
    ws = workbook.add_worksheet(safe_sheet_name("検索キーワード"))
    ws.hide_gridlines(2)
    ws.set_footer(FOOTER_TEXT)

    # 列幅: 4 つのセクション（KPI / 5 層 / クラスタ / 改善候補）の最広用途を満たすよう設計。
    # 主要 KW は KW 3 本を " / " で結合 → 30+ chars、対象 LP は URL → 30-50 chars。
    ws.set_column(0, 0, 18)  # 層 / # / KW（改善候補のキーワード列）
    ws.set_column(1, 1, 14)  # KW数 / クラスタ名 part1 / 表示
    ws.set_column(2, 2, 16)  # 表示 / クラスタ名 part2 / クリック  → merged (1+2)=30 でクラスタ名対応
    ws.set_column(3, 3, 12)  # クリック / KW数 / CTR
    ws.set_column(4, 4, 12)  # CTR / クリック / 順位
    ws.set_column(5, 5, 12)  # 平均順位 / 表示 / CTR 損失
    ws.set_column(6, 6, 14)  # 推定 CV / 中心 KW part1 / 潜在クリック
    ws.set_column(7, 7, 38)  # 主要 KW / 中心 KW part2 / 対象 LP  → merged (6+7)=52 で中心 KW 対応

    # タイトル
    row = write_sheet_title_bar(ws, "検索キーワード", sheet_subtitle, 8, formats)

    funnel = keywords_v2.get("funnel") or {}
    clusters = keywords_v2.get("clusters") or []
    keywords = keywords_v2.get("keywords") or []
    metrics = keywords_v2.get("metrics") or {}

    # ─── 1. KPI サマリー ─────────────────────────
    ws.set_row(row, 26)
    ws.merge_range(row, 0, row, 7, "■ KPI サマリー", formats["section_marker"])
    row += 1
    ws.set_row(row, 22)
    kpi_headers = ["項目", "値"]
    ws.merge_range(row, 0, row, 1, kpi_headers[0], formats["header"])
    ws.merge_range(row, 2, row, 7, kpi_headers[1], formats["header"])
    row += 1
    kpis = [
        ("検索キーワード数", f"{int(metrics.get('keywordCount') or 0):,} 個"),
        ("総クリック数", f"{int(metrics.get('totalClicks') or 0):,} 回"),
        ("総表示回数", f"{int(metrics.get('totalImpressions') or 0):,} 回"),
        ("平均 CTR", f"{float(metrics.get('avgCTR') or 0):.2f}%"),
        ("平均掲載順位", f"{float(metrics.get('avgPosition') or 0):.1f} 位"),
        ("推定 CV 数", f"{int(metrics.get('estimatedCV') or 0):,} 件"),
    ]
    for label, value in kpis:
        ws.merge_range(row, 0, row, 1, label, formats["data"])
        ws.merge_range(row, 2, row, 7, value, formats["data"])
        row += 1
    row += 1

    # ─── 2. ファネル 5 層集計 ─────────────────────────
    ws.set_row(row, 26)
    ws.merge_range(row, 0, row, 7, "■ ファネル 5 層集計（AI 自動分類）", formats["section_marker"])
    row += 1
    ws.set_row(row, 22)
    headers = ["層", "KW数", "表示", "クリック", "CTR", "平均順位", "推定 CV", "主要 KW"]
    for i, h in enumerate(headers):
        ws.write(row, i, h, formats["header"])
    row += 1

    for layer_key in _LAYER_ORDER:
        f = funnel.get(layer_key)
        if not f:
            continue
        top_kw = " / ".join((f.get("topKeywords") or [])[:3])
        ws.set_row(row, calc_row_height(["", "", "", "", "", "", "", top_kw], _COL_WIDTHS))
        ws.write(row, 0, _LAYER_LABELS[layer_key], formats["data"])
        ws.write_number(row, 1, int(f.get("count") or 0), formats["number"])
        ws.write_number(row, 2, int(f.get("impressions") or 0), formats["number"])
        ws.write_number(row, 3, int(f.get("clicks") or 0), formats["number"])
        ws.write(row, 4, f"{float(f.get('ctr') or 0):.2f}%", formats["text_right"])
        ws.write(row, 5, f"{float(f.get('avgPosition') or 0):.1f} 位", formats["text_right"])
        ws.write_number(row, 6, int(f.get("estimatedCV") or 0), formats["number"])
        ws.write(row, 7, top_kw, formats["data"])
        row += 1
    row += 1

    # ─── 3. クラスタ TOP（AI 命名） ─────────────────────────
    if clusters:
        ws.set_row(row, 26)
        ws.merge_range(row, 0, row, 7, "■ 意味的クラスタ（AI 命名）", formats["section_marker"])
        row += 1
        ws.set_row(row, 22)
        # 注: merge_range(row, 0, row, 0, ...) は xlsxwriter で degenerate（描画されない）
        # ため、単一セルは plain ws.write を使う
        ws.write(row, 0, "#", formats["header"])
        ws.merge_range(row, 1, row, 2, "クラスタ名", formats["header"])
        ws.write(row, 3, "KW数", formats["header"])
        ws.write(row, 4, "総クリック", formats["header"])
        ws.write(row, 5, "総表示", formats["header"])
        ws.merge_range(row, 6, row, 7, "中心 KW", formats["header"])
        row += 1

        sorted_clusters = sorted(clusters, key=lambda c: c.get("clicks") or 0, reverse=True)[:8]
        # クラスタ名 (col1+2 = 30) と中心 KW (col6+7 = 52) のマージ幅を反映
        cluster_widths = list(_COL_WIDTHS)
        cluster_widths[1] = _COL_WIDTHS[1] + _COL_WIDTHS[2]
        cluster_widths[6] = _COL_WIDTHS[6] + _COL_WIDTHS[7]
        for i, c in enumerate(sorted_clusters, 1):
            cluster_name = c.get("name") or ""
            center_kw = c.get("centerKeyword") or ""
            ws.set_row(row, calc_row_height(
                ["", cluster_name, "", "", "", "", center_kw, ""], cluster_widths
            ))
            ws.write(row, 0, i, formats["data"])
            ws.merge_range(row, 1, row, 2, cluster_name, formats["data"])
            ws.write_number(row, 3, int(c.get("keywordCount") or 0), formats["number"])
            ws.write_number(row, 4, int(c.get("clicks") or 0), formats["number"])
            ws.write_number(row, 5, int(c.get("impressions") or 0), formats["number"])
            ws.merge_range(row, 6, row, 7, center_kw, formats["data"])
            row += 1
        row += 1

    # ─── 4. 改善候補（CTR 損失） ─────────────────────────
    ctr_loss_kws = sorted(
        [k for k in keywords if k.get("ctrLossFlag") and (k.get("potentialClicks") or 0) > 0],
        key=lambda k: k.get("potentialClicks") or 0,
        reverse=True,
    )[:10]
    if ctr_loss_kws:
        ws.set_row(row, 26)
        ws.merge_range(row, 0, row, 7, "■ 改善候補 TOP 10（CTR 損失）", formats["section_marker"])
        row += 1
        ws.set_row(row, 22)
        ic_headers = ["キーワード", "表示", "クリック", "CTR", "順位", "CTR 損失", "潜在クリック", "対象 LP"]
        for i, h in enumerate(ic_headers):
            ws.write(row, i, h, formats["header"])
        row += 1
        for k in ctr_loss_kws:
            query = k.get("query") or ""
            top_page = k.get("topPage") or ""
            ws.set_row(row, calc_row_height(
                [query, "", "", "", "", "", "", top_page], _COL_WIDTHS
            ))
            ws.write(row, 0, query, formats["data"])
            ws.write_number(row, 1, int(k.get("impressions") or 0), formats["number"])
            ws.write_number(row, 2, int(k.get("clicks") or 0), formats["number"])
            ws.write(row, 3, f"{float(k.get('ctr') or 0) * 100:.2f}%", formats["text_right"])
            ws.write(row, 4, f"{float(k.get('position') or 0):.1f} 位", formats["text_right"])
            ws.write(row, 5, f"{float(k.get('ctrLossDelta') or 0):+.1f} pt", formats["text_right"])
            ws.write_number(row, 6, int(k.get("potentialClicks") or 0), formats["number"])
            ws.write(row, 7, top_page, formats["data"])
            row += 1
        row += 1

    # ─── 5. AI / メモ ─────────────────────────
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
