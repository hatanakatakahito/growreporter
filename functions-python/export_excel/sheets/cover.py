"""
レポート概要（表紙）シート
ブランドバー + タイトル + メタ情報 + 主要指標カード + 目次
"""

from datetime import datetime, timedelta, timezone

from shared.metrics import short_label_of

from ..helpers import safe_sheet_name

JST = timezone(timedelta(hours=9))
from ..styles import (
    FOOTER_TEXT,
    FONT_NAME,
    PRIMARY,
    BODY,
)


# 目次に載せるシート定義（Python 側で生成する順序と一致）
# (sheet_name, description, condition_key)
#   condition_key: allData.customSheets で該当データがあれば表示
TOC_SHEETS = [
    ("全体サマリー", f"主要指標・目標達成率・{short_label_of('conversions')}内訳", "summary"),
    ("月別", f"月別 {short_label_of('sessions')}・{short_label_of('engagementRate')}・{short_label_of('conversions')}推移", "dynamic:monthly"),
    ("ユーザー属性", "デバイス・年齢・性別・地域", "users"),
    ("日別", f"日別 {short_label_of('sessions')}・{short_label_of('conversions')}推移", "dynamic:daily"),
    ("曜日別", f"曜日別の{short_label_of('conversions')}発生パターン", "dynamic:weekly"),
    ("時間帯別", f"時間帯別の{short_label_of('sessions')}・{short_label_of('conversions')}", "dynamic:hourly"),
    ("集客チャネル", f"流入チャネル別 {short_label_of('totalUsers')}・{short_label_of('conversionRate')}", "dynamic:channels"),
    ("流入キーワード", f"GSC キーワード別 {short_label_of('clicks')}・{short_label_of('position')}", "dynamic:keywords"),
    ("被リンク元", f"参照元サイト別 {short_label_of('totalUsers')}・{short_label_of('conversions')}", "dynamic:referrals"),
    ("ページ別", f"ページ別 {short_label_of('screenPageViews')}・{short_label_of('engagementRate')}・{short_label_of('averageSessionDuration')}", "dynamic:pages"),
    ("ページ分類別", f"ディレクトリ別 {short_label_of('screenPageViews')} 集計", "dynamic:pageCategories"),
    ("ランディングページ", f"LP 別 {short_label_of('totalUsers')}・{short_label_of('engagementRate')}・{short_label_of('conversions')}", "dynamic:landingPages"),
    ("ファイルDL", "ファイルダウンロード数", "dynamic:fileDownloads"),
    ("外部リンク", f"外部リンク{short_label_of('clicks')}数", "dynamic:externalLinks"),
    ("コンバージョン一覧", f"{short_label_of('conversions')} 種別 × 月別内訳", "conversions"),
    ("逆算フロー", "フォーム ファネル分析", "reverseFlows"),
    ("改善提案", "AI が提案した改善施策一覧", "improvements"),
]


def create_cover_sheet(workbook, site_name: str, site_url: str, date_range: dict,
                       comp_date_range: dict | None, formats: dict,
                       kpi_cards: list | None = None,
                       available_sheets: list | None = None):
    """
    表紙シートを作成。
    kpi_cards: [(value_str, label), ...] 最大 4 件（主要指標カード）
    available_sheets: 目次に含めるシート名のリスト（実際に生成されたシートのみ）
    """
    ws = workbook.add_worksheet(safe_sheet_name("レポート概要"))
    ws.hide_gridlines(2)
    ws.set_footer(FOOTER_TEXT)

    # 列幅
    ws.set_column(0, 0, 3)
    for c in range(1, 5):
        ws.set_column(c, c, 18)
    ws.set_column(5, 5, 3)

    # ブランドライン
    brand_line = workbook.add_format({"bg_color": PRIMARY})
    ws.set_row(0, 4)
    for c in range(6):
        ws.write(0, c, "", brand_line)

    # タイトル
    ws.set_row(2, 40)
    ws.merge_range(2, 1, 2, 4, f"{site_name} 分析レポート", formats["cover_title"])

    ws.set_row(3, 24)
    ws.merge_range(3, 1, 3, 4, "GA4 / Search Console データ + AI 分析", formats["cover_subtitle"])

    # メタ情報
    row = 6
    info = [
        ("サイト名", site_name or "-"),
        ("サイト URL", site_url or "-"),
    ]
    if date_range and date_range.get("from") and date_range.get("to"):
        info.append(("分析期間", f"{date_range['from']} 〜 {date_range['to']}"))
    if comp_date_range and comp_date_range.get("from") and comp_date_range.get("to"):
        info.append(("比較期間", f"{comp_date_range['from']} 〜 {comp_date_range['to']}"))
    info.append(("生成日時", datetime.now(JST).strftime("%Y/%m/%d %H:%M")))

    for label, val in info:
        ws.set_row(row, 24)
        ws.write(row, 1, label, formats["cover_label"])
        ws.merge_range(row, 2, row, 4, val, formats["cover_value"])
        row += 1

    # 主要指標カード
    if kpi_cards:
        row += 2
        ws.set_row(row, 22)
        ws.merge_range(row, 1, row, 4, "  主要サマリー", formats["kpi_header"])
        row += 1

        # 4 枚まで表示（少ない場合は空白を埋める）
        cards = (kpi_cards + [("-", "")] * 4)[:4]
        ws.set_row(row, 30)
        for i, (val, _) in enumerate(cards):
            ws.write(row, 1 + i, val, formats["kpi_num"])
        row += 1
        ws.set_row(row, 18)
        for i, (_, lab) in enumerate(cards):
            ws.write(row, 1 + i, lab, formats["kpi_label"])
        row += 1

    # 目次
    row += 2
    ws.set_row(row, 28)
    ws.merge_range(row, 1, row, 4, "目次", formats["toc_section_title"])
    row += 1

    ws.set_row(row, 22)
    ws.write(row, 1, "#", formats["toc_num_header"])
    ws.write(row, 2, "シート", formats["toc_header"])
    ws.merge_range(row, 3, row, 4, "内容", formats["toc_header"])
    row += 1

    # 表示対象のシートを available_sheets で絞る
    available = set(available_sheets) if available_sheets else None
    items = [
        (name, desc) for name, desc, _ in TOC_SHEETS
        if available is None or name in available
    ]

    for i, (name, desc) in enumerate(items):
        ws.set_row(row, 22)
        ws.write(row, 1, f"{i + 1:02d}", formats["toc_num"])
        # ハイパーリンク
        try:
            ws.write_url(row, 2, f"internal:'{name}'!A1", formats["toc_name"], name)
        except Exception:
            ws.write(row, 2, name, formats["toc_name"])
        ws.merge_range(row, 3, row, 4, desc, formats["toc_desc"])
        row += 1

    # ブランド
    row += 2
    ws.write(row, 1, "グローレポータ", formats["cover_brand"])
    ws.write(
        row + 1,
        1,
        "© グローレポータ  Produced by GrowGroup Co.,Ltd.",
        workbook.add_format({"font_name": FONT_NAME, "font_size": 8, "font_color": BODY}),
    )

    return ws
