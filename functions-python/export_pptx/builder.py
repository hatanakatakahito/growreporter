"""
PPTX プレゼンテーション生成 — 旧 exportAnalysisToPptx.js のテンプレートを python-pptx に移植。

スライド構成:
  1. 表紙
  2. 全体サマリー
  3. トレンド分析（セクション区切り）
     - 月別（チャート / テーブル）
     - 日別（チャート / テーブル）
     - 曜日別
     - 時間帯別（チャート / テーブル）
  4. ユーザー分析（セクション区切り）
     - ドーナツ 4 本
     - 地域別ランキング
  5. 集客分析
     - チャネル / キーワード / 被リンク元
  6. コンテンツ分析
     - ページ別 / ページ分類別 / ランディング / ファイルDL / 外部リンク
  7. コンバージョン分析
     - 月次推移（チャート / テーブル）/ 逆算フロー
  8. Appendix（用語集）
"""

from __future__ import annotations

import io
from typing import Any

from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION, XL_LABEL_POSITION
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt, Emu
from lxml import etree

from .helpers import (
    AI_MIN_H,
    CHANNEL_MAP,
    CHART_PALETTE,
    CHART_PALETTE_HEX,
    CONTENT_W,
    CONTENT_Y,
    Color,
    DAY_NAMES,
    FONT_FACE,
    FOOTER_Y,
    MARGIN_X,
    SLIDE_H,
    SLIDE_W,
    TITLE_H,
    TITLE_Y,
    calc_layout,
    calc_table_only_layout,
    clean_markdown,
    column_align,
    fmt_change,
    fmt_date,
    fmt_num,
    fmt_pct,
    fmt_year_month,
    format_cell_value,
    format_number,
    get_table_font_size,
    hex_to_rgb,
    set_cell_bg,
    set_cell_text,
)


# ─── エントリポイント ────────────────────────────────────


class _Ctx:
    """スライド生成中の共有状態（ページ番号・日付ラベル等）。"""

    def __init__(self) -> None:
        self.slide_count = 0
        self.date_label = ""


def build_pptx_presentation(buffer: io.BytesIO, data: dict[str, Any]) -> None:
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)

    ctx = _Ctx()

    site_name = data.get("siteName") or "GrowReporter"
    date_range = data.get("dateRange") or {}
    comp_range = data.get("comparisonRange")
    sheets = data.get("sheets") or {}
    custom = data.get("customSheets") or {}
    ai = data.get("aiAnalysis") or {}
    memos = data.get("memos") or {}

    # 日付ラベル生成
    d_from = date_range.get("from") or ""
    d_to = date_range.get("to") or ""
    if d_from and d_to and len(d_to) >= 10:
        ctx.date_label = f"{d_from.replace('-', '.')}~{d_to[8:10]}"

    # 1. 表紙
    _create_cover_slide(prs, ctx, site_name, custom.get("siteUrl") or "", date_range, comp_range)

    # 2. 全体サマリー
    _create_summary_slide(
        prs, ctx,
        summary=custom.get("summary"),
        comp_summary=custom.get("compSummary"),
        kpi_settings=custom.get("kpiSettings"),
        ai_data=ai.get("analysis/summary"),
        memos=memos.get("analysis/summary") or memos.get("summary"),
    )

    # 3. トレンド分析
    _create_section_divider(prs, ctx, "トレンド分析")
    _create_monthly_slides(
        prs, ctx,
        monthly_sheet=sheets.get("monthly"),
        ai_data=ai.get("analysis/month"),
        memos=memos.get("analysis/month"),
    )
    _create_daily_slides(
        prs, ctx,
        daily_sheet=sheets.get("daily"),
        ai_data=ai.get("analysis/day"),
        memos=memos.get("analysis/day") or memos.get("day"),
    )
    _create_weekly_slide(
        prs, ctx,
        weekly_sheet=sheets.get("weekly"),
        ai_data=ai.get("analysis/week"),
        memos=memos.get("analysis/week") or memos.get("week"),
    )
    _create_hourly_slides(
        prs, ctx,
        hourly_sheet=sheets.get("hourly"),
        ai_data=ai.get("analysis/hour"),
        memos=memos.get("analysis/hour") or memos.get("hour"),
    )

    # 4. ユーザー分析
    _create_section_divider(prs, ctx, "ユーザー分析")
    _create_users_donut_slide(prs, ctx, demographics=custom.get("users"))
    _create_users_region_slide(
        prs, ctx,
        demographics=custom.get("users"),
        ai_data=ai.get("analysis/users"),
        memos=memos.get("analysis/users") or memos.get("users"),
    )

    # 5. 集客分析
    _create_section_divider(prs, ctx, "集客分析")
    _create_channels_slide(
        prs, ctx,
        channels_sheet=sheets.get("channels"),
        ai_data=ai.get("analysis/channels"),
        memos=memos.get("analysis/channels") or memos.get("channels"),
    )
    _create_keywords_slide(
        prs, ctx,
        keywords_sheet=sheets.get("keywords"),
        ai_data=ai.get("analysis/keywords"),
        memos=memos.get("analysis/keywords") or memos.get("keywords"),
    )
    _create_referrals_slide(
        prs, ctx,
        referrals_sheet=sheets.get("referrals"),
        ai_data=ai.get("analysis/referrals"),
        memos=memos.get("analysis/referrals") or memos.get("referrals"),
    )

    # 6. コンテンツ分析
    _create_section_divider(prs, ctx, "コンテンツ分析")
    _create_pages_slide(
        prs, ctx,
        pages_sheet=sheets.get("pages"),
        ai_data=ai.get("analysis/pages"),
        memos=memos.get("analysis/pages") or memos.get("pages"),
    )
    _create_page_categories_slide(
        prs, ctx,
        page_categories_sheet=sheets.get("pageCategories"),
        ai_data=ai.get("analysis/page-categories"),
        memos=memos.get("analysis/page-categories") or memos.get("pageCategories"),
    )
    _create_landing_pages_slide(
        prs, ctx,
        landing_sheet=sheets.get("landingPages"),
        ai_data=ai.get("analysis/landing-pages"),
        memos=memos.get("analysis/landing-pages") or memos.get("landingPages"),
    )
    _create_file_downloads_slide(
        prs, ctx,
        sheet=sheets.get("fileDownloads"),
        ai_data=ai.get("analysis/file-downloads"),
        memos=memos.get("analysis/file-downloads") or memos.get("fileDownloads"),
    )
    _create_external_links_slide(
        prs, ctx,
        sheet=sheets.get("externalLinks"),
        ai_data=ai.get("analysis/external-links"),
        memos=memos.get("analysis/external-links") or memos.get("externalLinks"),
    )

    # 7. コンバージョン分析
    _create_section_divider(prs, ctx, "コンバージョン分析")
    _create_conversions_slides(
        prs, ctx,
        conversions=custom.get("conversions"),
        ai_data=ai.get("analysis/conversions"),
        memos=memos.get("analysis/conversions") or memos.get("conversions"),
    )
    _create_reverse_flow_slide(
        prs, ctx,
        reverse_flows=custom.get("reverseFlows"),
        ai_data=ai.get("analysis/reverse-flow"),
        memos=memos.get("analysis/reverse-flow") or memos.get("reverseFlow"),
    )

    # 8. Appendix
    _create_section_divider(prs, ctx, "Appendix")
    _create_appendix_slide(prs, ctx)

    prs.save(buffer)


# ─── 共通フレーム ────────────────────────────────────────


def _add_slide_title(slide, ctx: _Ctx, title: str) -> None:
    tb = slide.shapes.add_textbox(
        Inches(MARGIN_X), Inches(TITLE_Y),
        Inches(CONTENT_W - 2.0), Inches(TITLE_H),
    )
    tf = tb.text_frame
    tf.margin_left = 0
    tf.margin_right = 0
    tf.word_wrap = False
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    run = p.add_run()
    run.text = title
    run.font.name = FONT_FACE
    run.font.size = Pt(14)
    run.font.bold = True
    run.font.color.rgb = Color.DARK
    tb.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE

    # タイトル下の横線（1pt 相当、PowerPoint が扱える最小幅に合わせる）
    line = slide.shapes.add_connector(
        1,  # STRAIGHT
        Inches(MARGIN_X), Inches(TITLE_Y + TITLE_H + 0.03),
        Inches(MARGIN_X + CONTENT_W), Inches(TITLE_Y + TITLE_H + 0.03),
    )
    line.line.color.rgb = Color.DARK
    line.line.width = Pt(1)
    _disable_shape_shadow(line)

    # 日付ラベル（右上）
    if ctx.date_label:
        dl = slide.shapes.add_textbox(
            Inches(SLIDE_W - MARGIN_X - 1.6), Inches(TITLE_Y + 0.08),
            Inches(1.6), Inches(0.28),
        )
        dtf = dl.text_frame
        dtf.margin_left = 0
        dtf.margin_right = 0
        dp = dtf.paragraphs[0]
        dp.alignment = PP_ALIGN.RIGHT
        drun = dp.add_run()
        drun.text = ctx.date_label
        drun.font.name = FONT_FACE
        drun.font.size = Pt(9)
        drun.font.color.rgb = Color.PRIMARY
        dl.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE


def _add_slide_footer(slide, ctx: _Ctx) -> None:
    ctx.slide_count += 1
    tb = slide.shapes.add_textbox(
        Inches(SLIDE_W - 1.5), Inches(FOOTER_Y),
        Inches(1.2), Inches(0.3),
    )
    tf = tb.text_frame
    tf.margin_left = 0
    tf.margin_right = 0
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.RIGHT
    run = p.add_run()
    run.text = str(ctx.slide_count)
    run.font.name = FONT_FACE
    run.font.size = Pt(8)
    run.font.color.rgb = Color.SUB_TEXT
    tb.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE


def _add_section_label(slide, ctx: _Ctx) -> None:
    """セクション区切りスライドは footer 色を白で描画。"""
    ctx.slide_count += 1
    tb = slide.shapes.add_textbox(
        Inches(SLIDE_W - 1.5), Inches(FOOTER_Y),
        Inches(1.2), Inches(0.3),
    )
    tf = tb.text_frame
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.RIGHT
    run = p.add_run()
    run.text = str(ctx.slide_count)
    run.font.name = FONT_FACE
    run.font.size = Pt(8)
    run.font.color.rgb = Color.WHITE
    tb.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE


# ─── 表（テーブル）ヘルパー ─────────────────────────────


def _build_table(
    slide,
    headers: list[dict],
    rows: list[list[Any]],
    col_widths: list[float],
    x: float,
    y: float,
    h: float,
    *,
    font_size: float | None = None,
    header_align_default: str = "center",
):
    """旧 buildTable 相当。headers = [{label, align}], rows は文字列 / 数値。"""
    total_w = sum(col_widths)
    cols = len(headers)
    rows_n = len(rows) + 1

    shape = slide.shapes.add_table(
        rows_n, cols,
        Inches(x), Inches(y),
        Inches(total_w), Inches(h),
    )
    table = shape.table
    table.first_row = False
    table.horz_banding = False
    table.last_row = False
    table.first_col = False
    table.last_col = False

    for i, w in enumerate(col_widths):
        table.columns[i].width = Inches(w)

    row_h = h / rows_n
    for i in range(rows_n):
        table.rows[i].height = Inches(row_h)

    if font_size is None:
        font_size = get_table_font_size(len(rows))

    # ヘッダー（見出し行は常にセンター揃え）
    for c, h_def in enumerate(headers):
        cell = table.cell(0, c)
        set_cell_bg(cell, Color.PRIMARY)
        set_cell_text(
            cell, h_def.get("label", ""),
            font_size=max(font_size, 8.5), bold=True,
            color=Color.WHITE,
            align="center",
            vertical="middle",
        )
        _set_cell_border(cell, Color.BORDER, width_pt=0.5)

    # データ行
    for r_idx, row in enumerate(rows):
        bg = Color.ALT_ROW if r_idx % 2 == 0 else Color.WHITE
        for c, val in enumerate(row):
            cell = table.cell(r_idx + 1, c)
            set_cell_bg(cell, bg)
            align = headers[c].get("align") if c < len(headers) else None
            if not align:
                align = "right" if isinstance(val, (int, float)) else "left"
            set_cell_text(
                cell, _cell_str(val),
                font_size=font_size,
                color=Color.DARK,
                align=align,
                vertical="middle",
            )
            _set_cell_border(cell, Color.BORDER, width_pt=0.5)

    return table


def _cell_str(val: Any) -> str:
    if val is None or val == "":
        return "-"
    if isinstance(val, float):
        if abs(val - int(val)) < 1e-9:
            return f"{int(val):,}"
        return f"{val:,.2f}"
    if isinstance(val, int):
        return f"{val:,}"
    return str(val)


def _disable_shape_shadow(shape) -> None:
    """図形のテーマ由来のエフェクト（影）を無効化する。

    <p:style><a:effectRef/></p:style> で参照されるテーマ効果を <a:effectLst/> で上書きする。
    <a:effectLst/> は <p:spPr> の EG_EffectProperties 位置（ln の後、scene3d/sp3d/extLst の前）に挿入する。
    """
    sp_pr = shape._element.spPr
    # 既存の effectLst/effectDag を削除
    for tag in ("a:effectLst", "a:effectDag"):
        for e in sp_pr.findall(qn(tag)):
            sp_pr.remove(e)
    # 挿入位置: scene3d/sp3d/extLst の直前（無ければ末尾）
    effect_lst = etree.Element(qn("a:effectLst"))
    successors = ("a:scene3d", "a:sp3d", "a:extLst")
    insert_idx = len(sp_pr)
    for i, child in enumerate(sp_pr):
        if etree.QName(child).localname in [qn(t).split("}")[-1] for t in successors]:
            insert_idx = i
            break
    sp_pr.insert(insert_idx, effect_lst)


def _set_cell_border(cell, color: "RGBColor", width_pt: float = 0.5) -> None:
    """4 方向のセル罫線を設定。

    OOXML スキーマ (CT_TableCellProperties) は lnL → lnR → lnT → lnB → 塗り の順を要求するため、
    tcPr の先頭に挿入する（塗りが既に追加されていても正しい順序を保つ）。
    """
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    hex_color = "{:02X}{:02X}{:02X}".format(color[0], color[1], color[2])
    width_emu = int(width_pt * 12700)

    tag_order = ("a:lnL", "a:lnR", "a:lnT", "a:lnB")

    # 既存の罫線要素を削除
    for tag in tag_order:
        for e in tcPr.findall(qn(tag)):
            tcPr.remove(e)

    # L → R → T → B の順で先頭に挿入
    for i, tag in enumerate(tag_order):
        ln = etree.Element(qn(tag))
        ln.set("w", str(width_emu))
        ln.set("cap", "flat")
        ln.set("cmpd", "sng")
        ln.set("algn", "ctr")
        solidFill = etree.SubElement(ln, qn("a:solidFill"))
        srgbClr = etree.SubElement(solidFill, qn("a:srgbClr"))
        srgbClr.set("val", hex_color)
        prstDash = etree.SubElement(ln, qn("a:prstDash"))
        prstDash.set("val", "solid")
        etree.SubElement(ln, qn("a:round"))
        tcPr.insert(i, ln)


# ─── AI 分析 + メモ フッター ─────────────────────────────


def _add_ai_and_memo_footer(
    slide,
    ai_data: dict | None,
    memos: list | None,
    y: float,
    max_h: float,
) -> None:
    if not ai_data or not ai_data.get("summary"):
        return
    ai_text = clean_markdown(ai_data.get("summary"))
    if not ai_text:
        return

    # AI 分析ラベル（紫）— PowerPoint の描画互換性のため通常の矩形を使用
    label = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(MARGIN_X), Inches(y),
        Inches(1.2), Inches(0.28),
    )
    label.fill.solid()
    label.fill.fore_color.rgb = Color.ACCENT
    label.line.fill.background()
    _disable_shape_shadow(label)
    ltf = label.text_frame
    ltf.margin_left = Emu(36576)
    ltf.margin_right = Emu(36576)
    ltf.margin_top = 0
    ltf.margin_bottom = 0
    lp = ltf.paragraphs[0]
    lp.alignment = PP_ALIGN.CENTER
    lrun = lp.add_run()
    lrun.text = "AI分析"
    lrun.font.name = FONT_FACE
    lrun.font.size = Pt(10)
    lrun.font.bold = True
    lrun.font.color.rgb = Color.WHITE
    ltf.vertical_anchor = MSO_ANCHOR.MIDDLE

    # AI 本文
    text_y = y + 0.35
    text_h = max(max_h - 0.35, 0.3)
    tb = slide.shapes.add_textbox(
        Inches(MARGIN_X + 0.1), Inches(text_y),
        Inches(CONTENT_W - 0.2), Inches(text_h),
    )
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    tf.margin_left = Emu(18288)
    tf.margin_right = Emu(18288)

    # テキストを段落ごとに追加（行間 1.2 倍）
    paragraphs = ai_text.split("\n")
    for idx, line in enumerate(paragraphs):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.line_spacing = 1.2
        run = p.add_run()
        run.text = line
        run.font.name = FONT_FACE
        run.font.size = Pt(10)
        run.font.color.rgb = Color.DARK


# ─── 1. 表紙 ────────────────────────────────────────────


def _create_cover_slide(
    prs: Presentation, ctx: _Ctx,
    site_name: str, site_url: str,
    date_range: dict | None, comp_range: dict | None,
) -> None:
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
    _fill_slide_bg(slide, Color.WHITE)

    # 「GrowReporter」ロゴテキスト
    logo_tb = slide.shapes.add_textbox(
        Inches(MARGIN_X), Inches(1.1),
        Inches(CONTENT_W), Inches(1.0),
    )
    ltf = logo_tb.text_frame
    ltf.margin_left = 0
    ltf.margin_right = 0
    lp = ltf.paragraphs[0]
    lp.alignment = PP_ALIGN.CENTER
    lrun = lp.add_run()
    lrun.text = "GrowReporter"
    lrun.font.name = FONT_FACE
    lrun.font.size = Pt(44)
    lrun.font.bold = True
    lrun.font.color.rgb = Color.PRIMARY

    # 「分析レポート」タイトル
    title_tb = slide.shapes.add_textbox(
        Inches(MARGIN_X), Inches(2.4),
        Inches(CONTENT_W), Inches(0.7),
    )
    ttf = title_tb.text_frame
    ttf.margin_left = 0
    ttf.margin_right = 0
    tp = ttf.paragraphs[0]
    tp.alignment = PP_ALIGN.CENTER
    trun = tp.add_run()
    trun.text = "分析レポート"
    trun.font.name = FONT_FACE
    trun.font.size = Pt(28)
    trun.font.bold = True
    trun.font.color.rgb = Color.PRIMARY
    ttf.vertical_anchor = MSO_ANCHOR.MIDDLE

    # 情報テーブル
    from datetime import datetime as _dt
    rows = [
        ("サイト名", site_name or ""),
        ("URL", site_url or ""),
        ("分析期間", f"{(date_range or {}).get('from', '')} 〜 {(date_range or {}).get('to', '')}"),
    ]
    if comp_range and comp_range.get("from") and comp_range.get("to"):
        rows.append(("比較期間", f"{comp_range.get('from')} 〜 {comp_range.get('to')}"))
    rows.append(("レポート作成日", _dt.now().strftime("%Y/%m/%d")))

    table_x = 2.2
    table_w = 6.6
    label_w = 1.8
    value_w = 4.8
    row_h = 0.55
    table_y = 3.5
    n = len(rows)

    shape = slide.shapes.add_table(
        n, 2,
        Inches(table_x), Inches(table_y),
        Inches(table_w), Inches(row_h * n),
    )
    table = shape.table
    table.first_row = False
    table.horz_banding = False
    table.columns[0].width = Inches(label_w)
    table.columns[1].width = Inches(value_w)

    for i, (label, val) in enumerate(rows):
        table.rows[i].height = Inches(row_h)

        lc = table.cell(i, 0)
        set_cell_bg(lc, Color.PRIMARY)
        set_cell_text(lc, label, font_size=12, bold=True, color=Color.WHITE, align="center")
        _set_cell_border(lc, Color.BORDER)

        vc = table.cell(i, 1)
        set_cell_bg(vc, Color.WHITE)
        set_cell_text(vc, val, font_size=12, color=Color.DARK, align="left")
        _set_cell_border(vc, Color.BORDER)

    _add_slide_footer(slide, ctx)


def _fill_slide_bg(slide, color) -> None:
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


# ─── 2. 全体サマリー ─────────────────────────────────────


def _create_summary_slide(
    prs: Presentation, ctx: _Ctx,
    summary: dict | None,
    comp_summary: dict | None,
    kpi_settings: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.WHITE)
    _add_slide_title(slide, ctx, "全体サマリー")

    if not summary or not summary.get("metrics"):
        _add_slide_footer(slide, ctx)
        return

    m = summary["metrics"]
    cm = (comp_summary or {}).get("metrics") or {}
    has_comp = bool(cm)

    metrics_data = [
        ("セッション数", m.get("sessions"), cm.get("sessions"), "number"),
        ("ユーザー数", m.get("totalUsers"), cm.get("totalUsers"), "number"),
        ("新規ユーザー数", m.get("newUsers"), cm.get("newUsers"), "number"),
        ("ページビュー数", m.get("pageViews"), cm.get("pageViews"), "number"),
        ("エンゲージメント率", m.get("engagementRate"), cm.get("engagementRate"), "percent"),
        ("コンバージョン数", m.get("conversions"), cm.get("conversions"), "number"),
    ]
    if m.get("clicks") or m.get("impressions"):
        metrics_data.extend([
            ("クリック数（GSC）", m.get("clicks"), cm.get("clicks"), "number"),
            ("表示回数（GSC）", m.get("impressions"), cm.get("impressions"), "number"),
            ("CTR（GSC）", m.get("ctr"), cm.get("ctr"), "percent"),
            ("平均掲載順位（GSC）", m.get("position"), cm.get("position"), "decimal"),
        ])

    def _fmt_val(val, kind):
        if val is None or val == "":
            return "-"
        if kind == "percent":
            return fmt_pct(val)
        if kind == "decimal":
            try:
                return f"{float(val):.1f}"
            except (ValueError, TypeError):
                return "-"
        return format_number(val)

    if has_comp:
        # 縦 1 列形式: ラベル / 当期 / 前期 / 変化率
        headers = [
            {"label": "指標", "align": "left"},
            {"label": "当期", "align": "right"},
            {"label": "前期", "align": "right"},
            {"label": "変化率", "align": "right"},
        ]
        rows_out = []
        for label, cur, prev, kind in metrics_data:
            change = ""
            if kind in ("number", "decimal"):
                change = fmt_change(cur, prev) or "-"
            elif kind == "percent":
                change = "-"
            rows_out.append([
                label,
                _fmt_val(cur, kind),
                _fmt_val(prev, kind) if prev is not None else "-",
                change or "-",
            ])
        col_widths = [3.0, 2.6, 2.6, 2.0]
        table_h = 0.42 * (len(rows_out) + 1)
        _build_table(
            slide, headers, rows_out, col_widths,
            x=MARGIN_X, y=CONTENT_Y, h=table_h,
            font_size=10,
        )
        kpi_end_y = CONTENT_Y + table_h + 0.2
    else:
        # 通常モード: 2列×N行（ラベル=青 / 値=白）
        pairs = [(label, _fmt_val(v, kind)) for label, v, _, kind in metrics_data]
        n_rows = (len(pairs) + 1) // 2
        row_h = 0.42  # AI 分析が入りきるよう少し低く（旧 0.50）
        table_h = row_h * n_rows

        shape = slide.shapes.add_table(
            n_rows, 4,
            Inches(MARGIN_X), Inches(CONTENT_Y),
            Inches(CONTENT_W), Inches(table_h),
        )
        table = shape.table
        table.first_row = False
        table.horz_banding = False
        col_w = [2.2, 2.85, 2.2, 2.85]
        for i, w in enumerate(col_w):
            table.columns[i].width = Inches(w)
        for r in range(n_rows):
            table.rows[r].height = Inches(row_h)
            for pos in (0, 1):
                idx = r * 2 + pos
                if idx >= len(pairs):
                    for c in (pos * 2, pos * 2 + 1):
                        cell = table.cell(r, c)
                        set_cell_bg(cell, Color.WHITE)
                        set_cell_text(cell, "", font_size=11)
                    continue
                label, val = pairs[idx]
                lc = table.cell(r, pos * 2)
                set_cell_bg(lc, Color.PRIMARY)
                set_cell_text(lc, label, font_size=11, bold=True, color=Color.WHITE, align="center")
                _set_cell_border(lc, Color.BORDER)
                vc = table.cell(r, pos * 2 + 1)
                set_cell_bg(vc, Color.WHITE)
                set_cell_text(vc, val, font_size=13, bold=True, color=Color.PRIMARY, align="right")
                _set_cell_border(vc, Color.BORDER)
        kpi_end_y = CONTENT_Y + table_h + 0.2

    # KPI 達成状況
    if kpi_settings and kpi_settings.get("kpiList"):
        active_kpis = [k for k in kpi_settings["kpiList"] if k.get("isActive")]
        if active_kpis:
            tb = slide.shapes.add_textbox(
                Inches(MARGIN_X), Inches(kpi_end_y),
                Inches(CONTENT_W), Inches(0.3),
            )
            tf = tb.text_frame
            tf.margin_left = 0
            tf.margin_right = 0
            p = tf.paragraphs[0]
            run = p.add_run()
            run.text = "KPI達成状況"
            run.font.name = FONT_FACE
            run.font.size = Pt(12)
            run.font.bold = True
            run.font.color.rgb = Color.DARK
            kpi_end_y += 0.35

            headers = [
                {"label": "指標", "align": "left"},
                {"label": "目標値", "align": "right"},
                {"label": "実績値", "align": "right"},
                {"label": "達成率", "align": "right"},
            ]
            rows_out = []
            for k in active_kpis:
                actual = _get_kpi_actual(k, summary)
                tgt = k.get("target")
                try:
                    rate = f"{(float(actual) / float(tgt)) * 100:.1f}%" if tgt and actual is not None else "-"
                except (ValueError, TypeError, ZeroDivisionError):
                    rate = "-"
                rows_out.append([
                    k.get("label") or k.get("metric") or "",
                    format_number(tgt),
                    format_number(actual),
                    rate,
                ])
            tbl_h = 0.36 * (len(rows_out) + 1)  # KPI 表も少し低く（旧 0.4）
            _build_table(
                slide, headers, rows_out, [3.5, 2.2, 2.2, 2.2],
                x=MARGIN_X, y=kpi_end_y, h=tbl_h,
                font_size=10,
            )
            kpi_end_y += tbl_h + 0.1

    # AI + メモ
    ai_y = kpi_end_y + 0.1
    ai_h = max(FOOTER_Y - ai_y - 0.05, 0)
    _add_ai_and_memo_footer(slide, ai_data, memos, ai_y, ai_h)

    _add_slide_footer(slide, ctx)


def _get_kpi_actual(kpi: dict, summary: dict | None) -> Any:
    if not summary or not summary.get("metrics"):
        return None
    m = summary["metrics"]
    mapping = {
        "sessions": m.get("sessions"),
        "totalUsers": m.get("totalUsers"),
        "newUsers": m.get("newUsers"),
        "screenPageViews": m.get("pageViews"),
        "engagementRate": (m.get("engagementRate") * 100) if isinstance(m.get("engagementRate"), (int, float)) else None,
        "conversions": m.get("conversions"),
        "clicks": m.get("clicks"),
        "impressions": m.get("impressions"),
    }
    if kpi.get("isConversion") and kpi.get("eventName"):
        cv = summary.get("conversions") or {}
        return cv.get(kpi["eventName"], 0)
    return mapping.get(kpi.get("metric"))


# ─── セクション区切り ────────────────────────────────────


def _create_section_divider(prs: Presentation, ctx: _Ctx, title: str) -> None:
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.PRIMARY)
    tb = slide.shapes.add_textbox(
        Inches(0), Inches(0),
        Inches(SLIDE_W), Inches(SLIDE_H),
    )
    tf = tb.text_frame
    tf.margin_left = 0
    tf.margin_right = 0
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    run.text = title
    run.font.name = FONT_FACE
    run.font.size = Pt(32)
    run.font.bold = True
    run.font.color.rgb = Color.WHITE
    tb.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    _add_section_label(slide, ctx)


# ─── チャートヘルパー ────────────────────────────────────


def _apply_line_chart_style(chart, colors_hex: list[str]) -> None:
    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.BOTTOM
    chart.legend.include_in_layout = False
    chart.legend.font.size = Pt(11)
    chart.legend.font.name = FONT_FACE

    for i, series in enumerate(chart.series):
        c = hex_to_rgb(colors_hex[i % len(colors_hex)])
        series.format.line.color.rgb = c
        series.format.line.width = Pt(2)
        # Marker
        try:
            marker = series.marker
            marker.style = 2  # circle
            marker.size = 5
            marker.format.fill.solid()
            marker.format.fill.fore_color.rgb = c
            marker.format.line.color.rgb = c
        except Exception:
            pass

    _style_chart_axes(chart, cat_font=10, val_font=10)


def _apply_column_chart_style(chart, colors_hex: list[str], cat_font: float = 10, rotation: int = 0) -> None:
    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.BOTTOM
    chart.legend.include_in_layout = False
    chart.legend.font.size = Pt(11)
    chart.legend.font.name = FONT_FACE

    for i, series in enumerate(chart.series):
        c = hex_to_rgb(colors_hex[i % len(colors_hex)])
        series.format.fill.solid()
        series.format.fill.fore_color.rgb = c
        series.format.line.fill.background()

    _style_chart_axes(chart, cat_font=cat_font, val_font=10, cat_rotation=rotation)


def _apply_pie_chart_style(chart, colors_hex: list[str], show_percentage: bool = True) -> None:
    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.RIGHT
    chart.legend.include_in_layout = False
    chart.legend.font.size = Pt(11)
    chart.legend.font.name = FONT_FACE

    # チャートタイトル（系列名の自動タイトル）が巨大化する問題を是正 → 12pt 固定
    try:
        series_name = chart.series[0].name if len(chart.series) else ""
    except Exception:
        series_name = ""
    chart.has_title = True
    tf = chart.chart_title.text_frame
    tf.text = series_name or ""
    for p in tf.paragraphs:
        for r in p.runs:
            r.font.size = Pt(12)
            r.font.name = FONT_FACE
            r.font.bold = True
            r.font.color.rgb = Color.DARK

    plot = chart.plots[0]
    points = plot.series[0].points
    for i, point in enumerate(points):
        try:
            c = hex_to_rgb(colors_hex[i % len(colors_hex)])
            point.format.fill.solid()
            point.format.fill.fore_color.rgb = c
            point.format.line.fill.background()
        except Exception:
            pass

    plot.has_data_labels = True
    dl = plot.data_labels
    dl.show_percentage = show_percentage
    dl.show_value = False
    dl.show_category_name = False
    dl.show_legend_key = False
    dl.show_series_name = False
    # NOTE: dLblPos=outEnd はパイ／ドーナツで PowerPoint 互換性問題の報告あり — 既定値を使用
    dl.font.size = Pt(9)
    dl.font.name = FONT_FACE
    dl.number_format = "0.0%"


def _set_plot_area_layout(chart, x: float = 0.08, y: float = 0.05, w: float = 0.88, h: float = 0.75) -> None:
    """<c:plotArea> に manualLayout を追加してプロット領域の相対位置を制御する。

    x,y,w,h はチャート全体に対する比率 (0-1)。既定では高さ 75% に抑えてチャート下端と凡例の間に余白を確保。
    """
    chart_elem = chart._chartSpace
    plot_area = chart_elem.find(".//" + qn("c:plotArea"))
    if plot_area is None:
        return
    # 既存 layout を削除
    for existing in plot_area.findall(qn("c:layout")):
        plot_area.remove(existing)
    layout = etree.Element(qn("c:layout"))
    manual = etree.SubElement(layout, qn("c:manualLayout"))
    for tag, val in (
        ("c:layoutTarget", "inner"),
        ("c:xMode", "edge"),
        ("c:yMode", "edge"),
    ):
        e = etree.SubElement(manual, qn(tag))
        e.set("val", val)
    for tag, val in (
        ("c:x", f"{x}"),
        ("c:y", f"{y}"),
        ("c:w", f"{w}"),
        ("c:h", f"{h}"),
    ):
        e = etree.SubElement(manual, qn(tag))
        e.set("val", f"{val}")
    # plotArea の最初の子として挿入（schema 上 layout が最初）
    plot_area.insert(0, layout)


def _style_chart_axes(chart, cat_font: float = 10, val_font: float = 10, cat_rotation: int = 0) -> None:
    try:
        ca = chart.category_axis
        ca.tick_labels.font.size = Pt(cat_font)
        ca.tick_labels.font.name = FONT_FACE
        if cat_rotation:
            ca.tick_labels.rotation = -abs(cat_rotation)
    except Exception:
        pass
    try:
        va = chart.value_axis
        va.tick_labels.font.size = Pt(val_font)
        va.tick_labels.font.name = FONT_FACE
    except Exception:
        pass


# ─── 3. 月別 ─────────────────────────────────────────────


def _create_monthly_slides(
    prs: Presentation, ctx: _Ctx,
    monthly_sheet: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not monthly_sheet or not monthly_sheet.get("rows"):
        return
    rows_desc = monthly_sheet["rows"]  # adapted: 降順
    rows_asc = list(reversed(rows_desc))
    comp_rows_desc = monthly_sheet.get("compRows") or []
    comp_rows_asc = list(reversed(comp_rows_desc))

    # ─── チャートスライド ───
    slide1 = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide1, Color.WHITE)
    _add_slide_title(slide1, ctx, "月別（13ヶ月推移）")

    labels = [r.get("label", "") for r in rows_asc]
    chart_data = CategoryChartData()
    chart_data.categories = labels
    chart_data.add_series("ユーザー", [fmt_num(r.get("users")) for r in rows_asc])
    chart_data.add_series("セッション", [fmt_num(r.get("sessions")) for r in rows_asc])
    chart_data.add_series("PV", [fmt_num(r.get("pageViews")) for r in rows_asc])
    chart_data.add_series("CV", [fmt_num(r.get("conversions")) for r in rows_asc])
    colors = ["3b82f6", "f59e0b", "8b5cf6", "ef4444"]
    if comp_rows_asc:
        chart_data.add_series("前期セッション", [fmt_num(r.get("sessions")) for r in comp_rows_asc])
        chart_data.add_series("前期CV", [fmt_num(r.get("conversions")) for r in comp_rows_asc])
        colors += ["93c5fd", "fca5a5"]

    chart_h = FOOTER_Y - CONTENT_Y - 0.6
    chart = slide1.shapes.add_chart(
        XL_CHART_TYPE.LINE,
        Inches(MARGIN_X), Inches(CONTENT_Y),
        Inches(CONTENT_W), Inches(chart_h),
        chart_data,
    ).chart
    _apply_line_chart_style(chart, colors)

    _add_slide_footer(slide1, ctx)

    # ─── テーブルスライド ───
    slide2 = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide2, Color.WHITE)
    _add_slide_title(slide2, ctx, "月別（13ヶ月推移）データ")

    has_ai = bool(ai_data and ai_data.get("summary"))
    layout = calc_table_only_layout(has_ai)

    headers = [
        {"label": "月", "align": "center"},
        {"label": "セッション", "align": "right"},
        {"label": "ユーザー", "align": "right"},
        {"label": "新規ユーザー", "align": "right"},
        {"label": "PV", "align": "right"},
        {"label": "エンゲ率", "align": "right"},
        {"label": "CV", "align": "right"},
        {"label": "CVR", "align": "right"},
    ]
    rows_out = [
        [
            r.get("label", ""),
            format_number(r.get("sessions")),
            format_number(r.get("users")),
            format_number(r.get("newUsers")),
            format_number(r.get("pageViews")),
            fmt_pct(r.get("engagementRate")),
            format_number(r.get("conversions")),
            fmt_pct(r.get("conversionRate")),
        ]
        for r in rows_desc
    ]
    _build_table(
        slide2, headers, rows_out, [1.2, 1.3, 1.3, 1.3, 1.2, 1.1, 1.1, 1.1],
        x=MARGIN_X, y=layout["table_y"], h=layout["table_h"],
        font_size=get_table_font_size(len(rows_out)),
    )
    _add_ai_and_memo_footer(slide2, ai_data, memos, layout["ai_y"], layout["ai_h"])
    _add_slide_footer(slide2, ctx)


# ─── 4. 日別 ─────────────────────────────────────────────


def _create_daily_slides(
    prs: Presentation, ctx: _Ctx,
    daily_sheet: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not daily_sheet or not daily_sheet.get("rows"):
        return
    rows_desc = daily_sheet["rows"]
    rows_asc = list(reversed(rows_desc))
    comp_rows_desc = daily_sheet.get("compRows") or []
    comp_rows_asc = list(reversed(comp_rows_desc))

    # ─── チャートスライド ───
    slide1 = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide1, Color.WHITE)
    _add_slide_title(slide1, ctx, "日別推移")

    labels = [_short_date(r.get("date", "")) for r in rows_asc]
    chart_data = CategoryChartData()
    chart_data.categories = labels
    chart_data.add_series("セッション", [fmt_num(r.get("sessions")) for r in rows_asc])
    chart_data.add_series("CV", [fmt_num(r.get("conversions")) for r in rows_asc])
    colors = ["3b82f6", "ef4444"]
    if comp_rows_asc:
        chart_data.add_series("前期セッション", [fmt_num(r.get("sessions")) for r in comp_rows_asc])
        chart_data.add_series("前期CV", [fmt_num(r.get("conversions")) for r in comp_rows_asc])
        colors += ["93c5fd", "fca5a5"]

    chart_h = FOOTER_Y - CONTENT_Y - 0.6
    chart = slide1.shapes.add_chart(
        XL_CHART_TYPE.LINE,
        Inches(MARGIN_X), Inches(CONTENT_Y),
        Inches(CONTENT_W), Inches(chart_h),
        chart_data,
    ).chart
    _apply_line_chart_style(chart, colors)
    _style_chart_axes(
        chart,
        cat_font=7 if len(rows_asc) > 31 else 8,
        val_font=10,
        cat_rotation=45 if len(rows_asc) > 15 else 0,
    )
    # 日別推移は項目数が多いため凡例を 6pt に縮小
    chart.legend.font.size = Pt(6)
    _add_slide_footer(slide1, ctx)

    # ─── テーブルスライド（左右 2 列） ───
    slide2 = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide2, Color.WHITE)
    _add_slide_title(slide2, ctx, "日別推移（データ）")

    has_ai = bool(ai_data and ai_data.get("summary"))
    layout = calc_table_only_layout(has_ai)

    headers = [
        {"label": "日付", "align": "center"},
        {"label": "セッション", "align": "right"},
        {"label": "CV", "align": "right"},
    ]
    rows_out = [
        [r.get("date", ""), format_number(r.get("sessions")), format_number(r.get("conversions"))]
        for r in rows_desc
    ]
    mid = (len(rows_out) + 1) // 2
    left = rows_out[:mid]
    right = rows_out[mid:]
    gap = 0.3
    half_w = (CONTENT_W - gap) / 2
    col_w = [1.6, 1.8, 1.55]
    # スケール
    scale = half_w / sum(col_w)
    col_w_scaled = [w * scale for w in col_w]
    font_size = get_table_font_size(mid)

    _build_table(
        slide2, headers, left, col_w_scaled,
        x=MARGIN_X, y=layout["table_y"], h=layout["table_h"],
        font_size=font_size,
    )
    if right:
        _build_table(
            slide2, headers, right, col_w_scaled,
            x=MARGIN_X + half_w + gap, y=layout["table_y"], h=layout["table_h"],
            font_size=font_size,
        )

    _add_ai_and_memo_footer(slide2, ai_data, memos, layout["ai_y"], layout["ai_h"])
    _add_slide_footer(slide2, ctx)


def _short_date(s: str) -> str:
    # "2026/04/01" → "04/01"
    if not s:
        return ""
    parts = str(s).split("/")
    if len(parts) == 3:
        return f"{parts[1]}/{parts[2]}"
    return s


# ─── 5. 曜日別 ───────────────────────────────────────────


def _create_weekly_slide(
    prs: Presentation, ctx: _Ctx,
    weekly_sheet: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not weekly_sheet or not weekly_sheet.get("rows"):
        return
    rows = weekly_sheet["rows"]

    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.WHITE)
    _add_slide_title(slide, ctx, "曜日別")

    has_ai = bool(ai_data and ai_data.get("summary"))
    layout = calc_layout(7, has_ai)

    labels = [r.get("dayName", "") for r in rows]
    chart_data = CategoryChartData()
    chart_data.categories = labels
    chart_data.add_series("セッション", [fmt_num(r.get("sessions")) for r in rows])
    chart_data.add_series("CV", [fmt_num(r.get("conversions")) for r in rows])

    chart = slide.shapes.add_chart(
        XL_CHART_TYPE.COLUMN_CLUSTERED,
        Inches(MARGIN_X), Inches(layout["chart_y"]),
        Inches(CONTENT_W), Inches(layout["chart_h"]),
        chart_data,
    ).chart
    _apply_column_chart_style(chart, ["3b82f6", "ef4444"], cat_font=8)

    headers = [
        {"label": "曜日", "align": "center"},
        {"label": "セッション", "align": "right"},
        {"label": "CV", "align": "right"},
    ]
    rows_out = [
        [r.get("dayName", ""), format_number(r.get("sessions")), format_number(r.get("conversions"))]
        for r in rows
    ]
    _build_table(
        slide, headers, rows_out, [3.0, 3.6, 3.5],
        x=MARGIN_X, y=layout["table_y"], h=layout["table_h"],
        font_size=10,
    )
    _add_ai_and_memo_footer(slide, ai_data, memos, layout["ai_y"], layout["ai_h"])
    _add_slide_footer(slide, ctx)


# ─── 6. 時間帯別 ─────────────────────────────────────────


def _create_hourly_slides(
    prs: Presentation, ctx: _Ctx,
    hourly_sheet: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not hourly_sheet or not hourly_sheet.get("rows"):
        return
    rows = hourly_sheet["rows"]

    # ─── チャート ───
    slide1 = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide1, Color.WHITE)
    _add_slide_title(slide1, ctx, "時間帯別")

    labels = [r.get("hour", "") for r in rows]
    chart_data = CategoryChartData()
    chart_data.categories = labels
    chart_data.add_series("セッション", [fmt_num(r.get("sessions")) for r in rows])
    chart_data.add_series("CV", [fmt_num(r.get("conversions")) for r in rows])

    chart_h = FOOTER_Y - CONTENT_Y - 0.6
    chart = slide1.shapes.add_chart(
        XL_CHART_TYPE.COLUMN_CLUSTERED,
        Inches(MARGIN_X), Inches(CONTENT_Y),
        Inches(CONTENT_W), Inches(chart_h),
        chart_data,
    ).chart
    _apply_column_chart_style(chart, ["3b82f6", "ef4444"], cat_font=8)
    _add_slide_footer(slide1, ctx)

    # ─── テーブル（左右 2 列） ───
    slide2 = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide2, Color.WHITE)
    _add_slide_title(slide2, ctx, "時間帯別（データ）")

    has_ai = bool(ai_data and ai_data.get("summary"))
    layout = calc_table_only_layout(has_ai)

    headers = [
        {"label": "時間", "align": "center"},
        {"label": "セッション", "align": "right"},
        {"label": "CV", "align": "right"},
    ]
    rows_out = [
        [r.get("hour", ""), format_number(r.get("sessions")), format_number(r.get("conversions"))]
        for r in rows
    ]
    mid = (len(rows_out) + 1) // 2
    left = rows_out[:mid]
    right = rows_out[mid:]
    gap = 0.3
    half_w = (CONTENT_W - gap) / 2
    col_w = [1.6, 1.8, 1.55]
    scale = half_w / sum(col_w)
    col_w_scaled = [w * scale for w in col_w]
    font_size = get_table_font_size(mid)

    _build_table(
        slide2, headers, left, col_w_scaled,
        x=MARGIN_X, y=layout["table_y"], h=layout["table_h"],
        font_size=font_size,
    )
    if right:
        _build_table(
            slide2, headers, right, col_w_scaled,
            x=MARGIN_X + half_w + gap, y=layout["table_y"], h=layout["table_h"],
            font_size=font_size,
        )

    _add_ai_and_memo_footer(slide2, ai_data, memos, layout["ai_y"], layout["ai_h"])
    _add_slide_footer(slide2, ctx)


# ─── 7. ユーザー属性（ドーナツ 4） ────────────────────────


def _create_users_donut_slide(
    prs: Presentation, ctx: _Ctx,
    demographics: dict | None,
) -> None:
    if not demographics or not demographics.get("data"):
        return
    data = demographics["data"]
    configs = [
        ("新規/リピーター", data.get("newReturning")),
        ("性別", data.get("gender")),
        ("年齢層", data.get("age")),
        ("デバイス", data.get("device")),
    ]
    if not any(cfg for _, cfg in configs if cfg):
        return

    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.WHITE)
    _add_slide_title(slide, ctx, "ユーザー属性")

    # データがあるチャートだけを抽出して詰めて配置（1〜4 本で可変レイアウト）
    valid_configs = [(t, items) for t, items in configs if items]
    n = len(valid_configs)
    if n == 0:
        _add_slide_footer(slide, ctx)
        return

    # 本数に応じたチャートサイズ（縦幅を縮めてタイトル・凡例をドーナツに近づける）
    if n == 1:
        chart_w, chart_h, gap = 4.5, 4.5, 0.0
    elif n == 2:
        chart_w, chart_h, gap = 4.0, 4.5, 0.3
    elif n == 3:
        chart_w, chart_h, gap = 3.0, 4.2, 0.2
    else:  # 4
        chart_w, chart_h, gap = 2.3, 4.0, 0.15

    total_w = chart_w * n + gap * (n - 1)
    x_start = (SLIDE_W - total_w) / 2
    y_chart = 1.5  # 垂直中央付近から配置

    for i, (title, items) in enumerate(valid_configs):
        x = x_start + i * (chart_w + gap)

        labels = [str(d.get("name") or d.get("label") or "") for d in items]
        values = [fmt_num(d.get("value") or d.get("count") or d.get("users") or 0) for d in items]

        cd = CategoryChartData()
        cd.categories = labels
        cd.add_series(title, values)

        chart = slide.shapes.add_chart(
            XL_CHART_TYPE.DOUGHNUT,
            Inches(x), Inches(y_chart),
            Inches(chart_w), Inches(chart_h),
            cd,
        ).chart
        _apply_pie_chart_style(chart, CHART_PALETTE_HEX)
        # チャート内蔵タイトルを使用
        chart.has_title = True
        title_tf = chart.chart_title.text_frame
        title_tf.text = title
        for p in title_tf.paragraphs:
            for r in p.runs:
                r.font.size = Pt(13)
                r.font.bold = True
                r.font.name = FONT_FACE
                r.font.color.rgb = Color.DARK
        # 凡例は下に
        chart.legend.position = XL_LEGEND_POSITION.BOTTOM
        chart.legend.font.size = Pt(10)
        chart.legend.include_in_layout = False
        # タイトル直下にドーナツを配置、凡例との余白も最小化
        _set_plot_area_layout(chart, x=0.05, y=0.18, w=0.90, h=0.68)

    _add_slide_footer(slide, ctx)


# ─── 8. ユーザー属性（地域） ─────────────────────────────


def _create_users_region_slide(
    prs: Presentation, ctx: _Ctx,
    demographics: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not demographics or not demographics.get("data"):
        return
    location = demographics["data"].get("location") or {}
    region_data = location.get("region") or location.get("country") or []
    if not region_data:
        return
    top = region_data[:20]

    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.WHITE)
    _add_slide_title(slide, ctx, "地域別ランキング Top 20")

    has_ai = bool(ai_data and ai_data.get("summary")) or bool(memos)
    layout = calc_table_only_layout(has_ai)

    headers = [
        {"label": "#", "align": "center"},
        {"label": "地域", "align": "left"},
        {"label": "ユーザー数", "align": "right"},
        {"label": "割合", "align": "right"},
    ]
    rows_out = [
        [
            i + 1,
            d.get("name") or "",
            format_number(d.get("value") or d.get("users") or 0),
            f"{float(d.get('percentage')):.1f}%" if d.get("percentage") is not None else "-",
        ]
        for i, d in enumerate(top)
    ]

    # 左右 2 列に分割（上 10 件／下 10 件）
    mid = (len(rows_out) + 1) // 2
    left = rows_out[:mid]
    right = rows_out[mid:]
    gap = 0.3
    half_w = (CONTENT_W - gap) / 2
    col_w = [0.5, 2.8, 1.3, 1.2]
    scale = half_w / sum(col_w)
    col_w_scaled = [w * scale for w in col_w]

    # テーブル高さは 11 行（ヘッダ含む）で 0.32"/行に
    tbl_h = min(layout["table_h"], 0.36 * (mid + 1))
    font_size = get_table_font_size(mid)

    _build_table(
        slide, headers, left, col_w_scaled,
        x=MARGIN_X, y=layout["table_y"], h=tbl_h,
        font_size=font_size,
    )
    if right:
        _build_table(
            slide, headers, right, col_w_scaled,
            x=MARGIN_X + half_w + gap, y=layout["table_y"], h=tbl_h,
            font_size=font_size,
        )

    # AI 分析はテーブル直下に
    ai_y = layout["table_y"] + tbl_h + 0.3
    ai_h = max(FOOTER_Y - ai_y - 0.1, AI_MIN_H)
    _add_ai_and_memo_footer(slide, ai_data, memos, ai_y, ai_h)
    _add_slide_footer(slide, ctx)


# ─── 9. 集客チャネル ─────────────────────────────────────


def _create_channels_slide(
    prs: Presentation, ctx: _Ctx,
    channels_sheet: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not channels_sheet or not channels_sheet.get("rows"):
        return
    rows = channels_sheet["rows"]

    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.WHITE)
    _add_slide_title(slide, ctx, "集客チャネル")

    has_ai = bool(ai_data and ai_data.get("summary"))
    layout = calc_layout(min(len(rows), 10), has_ai)

    # Top 7 + その他
    sorted_rows = sorted(rows, key=lambda r: -fmt_num(r.get("sessions")))
    top7 = sorted_rows[:7]
    others = sorted_rows[7:]
    pie_labels = [r.get("channelName", "") for r in top7]
    pie_values = [fmt_num(r.get("sessions")) for r in top7]
    others_total = sum(fmt_num(r.get("sessions")) for r in others)
    if others_total > 0:
        pie_labels.append("その他")
        pie_values.append(others_total)

    cd = CategoryChartData()
    cd.categories = pie_labels
    cd.add_series("セッション", pie_values)
    chart = slide.shapes.add_chart(
        XL_CHART_TYPE.PIE,
        Inches(2.7), Inches(layout["chart_y"]),
        Inches(5.5), Inches(layout["chart_h"]),
        cd,
    ).chart
    _apply_pie_chart_style(chart, CHART_PALETTE_HEX)

    headers = [
        {"label": "チャネル", "align": "left"},
        {"label": "セッション", "align": "right"},
        {"label": "ユーザー", "align": "right"},
        {"label": "CV", "align": "right"},
    ]
    rows_out = [
        [
            r.get("channelName", ""),
            format_number(r.get("sessions")),
            format_number(r.get("users")),
            format_number(r.get("conversions")),
        ]
        for r in sorted_rows[:10]
    ]
    _build_table(
        slide, headers, rows_out, [3.5, 2.5, 2.2, 1.9],
        x=MARGIN_X, y=layout["table_y"], h=layout["table_h"],
    )
    _add_ai_and_memo_footer(slide, ai_data, memos, layout["ai_y"], layout["ai_h"])
    _add_slide_footer(slide, ctx)


# ─── 10. 流入キーワード ──────────────────────────────────


def _create_keywords_slide(
    prs: Presentation, ctx: _Ctx,
    keywords_sheet: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not keywords_sheet or not keywords_sheet.get("rows"):
        return
    rows = sorted(keywords_sheet["rows"], key=lambda r: -fmt_num(r.get("clicks")))[:20]

    # ─── スライド1: テーブル（Top20 は長いので AI 分析は別ページへ分離） ───
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.WHITE)
    _add_slide_title(slide, ctx, "流入キーワード Top 20")

    layout = calc_table_only_layout(has_ai=False)  # テーブル領域をフル活用

    headers = [
        {"label": "#", "align": "center"},
        {"label": "キーワード", "align": "left"},
        {"label": "クリック", "align": "right"},
        {"label": "表示回数", "align": "right"},
        {"label": "CTR", "align": "right"},
        {"label": "掲載順位", "align": "right"},
    ]
    rows_out = [
        [
            i + 1,
            r.get("keyword", ""),
            format_number(r.get("clicks")),
            format_number(r.get("impressions")),
            fmt_pct(r.get("ctr")),
            f"{float(r.get('position')):.1f}" if r.get("position") is not None else "-",
        ]
        for i, r in enumerate(rows)
    ]
    _build_table(
        slide, headers, rows_out, [0.6, 4.0, 1.5, 1.5, 1.2, 1.3],
        x=MARGIN_X, y=layout["table_y"], h=layout["table_h"],
        font_size=get_table_font_size(len(rows_out)),
    )
    _add_slide_footer(slide, ctx)

    # ─── スライド2: AI 分析 ───
    if (ai_data and ai_data.get("summary")) or memos:
        slide_ai = prs.slides.add_slide(prs.slide_layouts[6])
        _fill_slide_bg(slide_ai, Color.WHITE)
        _add_slide_title(slide_ai, ctx, "流入キーワード Top 20（AI分析）")
        ai_y = CONTENT_Y
        ai_h = FOOTER_Y - CONTENT_Y - 0.1
        _add_ai_and_memo_footer(slide_ai, ai_data, memos, ai_y, ai_h)
        _add_slide_footer(slide_ai, ctx)


# ─── 11. 被リンク元 ──────────────────────────────────────


def _create_referrals_slide(
    prs: Presentation, ctx: _Ctx,
    referrals_sheet: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not referrals_sheet or not referrals_sheet.get("rows"):
        return
    rows = referrals_sheet["rows"]
    sorted_rows = sorted(rows, key=lambda r: -fmt_num(r.get("sessions")))

    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.WHITE)
    _add_slide_title(slide, ctx, "被リンク元")

    has_ai = bool(ai_data and ai_data.get("summary"))
    layout = calc_layout(min(len(sorted_rows), 10), has_ai)

    top7 = sorted_rows[:7]
    others = sorted_rows[7:]
    pie_labels = [r.get("source", "") for r in top7]
    pie_values = [fmt_num(r.get("sessions")) for r in top7]
    others_total = sum(fmt_num(r.get("sessions")) for r in others)
    if others_total > 0:
        pie_labels.append("その他")
        pie_values.append(others_total)

    cd = CategoryChartData()
    cd.categories = pie_labels
    cd.add_series("セッション", pie_values)
    chart = slide.shapes.add_chart(
        XL_CHART_TYPE.PIE,
        Inches(2.7), Inches(layout["chart_y"]),
        Inches(5.5), Inches(layout["chart_h"]),
        cd,
    ).chart
    _apply_pie_chart_style(chart, CHART_PALETTE_HEX)

    headers = [
        {"label": "参照元", "align": "left"},
        {"label": "セッション", "align": "right"},
        {"label": "ユーザー", "align": "right"},
        {"label": "CV", "align": "right"},
        {"label": "エンゲ率", "align": "right"},
    ]
    rows_out = [
        [
            r.get("source", ""),
            format_number(r.get("sessions")),
            format_number(r.get("users")),
            format_number(r.get("conversions")),
            fmt_pct(r.get("engagementRate")),
        ]
        for r in sorted_rows[:10]
    ]
    _build_table(
        slide, headers, rows_out, [3.0, 2.0, 1.8, 1.6, 1.7],
        x=MARGIN_X, y=layout["table_y"], h=layout["table_h"],
    )
    _add_ai_and_memo_footer(slide, ai_data, memos, layout["ai_y"], layout["ai_h"])
    _add_slide_footer(slide, ctx)


# ─── 12. ページ別 Top 10 ─────────────────────────────────


def _create_pages_slide(
    prs: Presentation, ctx: _Ctx,
    pages_sheet: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not pages_sheet or not pages_sheet.get("rows"):
        return
    sorted_rows = sorted(pages_sheet["rows"], key=lambda r: -fmt_num(r.get("pageViews")))
    top10 = sorted_rows[:10]

    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.WHITE)
    _add_slide_title(slide, ctx, "ページ別 Top 10")

    has_ai = bool(ai_data and ai_data.get("summary"))
    layout = calc_layout(10, has_ai)

    labels = [(r.get("path") or "")[:30] for r in top10]
    cd = CategoryChartData()
    cd.categories = labels
    cd.add_series("PV", [fmt_num(r.get("pageViews")) for r in top10])
    cd.add_series("セッション", [fmt_num(r.get("sessions")) for r in top10])
    chart = slide.shapes.add_chart(
        XL_CHART_TYPE.COLUMN_CLUSTERED,
        Inches(MARGIN_X), Inches(layout["chart_y"]),
        Inches(CONTENT_W), Inches(layout["chart_h"]),
        cd,
    ).chart
    _apply_column_chart_style(chart, ["3b82f6", "10b981"], cat_font=8, rotation=45)

    headers = [
        {"label": "#", "align": "center"},
        {"label": "ページパス", "align": "left"},
        {"label": "PV", "align": "right"},
        {"label": "セッション", "align": "right"},
        {"label": "エンゲ率", "align": "right"},
    ]
    rows_out = [
        [
            i + 1,
            (r.get("path") or "")[:50],
            format_number(r.get("pageViews")),
            format_number(r.get("sessions")),
            fmt_pct(r.get("engagementRate")),
        ]
        for i, r in enumerate(top10)
    ]
    _build_table(
        slide, headers, rows_out, [0.6, 4.8, 1.6, 1.6, 1.5],
        x=MARGIN_X, y=layout["table_y"], h=layout["table_h"],
    )
    _add_ai_and_memo_footer(slide, ai_data, memos, layout["ai_y"], layout["ai_h"])
    _add_slide_footer(slide, ctx)


# ─── 13. ページ分類別 ───────────────────────────────────


def _create_page_categories_slide(
    prs: Presentation, ctx: _Ctx,
    page_categories_sheet: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not page_categories_sheet or not page_categories_sheet.get("rows"):
        return
    rows = sorted(page_categories_sheet["rows"], key=lambda r: -fmt_num(r.get("pageViews")))

    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.WHITE)
    _add_slide_title(slide, ctx, "ページ分類別")

    has_ai = bool(ai_data and ai_data.get("summary"))
    layout = calc_layout(min(len(rows), 10), has_ai)

    top8 = rows[:8]
    others_total = sum(fmt_num(c.get("pageViews")) for c in rows[8:])
    pie_labels = [c.get("category", "") for c in top8]
    pie_values = [fmt_num(c.get("pageViews")) for c in top8]
    if others_total > 0:
        pie_labels.append("その他")
        pie_values.append(others_total)

    cd = CategoryChartData()
    cd.categories = pie_labels
    cd.add_series("PV", pie_values)
    chart = slide.shapes.add_chart(
        XL_CHART_TYPE.PIE,
        Inches(2.7), Inches(layout["chart_y"]),
        Inches(5.5), Inches(layout["chart_h"]),
        cd,
    ).chart
    _apply_pie_chart_style(chart, CHART_PALETTE_HEX)

    headers = [
        {"label": "カテゴリ", "align": "left"},
        {"label": "PV", "align": "right"},
        {"label": "ユーザー", "align": "right"},
        {"label": "エンゲ率", "align": "right"},
    ]
    rows_out = [
        [
            r.get("category", ""),
            format_number(r.get("pageViews")),
            format_number(r.get("users")),
            fmt_pct(r.get("engagementRate")),
        ]
        for r in rows[:10]
    ]
    _build_table(
        slide, headers, rows_out, [3.5, 2.5, 2.2, 1.9],
        x=MARGIN_X, y=layout["table_y"], h=layout["table_h"],
    )
    _add_ai_and_memo_footer(slide, ai_data, memos, layout["ai_y"], layout["ai_h"])
    _add_slide_footer(slide, ctx)


# ─── 14. ランディングページ ─────────────────────────────


def _create_landing_pages_slide(
    prs: Presentation, ctx: _Ctx,
    landing_sheet: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not landing_sheet or not landing_sheet.get("rows"):
        return
    sorted_rows = sorted(landing_sheet["rows"], key=lambda r: -fmt_num(r.get("sessions")))
    top10 = sorted_rows[:10]

    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.WHITE)
    _add_slide_title(slide, ctx, "ランディングページ Top 10")

    has_ai = bool(ai_data and ai_data.get("summary"))
    layout = calc_layout(10, has_ai)

    labels = [(r.get("path") or "")[:30] for r in top10]
    cd = CategoryChartData()
    cd.categories = labels
    cd.add_series("セッション", [fmt_num(r.get("sessions")) for r in top10])
    cd.add_series("CV", [fmt_num(r.get("conversions")) for r in top10])
    chart = slide.shapes.add_chart(
        XL_CHART_TYPE.COLUMN_CLUSTERED,
        Inches(MARGIN_X), Inches(layout["chart_y"]),
        Inches(CONTENT_W), Inches(layout["chart_h"]),
        cd,
    ).chart
    _apply_column_chart_style(chart, ["3b82f6", "ef4444"], cat_font=8, rotation=45)

    headers = [
        {"label": "#", "align": "center"},
        {"label": "ランディングページ", "align": "left"},
        {"label": "セッション", "align": "right"},
        {"label": "CV", "align": "right"},
        {"label": "エンゲ率", "align": "right"},
    ]
    rows_out = [
        [
            i + 1,
            (r.get("path") or "")[:50],
            format_number(r.get("sessions")),
            format_number(r.get("conversions")),
            fmt_pct(r.get("engagementRate")),
        ]
        for i, r in enumerate(top10)
    ]
    _build_table(
        slide, headers, rows_out, [0.6, 4.8, 1.6, 1.6, 1.5],
        x=MARGIN_X, y=layout["table_y"], h=layout["table_h"],
    )
    _add_ai_and_memo_footer(slide, ai_data, memos, layout["ai_y"], layout["ai_h"])
    _add_slide_footer(slide, ctx)


# ─── 15. ファイルDL ─────────────────────────────────────


def _create_file_downloads_slide(
    prs: Presentation, ctx: _Ctx,
    sheet: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not sheet or not sheet.get("rows"):
        return
    sorted_rows = sorted(sheet["rows"], key=lambda r: -fmt_num(r.get("downloads")))
    top10 = sorted_rows[:10]

    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.WHITE)
    _add_slide_title(slide, ctx, "ファイルダウンロード")

    has_ai = bool(ai_data and ai_data.get("summary"))
    layout = calc_layout(min(len(top10), 10), has_ai)

    labels = [(r.get("fileName") or "")[:25] for r in top10]
    cd = CategoryChartData()
    cd.categories = labels
    cd.add_series("DL数", [fmt_num(r.get("downloads")) for r in top10])
    cd.add_series("ユーザー", [fmt_num(r.get("users")) for r in top10])
    chart = slide.shapes.add_chart(
        XL_CHART_TYPE.COLUMN_CLUSTERED,
        Inches(MARGIN_X), Inches(layout["chart_y"]),
        Inches(CONTENT_W), Inches(layout["chart_h"]),
        cd,
    ).chart
    _apply_column_chart_style(chart, ["3b82f6", "10b981"], cat_font=8, rotation=45)

    headers = [
        {"label": "#", "align": "center"},
        {"label": "ファイル名", "align": "left"},
        {"label": "DL数", "align": "right"},
        {"label": "ユーザー", "align": "right"},
    ]
    rows_out = [
        [
            i + 1,
            (r.get("fileName") or "")[:60],
            format_number(r.get("downloads")),
            format_number(r.get("users")),
        ]
        for i, r in enumerate(top10)
    ]
    _build_table(
        slide, headers, rows_out, [0.6, 5.8, 1.9, 1.8],
        x=MARGIN_X, y=layout["table_y"], h=layout["table_h"],
    )
    _add_ai_and_memo_footer(slide, ai_data, memos, layout["ai_y"], layout["ai_h"])
    _add_slide_footer(slide, ctx)


# ─── 16. 外部リンク ─────────────────────────────────────


def _create_external_links_slide(
    prs: Presentation, ctx: _Ctx,
    sheet: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not sheet or not sheet.get("rows"):
        return
    sorted_rows = sorted(sheet["rows"], key=lambda r: -fmt_num(r.get("clicks")))
    top10 = sorted_rows[:10]

    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.WHITE)
    _add_slide_title(slide, ctx, "外部リンククリック")

    has_ai = bool(ai_data and ai_data.get("summary"))
    layout = calc_table_only_layout(has_ai)

    headers = [
        {"label": "#", "align": "center"},
        {"label": "リンクURL", "align": "left"},
        {"label": "クリック数", "align": "right"},
        {"label": "ユーザー", "align": "right"},
    ]
    rows_out = [
        [
            i + 1,
            (r.get("linkUrl") or "")[:60],
            format_number(r.get("clicks")),
            format_number(r.get("users")),
        ]
        for i, r in enumerate(top10)
    ]
    _build_table(
        slide, headers, rows_out, [0.6, 5.8, 1.9, 1.8],
        x=MARGIN_X, y=layout["table_y"], h=layout["table_h"],
    )
    _add_ai_and_memo_footer(slide, ai_data, memos, layout["ai_y"], layout["ai_h"])
    _add_slide_footer(slide, ctx)


# ─── 17. コンバージョン月次推移 ─────────────────────────


def _create_conversions_slides(
    prs: Presentation, ctx: _Ctx,
    conversions: dict | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not conversions or not conversions.get("data"):
        return
    data_asc = sorted(
        conversions["data"],
        key=lambda d: str(d.get("yearMonth") or d.get("month") or ""),
    )
    data_desc = list(reversed(data_asc))

    # CV イベント名（yearMonth / month / total / label 以外のキー）
    excluded = {"yearMonth", "month", "total", "label"}
    event_names: list[str] = []
    for d in data_asc:
        for k in d.keys():
            if k not in excluded and k not in event_names:
                event_names.append(k)

    # ─── チャート ───
    slide1 = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide1, Color.WHITE)
    _add_slide_title(slide1, ctx, "コンバージョン月次推移")

    labels = [fmt_year_month(d.get("yearMonth") or d.get("month")) for d in data_asc]
    cd = CategoryChartData()
    cd.categories = labels
    colors = ["3b82f6", "10b981", "f59e0b", "ef4444", "8b5cf6", "ec4899", "06b6d4"]
    for ev in event_names:
        cd.add_series(ev, [fmt_num(d.get(ev)) for d in data_asc])
    if event_names:
        chart_h = FOOTER_Y - CONTENT_Y - 0.6
        chart = slide1.shapes.add_chart(
            XL_CHART_TYPE.LINE,
            Inches(MARGIN_X), Inches(CONTENT_Y),
            Inches(CONTENT_W), Inches(chart_h),
            cd,
        ).chart
        _apply_line_chart_style(chart, colors)
        # プロット領域の高さを 72% に抑えて、チャート下端と凡例の間に余白を確保
        _set_plot_area_layout(chart, x=0.08, y=0.05, w=0.88, h=0.72)
    _add_slide_footer(slide1, ctx)

    # ─── テーブル ───
    slide2 = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide2, Color.WHITE)
    _add_slide_title(slide2, ctx, "コンバージョン月次推移 データ")

    has_ai = bool(ai_data and ai_data.get("summary"))
    layout = calc_table_only_layout(has_ai)

    headers = [{"label": "月", "align": "center"}]
    headers.extend({"label": ev, "align": "right"} for ev in event_names)
    headers.append({"label": "合計", "align": "right"})

    cols_n = len(headers)
    base_w = max((CONTENT_W - 3.0) / max(len(event_names) + 1, 1), 1.0)
    widths = [1.5] + [base_w] * len(event_names) + [1.5]
    scale = CONTENT_W / sum(widths)
    widths = [w * scale for w in widths]

    rows_out = []
    for d in data_desc:
        row = [fmt_year_month(d.get("yearMonth") or d.get("month"))]
        total = 0.0
        for ev in event_names:
            v = fmt_num(d.get(ev))
            total += v
            row.append(format_number(v))
        row.append(format_number(total))
        rows_out.append(row)

    _build_table(
        slide2, headers, rows_out, widths,
        x=MARGIN_X, y=layout["table_y"], h=layout["table_h"],
        font_size=get_table_font_size(len(rows_out)),
    )
    _add_ai_and_memo_footer(slide2, ai_data, memos, layout["ai_y"], layout["ai_h"])
    _add_slide_footer(slide2, ctx)


# ─── 18. 逆算フロー ─────────────────────────────────────


def _create_reverse_flow_slide(
    prs: Presentation, ctx: _Ctx,
    reverse_flows: list | None,
    ai_data: dict | None,
    memos: list | None,
) -> None:
    if not reverse_flows:
        return

    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.WHITE)
    _add_slide_title(slide, ctx, "逆算フロー")

    has_ai = bool(ai_data and ai_data.get("summary"))
    layout = calc_table_only_layout(has_ai)

    headers = [
        {"label": "フロー名", "align": "left"},
        {"label": "全PV", "align": "right"},
        {"label": "遷移率①", "align": "right"},
        {"label": "フォームPV", "align": "right"},
        {"label": "遷移率②", "align": "right"},
        {"label": "送信完了", "align": "right"},
        {"label": "全体CVR", "align": "right"},
    ]
    rows_out = []
    for flow in reverse_flows:
        s = flow.get("summary") or {}
        total_pv = fmt_num(s.get("totalSiteViews"))
        form_pv = fmt_num(s.get("formPageViews"))
        complete = fmt_num(s.get("submissionComplete"))
        rate1 = f"{(form_pv / total_pv * 100):.2f}%" if total_pv > 0 else "-"
        rate2 = f"{(complete / form_pv * 100):.2f}%" if form_pv > 0 else "-"
        cvr = f"{(complete / total_pv * 100):.2f}%" if total_pv > 0 else "-"
        rows_out.append([
            flow.get("flowName") or "",
            format_number(total_pv),
            rate1,
            format_number(form_pv),
            rate2,
            format_number(complete),
            cvr,
        ])
    # テーブルは行数に応じた高さで、その直下に AI 分析を配置
    tbl_h = 0.4 * (len(rows_out) + 1)
    _build_table(
        slide, headers, rows_out, [2.5, 1.3, 1.2, 1.3, 1.2, 1.3, 1.3],
        x=MARGIN_X, y=layout["table_y"], h=tbl_h,
    )
    # AI 分析はテーブルの直下（固定オフセット 0.3"）に配置。フッターまでの残りを活用
    ai_y = layout["table_y"] + tbl_h + 0.3
    ai_h = max(FOOTER_Y - ai_y - 0.1, AI_MIN_H)
    _add_ai_and_memo_footer(slide, ai_data, memos, ai_y, ai_h)
    _add_slide_footer(slide, ctx)


# ─── 19. Appendix 用語集 ────────────────────────────────


APPENDIX_TERMS = [
    ("セッション", "ユーザーがサイトを訪問した回数。30分以上操作がない場合、新しいセッションとしてカウント"),
    ("ユーザー", "サイトを訪問したユニークユーザー数"),
    ("新規ユーザー", "選択期間中に初めてサイトを訪問したユーザー数"),
    ("ページビュー（表示回数）", "ページが表示された回数の合計"),
    ("エンゲージメント率", "エンゲージメントのあったセッションの割合（10秒以上滞在、2PV以上、CVイベント発生のいずれか）"),
    ("平均エンゲージメント時間", "ユーザーがサイトに積極的に関与していた平均時間"),
    ("コンバージョン（キーイベント）", "設定した目標アクション（お問い合わせ、資料DL等）の完了数"),
    ("コンバージョン率（CVR）", "セッションのうちコンバージョンに至った割合"),
    ("ランディングページ", "ユーザーが最初に閲覧したページ"),
    ("クリック数（GSC）", "Google検索結果でサイトがクリックされた回数"),
    ("表示回数（GSC）", "Google検索結果にサイトが表示された回数"),
    ("CTR（GSC）", "表示回数に対するクリック数の割合"),
    ("平均掲載順位（GSC）", "Google検索結果での平均表示順位"),
]


def _create_appendix_slide(prs: Presentation, ctx: _Ctx) -> None:
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _fill_slide_bg(slide, Color.WHITE)
    _add_slide_title(slide, ctx, "指標・用語の説明")

    table_y = CONTENT_Y
    table_h = FOOTER_Y - table_y - 0.15

    headers = [
        {"label": "指標名", "align": "left"},
        {"label": "説明", "align": "left"},
    ]
    rows_out = [[term, desc] for term, desc in APPENDIX_TERMS]
    _build_table(
        slide, headers, rows_out, [3.0, 7.1],
        x=MARGIN_X, y=table_y, h=table_h,
        font_size=9,
    )
    _add_slide_footer(slide, ctx)
