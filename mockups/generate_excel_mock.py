"""
Excel エクスポート スタイルモック
ブランドカラーに合わせた高視認性レポートのサンプル生成
"""
import xlsxwriter
import os

OUTPUT = os.path.join(os.path.dirname(__file__), "excel_style_mock.xlsx")

# GrowReporter ブランドカラー
PRIMARY = "#3758F9"
PRIMARY_LIGHT = "#EBF0FF"
PRIMARY_MID = "#6B8AFF"
DARK = "#111928"
BODY = "#637381"
STROKE = "#DFE4EA"
WHITE = "#FFFFFF"
BG_LIGHT = "#F9FAFB"

# チャート系カラー
CHART_COLORS = ["#3758F9", "#13C296", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#F97316", "#EC4899"]

FONT = "Yu Gothic"


def main():
    wb = xlsxwriter.Workbook(OUTPUT, {"in_memory": False})

    # ─── フォーマット定義 ──────────────────────────────

    # 表紙用
    cover_title = wb.add_format({
        "font_name": FONT, "font_size": 22, "bold": True, "font_color": DARK,
        "align": "left", "valign": "vcenter",
    })
    cover_subtitle = wb.add_format({
        "font_name": FONT, "font_size": 12, "font_color": BODY,
        "align": "left", "valign": "vcenter",
    })
    cover_label = wb.add_format({
        "font_name": FONT, "font_size": 10, "bold": True, "font_color": BODY,
        "align": "left", "valign": "vcenter", "bottom": 1, "bottom_color": STROKE,
    })
    cover_value = wb.add_format({
        "font_name": FONT, "font_size": 10, "font_color": DARK,
        "align": "left", "valign": "vcenter", "bottom": 1, "bottom_color": STROKE,
    })
    cover_brand = wb.add_format({
        "font_name": FONT, "font_size": 9, "font_color": PRIMARY, "bold": True,
        "align": "left", "valign": "vcenter",
    })

    # ヘッダー（プライマリブルー背景 + 白文字）
    header = wb.add_format({
        "font_name": FONT, "font_size": 10, "bold": True,
        "font_color": WHITE, "bg_color": PRIMARY,
        "align": "center", "valign": "vcenter", "text_wrap": True,
        "border": 1, "border_color": PRIMARY_MID,
    })

    # データセル（偶数行の背景色なし）
    data = wb.add_format({
        "font_name": FONT, "font_size": 10, "font_color": DARK,
        "valign": "vcenter", "text_wrap": True,
        "border": 1, "border_color": STROKE,
    })

    # データセル（偶数行 — 薄い背景でゼブラ）
    data_alt = wb.add_format({
        "font_name": FONT, "font_size": 10, "font_color": DARK,
        "valign": "vcenter", "text_wrap": True, "bg_color": BG_LIGHT,
        "border": 1, "border_color": STROKE,
    })

    # 数値セル
    num = wb.add_format({
        "font_name": FONT, "font_size": 10, "font_color": DARK,
        "align": "right", "valign": "vcenter", "num_format": "#,##0",
        "border": 1, "border_color": STROKE,
    })
    num_alt = wb.add_format({
        "font_name": FONT, "font_size": 10, "font_color": DARK,
        "align": "right", "valign": "vcenter", "num_format": "#,##0",
        "bg_color": BG_LIGHT, "border": 1, "border_color": STROKE,
    })

    # パーセンテージ
    pct = wb.add_format({
        "font_name": FONT, "font_size": 10, "font_color": DARK,
        "align": "right", "valign": "vcenter",
        "border": 1, "border_color": STROKE,
    })
    pct_alt = wb.add_format({
        "font_name": FONT, "font_size": 10, "font_color": DARK,
        "align": "right", "valign": "vcenter", "bg_color": BG_LIGHT,
        "border": 1, "border_color": STROKE,
    })

    # 合計行
    total_label = wb.add_format({
        "font_name": FONT, "font_size": 10, "bold": True, "font_color": DARK,
        "bg_color": PRIMARY_LIGHT, "align": "center", "valign": "vcenter",
        "top": 2, "top_color": PRIMARY, "bottom": 1, "bottom_color": STROKE,
        "left": 1, "left_color": STROKE, "right": 1, "right_color": STROKE,
    })
    total_num = wb.add_format({
        "font_name": FONT, "font_size": 10, "bold": True, "font_color": DARK,
        "bg_color": PRIMARY_LIGHT, "align": "right", "valign": "vcenter",
        "num_format": "#,##0",
        "top": 2, "top_color": PRIMARY, "bottom": 1, "bottom_color": STROKE,
        "left": 1, "left_color": STROKE, "right": 1, "right_color": STROKE,
    })
    total_pct = wb.add_format({
        "font_name": FONT, "font_size": 10, "bold": True, "font_color": DARK,
        "bg_color": PRIMARY_LIGHT, "align": "right", "valign": "vcenter",
        "top": 2, "top_color": PRIMARY, "bottom": 1, "bottom_color": STROKE,
        "left": 1, "left_color": STROKE, "right": 1, "right_color": STROKE,
    })

    # AI セクション
    ai_header_fmt = wb.add_format({
        "font_name": FONT, "font_size": 11, "bold": True,
        "font_color": WHITE, "bg_color": "#7C3AED",
        "align": "left", "valign": "vcenter",
        "border": 1, "border_color": "#7C3AED",
    })
    ai_body_fmt = wb.add_format({
        "font_name": FONT, "font_size": 10, "font_color": DARK,
        "bg_color": "#F5F3FF", "align": "left", "valign": "top", "text_wrap": True,
        "border": 1, "border_color": "#DDD6FE",
    })

    # セクションタイトル（シート内のセクション区切り）
    section_title = wb.add_format({
        "font_name": FONT, "font_size": 11, "bold": True, "font_color": PRIMARY,
        "bottom": 2, "bottom_color": PRIMARY,
        "align": "left", "valign": "vcenter",
    })

    # ──────────────────────────────────────────────────
    # 1. 表紙
    # ──────────────────────────────────────────────────
    ws = wb.add_worksheet("レポート概要")
    ws.hide_gridlines(2)
    ws.set_footer("&C© グローレポーター Produced by GrowGroup Co.,Ltd.")
    ws.set_column(0, 0, 3)
    ws.set_column(1, 1, 18)
    ws.set_column(2, 2, 18)
    ws.set_column(3, 3, 18)
    ws.set_column(4, 4, 18)
    ws.set_column(5, 5, 3)

    # ブランドライン
    brand_line = wb.add_format({"bg_color": PRIMARY})
    for c in range(6):
        ws.write(0, c, "", brand_line)
    ws.set_row(0, 4)

    ws.set_row(2, 40)
    ws.merge_range(2, 1, 2, 4, "ドーミーBiz 分析レポート", cover_title)

    ws.set_row(3, 24)
    ws.merge_range(3, 1, 3, 4, "GA4 / Search Console データ + AI 分析", cover_subtitle)

    ws.set_row(4, 4)  # 空白

    row = 6
    info = [
        ("サイト名", "ドーミーBiz"),
        ("サイト URL", "https://example.com"),
        ("分析期間", "2025-04-01 〜 2026-03-31"),
        ("比較期間", "2024-04-01 〜 2025-03-31"),
        ("生成日時", "2026/04/16 15:30"),
    ]
    for label, val in info:
        ws.set_row(row, 24)
        ws.write(row, 1, label, cover_label)
        ws.merge_range(row, 2, row, 4, val, cover_value)
        row += 1

    # ─── 目次 ───────────────────────────────────────
    # ─── 主要 KPI ─────────────────────────────────
    row += 2
    kpi_header_fmt = wb.add_format({
        "font_name": FONT, "font_size": 10, "bold": True, "font_color": WHITE,
        "bg_color": PRIMARY, "align": "left", "valign": "vcenter",
        "left": 1, "left_color": PRIMARY, "right": 1, "right_color": PRIMARY,
        "top": 1, "top_color": PRIMARY,
    })
    ws.set_row(row, 22)
    ws.merge_range(row, 1, row, 4, "  主要 KPI", kpi_header_fmt)
    row += 1

    kpi_num_fmt = wb.add_format({
        "font_name": FONT, "font_size": 14, "bold": True, "font_color": DARK,
        "align": "center", "valign": "vcenter",
        "top": 1, "top_color": PRIMARY, "bottom": 1, "bottom_color": STROKE,
        "left": 1, "left_color": STROKE, "right": 1, "right_color": STROKE,
    })
    kpi_label_fmt = wb.add_format({
        "font_name": FONT, "font_size": 9, "font_color": BODY,
        "align": "center", "valign": "vcenter", "bg_color": BG_LIGHT,
        "bottom": 1, "bottom_color": STROKE,
        "left": 1, "left_color": STROKE, "right": 1, "right_color": STROKE,
    })

    ws.set_row(row, 30)
    ws.write(row, 1, "1,041,986", kpi_num_fmt)
    ws.write(row, 2, "1,354件", kpi_num_fmt)
    ws.write(row, 3, "250件", kpi_num_fmt)
    ws.write(row, 4, "0.13%", kpi_num_fmt)
    row += 1

    ws.set_row(row, 18)
    ws.write(row, 1, "セッション数", kpi_label_fmt)
    ws.write(row, 2, "CV総数", kpi_label_fmt)
    ws.write(row, 3, "長期利用CV", kpi_label_fmt)
    ws.write(row, 4, "CVR（全体）", kpi_label_fmt)
    row += 1

    # ─── 目次 ───────────────────────────────────────
    row += 2
    ws.set_row(row, 28)
    ws.merge_range(row, 1, row, 4, "目次", section_title)
    row += 1

    toc_num_fmt = wb.add_format({
        "font_name": FONT, "font_size": 10, "bold": True, "font_color": PRIMARY,
        "align": "center", "valign": "vcenter",
        "bottom": 1, "bottom_color": STROKE,
    })
    toc_name_fmt = wb.add_format({
        "font_name": FONT, "font_size": 10, "bold": True, "font_color": DARK,
        "align": "left", "valign": "vcenter",
        "bottom": 1, "bottom_color": STROKE,
    })
    toc_desc_fmt = wb.add_format({
        "font_name": FONT, "font_size": 9, "font_color": BODY,
        "align": "left", "valign": "vcenter",
        "bottom": 1, "bottom_color": STROKE,
    })

    # 目次ヘッダ
    toc_header_fmt = wb.add_format({
        "font_name": FONT, "font_size": 9, "bold": True, "font_color": BODY,
        "align": "left", "valign": "vcenter",
        "bottom": 2, "bottom_color": PRIMARY,
    })
    toc_num_header = wb.add_format({
        "font_name": FONT, "font_size": 9, "bold": True, "font_color": BODY,
        "align": "center", "valign": "vcenter",
        "bottom": 2, "bottom_color": PRIMARY,
    })
    ws.set_row(row, 22)
    ws.write(row, 1, "#", toc_num_header)
    ws.write(row, 2, "シート", toc_header_fmt)
    ws.merge_range(row, 3, row, 4, "内容", toc_header_fmt)
    row += 1

    # シート一覧
    toc_items = [
        ("全体サマリー", "主要KPI・KPI目標達成率・CV内訳"),
        ("月別", "月別 セッション・ENG率・CV推移"),
        ("ユーザー属性", "デバイス・年齢・性別・地域"),
        ("日別", "日別セッション・CV推移"),
        ("曜日別", "曜日別のCV発生パターン"),
        ("時間帯別", "時間帯別のセッション・CV"),
        ("集客チャネル", "流入チャネル別 訪問者・CVR"),
        ("流入キーワード", "GSC キーワード別 クリック・順位"),
        ("被リンク元", "参照元サイト別 訪問者・CV"),
        ("ページ別", "ページ別 PV・ENG率・滞在時間"),
        ("ページ分類別", "ディレクトリ別 PV 集計"),
        ("ランディングページ", "LP 別 訪問者・ENG率・CV"),
        ("ファイルDL", "ファイルダウンロード数"),
        ("外部リンク", "外部リンククリック数"),
        ("コンバージョン一覧", "CV 種別 × 月別内訳"),
        ("逆算フロー", "フォーム ファネル分析"),
        ("改善提案", "AI が提案した改善施策一覧"),
    ]
    for i, (name, desc) in enumerate(toc_items):
        no = f"{i + 1:02d}"
        ws.set_row(row, 22)
        ws.write(row, 1, no, toc_num_fmt)
        # シート名はハイパーリンクで該当シートへジャンプ
        ws.write_url(row, 2, f"internal:'{name}'!A1", toc_name_fmt, name)
        ws.merge_range(row, 3, row, 4, desc, toc_desc_fmt)
        row += 1

    row += 2
    ws.write(row, 1, "グローレポータ", cover_brand)
    ws.write(row + 1, 1, "© グローレポーター Produced by GrowGroup Co.,Ltd.",
             wb.add_format({"font_name": FONT, "font_size": 8, "font_color": BODY}))

    # ──────────────────────────────────────────────────
    # 2. 月別
    # ──────────────────────────────────────────────────
    ws2 = wb.add_worksheet("月別")
    ws2.set_footer("&C© グローレポーター Produced by GrowGroup Co.,Ltd.")
    ws2.hide_gridlines(2)

    headers_list = ["年月", "ユーザー数", "訪問者", "平均PV", "表示回数", "ENG率", "CV数", "CVR"]
    col_widths = [14, 14, 14, 10, 14, 10, 10, 10]
    for c, w in enumerate(col_widths):
        ws2.set_column(c, c, w)

    # セクションタイトル
    ws2.set_row(0, 28)
    ws2.merge_range(0, 0, 0, len(headers_list) - 1, "月別推移", section_title)

    # ヘッダー
    ws2.set_row(1, 28)
    for c, h in enumerate(headers_list):
        ws2.write(1, c, h, header)

    # サンプルデータ（最新が上）
    months = [
        ("2026年03月", 57059, 78015, 2.36, 184205, "69.40%", 419, "0.54%"),
        ("2026年02月", 55502, 71658, 2.45, 175225, "70.95%", 389, "0.54%"),
        ("2026年01月", 103831, 124321, 2.39, 297636, "54.76%", 375, "0.30%"),
        ("2025年12月", 166183, 186755, 2.00, 372964, "42.69%", 141, "0.08%"),
        ("2025年11月", 73630, 89100, 2.58, 229602, "60.49%", 6, "0.01%"),
        ("2025年10月", 59215, 74469, 2.91, 216421, "70.68%", 2, "0.00%"),
        ("2025年09月", 65503, 84211, 2.68, 225530, "68.59%", 0, "0.00%"),
        ("2025年08月", 59201, 74992, 2.88, 215853, "68.40%", 4, "0.01%"),
    ]

    for i, row_data in enumerate(months):
        r = i + 2
        is_alt = i % 2 == 1
        d_fmt = data_alt if is_alt else data
        n_fmt = num_alt if is_alt else num
        p_fmt = pct_alt if is_alt else pct
        ws2.set_row(r, 24)
        ws2.write(r, 0, row_data[0], d_fmt)
        ws2.write_number(r, 1, row_data[1], n_fmt)
        ws2.write_number(r, 2, row_data[2], n_fmt)
        ws2.write_number(r, 3, row_data[3], wb.add_format({
            "font_name": FONT, "font_size": 10, "font_color": DARK,
            "align": "right", "valign": "vcenter", "num_format": "0.00",
            "bg_color": BG_LIGHT if is_alt else WHITE,
            "border": 1, "border_color": STROKE,
        }))
        ws2.write_number(r, 4, row_data[4], n_fmt)
        ws2.write(r, 5, row_data[5], p_fmt)
        ws2.write_number(r, 6, row_data[6], n_fmt)
        ws2.write(r, 7, row_data[7], p_fmt)

    # 合計行
    tr = len(months) + 2
    ws2.set_row(tr, 26)
    ws2.write(tr, 0, "合計 / 平均", total_label)
    ws2.write_number(tr, 1, sum(m[1] for m in months), total_num)
    ws2.write_number(tr, 2, sum(m[2] for m in months), total_num)
    ws2.write_number(tr, 3, sum(m[3] for m in months) / len(months), wb.add_format({
        "font_name": FONT, "font_size": 10, "bold": True, "font_color": DARK,
        "bg_color": PRIMARY_LIGHT, "align": "right", "valign": "vcenter",
        "num_format": "0.00",
        "top": 2, "top_color": PRIMARY, "bottom": 1, "bottom_color": STROKE,
        "left": 1, "left_color": STROKE, "right": 1, "right_color": STROKE,
    }))
    ws2.write_number(tr, 4, sum(m[4] for m in months), total_num)
    ws2.write(tr, 5, "61.93%", total_pct)
    ws2.write_number(tr, 6, sum(m[6] for m in months), total_num)
    ws2.write(tr, 7, "0.19%", total_pct)

    # チャート
    chart = wb.add_chart({"type": "line"})
    for si, (label, col) in enumerate([("ユーザー", 1), ("訪問者", 2), ("表示回数", 4), ("CV", 6)]):
        color = CHART_COLORS[si]
        chart.add_series({
            "name": label,
            "categories": ["月別", 2, 0, tr - 1, 0],
            "values": ["月別", 2, col, tr - 1, col],
            "line": {"color": color, "width": 2},
            "marker": {"type": "circle", "size": 4, "fill": {"color": color}, "border": {"color": color}},
            "data_labels": {"value": True, "num_format": "#,##0", "font": {"name": FONT, "size": 7}},
        })
    chart.set_title({"name": "月別推移", "name_font": {"name": FONT, "bold": True, "size": 12}})
    chart.set_style(2)
    chart.set_chartarea({"border": {"none": True}, "fill": {"none": True}})
    chart.set_plotarea({"border": {"none": True}, "fill": {"none": True}})
    chart.set_legend({"position": "bottom", "font": {"name": FONT, "size": 9}})
    chart.set_x_axis({"num_font": {"name": FONT, "size": 8}})
    chart.set_y_axis({"num_font": {"name": FONT, "size": 8}, "num_format": "#,##0"})
    chart.set_size({"width": 720, "height": 380})
    ws2.insert_chart(0, len(headers_list) + 1, chart)

    # AI セクション
    ai_row = tr + 3
    ws2.merge_range(ai_row, 0, ai_row, len(headers_list) - 1, "■ AI 分析", ai_header_fmt)
    ws2.set_row(ai_row, 26)
    ai_row += 1
    ai_text = "2026年3月は前月比でユーザー数が2.8%増加し、エンゲージメント率は69.4%と安定しています。\nコンバージョン数419件は年間で最も高い水準であり、1月の大型流入をきっかけに定着した指名検索ユーザーの転換が進んでいると推測されます。"
    ws2.merge_range(ai_row, 0, ai_row, len(headers_list) - 1, ai_text, ai_body_fmt)
    ws2.set_row(ai_row, 60)

    # ──────────────────────────────────────────────────
    # 3. 集客チャネル（横棒サンプル）
    # ──────────────────────────────────────────────────
    ws3 = wb.add_worksheet("集客チャネル")
    ws3.set_footer("&C© グローレポーター Produced by GrowGroup Co.,Ltd.")
    ws3.hide_gridlines(2)

    ch_headers = ["チャネル", "訪問者", "割合", "コンバージョン", "CVR"]
    for c, w in enumerate([22, 14, 10, 14, 10]):
        ws3.set_column(c, c, w)

    ws3.set_row(0, 28)
    ws3.merge_range(0, 0, 0, len(ch_headers) - 1, "集客チャネル別", section_title)

    ws3.set_row(1, 28)
    for c, h in enumerate(ch_headers):
        ws3.write(1, c, h, header)

    channels = [
        ("オーガニック検索", 420153, "53.8%", 650, "0.15%"),
        ("ダイレクト", 310542, "39.8%", 180, "0.06%"),
        ("リスティング広告", 218430, "28.0%", 42, "0.02%"),
        ("参照元サイト", 65100, "8.3%", 15, "0.02%"),
        ("オーガニックSNS", 12500, "1.6%", 3, "0.02%"),
        ("メール", 5200, "0.7%", 1, "0.02%"),
    ]
    for i, (name, sess, rate, cv, cvr) in enumerate(channels):
        r = i + 2
        is_alt = i % 2 == 1
        ws3.set_row(r, 24)
        ws3.write(r, 0, name, data_alt if is_alt else data)
        ws3.write_number(r, 1, sess, num_alt if is_alt else num)
        ws3.write(r, 2, rate, pct_alt if is_alt else pct)
        ws3.write_number(r, 3, cv, num_alt if is_alt else num)
        ws3.write(r, 4, cvr, pct_alt if is_alt else pct)

    # 横棒チャート
    bar = wb.add_chart({"type": "bar"})
    bar.add_series({
        "name": "訪問者",
        "categories": ["集客チャネル", 2, 0, len(channels) + 1, 0],
        "values": ["集客チャネル", 2, 1, len(channels) + 1, 1],
        "fill": {"color": PRIMARY},
        "border": {"color": PRIMARY},
        "data_labels": {"value": True, "num_format": "#,##0", "font": {"name": FONT, "size": 8}},
    })
    bar.set_title({"name": "集客チャネル別 訪問者", "name_font": {"name": FONT, "bold": True, "size": 12}})
    bar.set_style(2)
    bar.set_chartarea({"border": {"none": True}, "fill": {"none": True}})
    bar.set_plotarea({"border": {"none": True}, "fill": {"none": True}})
    bar.set_legend({"position": "bottom", "font": {"name": FONT, "size": 9}})
    bar.set_y_axis({"reverse": True, "num_font": {"name": FONT, "size": 9}})
    bar.set_x_axis({"num_font": {"name": FONT, "size": 8}, "num_format": "#,##0"})
    bar.set_size({"width": 600, "height": 400})
    ws3.insert_chart(0, len(ch_headers) + 1, bar)

    wb.close()
    print(f"モック生成完了: {OUTPUT}")


if __name__ == "__main__":
    main()
