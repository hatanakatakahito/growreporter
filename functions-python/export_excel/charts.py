"""
xlsxwriter ネイティブチャート生成

各動的シートに適切なチャートを挿入する。
チャートは編集可能なネイティブ Excel チャートとして書き込まれるため、
Excel 上で軸変更・データ更新・コピペが可能。
"""

from typing import Any

from shared.metrics import short_label_of


# GrowReporter ブランドカラー (v5.11.1 ネイビー基調)
CHART_COLORS = [
    "#2347A0",  # primary navy
    "#3D68CC",  # mid blue
    "#13C296",  # green
    "#F59E0B",  # amber
    "#EF4444",  # red
    "#8B5CF6",  # violet
    "#06B6D4",  # cyan
    "#F97316",  # orange
    "#EC4899",  # pink
    "#14B8A6",  # teal
    "#84CC16",  # lime
    "#A855F7",  # purple
]


# シートキー → チャート設定のマッピング
# type:          折れ線 / 棒 / 円 / 横棒 / 二軸
# cat_key:       カテゴリ軸のキー (rows の各要素から取る)
# series:        [(label, key), ...] 系列
# top_n:         上位 N 行に絞る (省略なら全行)
# x_offset_col:  挿入列 (データ表の右にずらす)
CHART_CONFIGS: dict[str, dict[str, Any]] = {
    "monthly": {
        "type": "line",
        "title": "月別推移",
        "cat_key": "label",
        "series": [
            (short_label_of("sessions"), "sessions"),
            (short_label_of("users"), "users"),
            (short_label_of("pageViews"), "pageViews"),
            (short_label_of("conversions"), "conversions"),
        ],
        "data_labels": True,
        "markers": True,
    },
    "daily": {
        "type": "line",
        "title": "日別推移",
        "cat_key": "date",
        "series": [
            (short_label_of("sessions"), "sessions"),
        ],
        "wide": True,
        # 日別はデータ点数が多いためラベルなし
    },
    "weekly": {
        "type": "column",
        "title": "曜日別",
        "cat_key": "dayName",
        "series": [
            (short_label_of("sessions"), "sessions"),
            (short_label_of("conversions"), "conversions"),
        ],
        "data_labels": True,
    },
    "hourly": {
        "type": "column",
        "title": "時間帯別",
        "cat_key": "hour",
        "series": [
            (short_label_of("sessions"), "sessions"),
            (short_label_of("conversions"), "conversions"),
        ],
        "data_labels": True,
    },
    "channels": {
        "type": "bar",
        "title": "集客チャネル別",
        "cat_key": "channelName",
        "series": [
            (short_label_of("sessions"), "sessions"),
            (short_label_of("conversions"), "conversions"),
        ],
        "data_labels": True,
    },
    "keywords": {
        "type": "bar",
        "title": "Top 20 流入キーワード",
        "cat_key": "keyword",
        "series": [(short_label_of("clicks"), "clicks")],
        "top_n": 20,
        "data_labels": True,
    },
    "referrals": {
        "type": "bar",
        "title": "Top 20 被リンク元",
        "cat_key": "source",
        "series": [
            (short_label_of("sessions"), "sessions"),
            (short_label_of("conversions"), "conversions"),
        ],
        "top_n": 20,
        "data_labels": True,
    },
    "pages": {
        "type": "bar",
        "title": "Top 20 ページ別 PV",
        "cat_key": "path",
        "series": [(short_label_of("pageViews"), "pageViews")],
        "top_n": 20,
        "data_labels": True,
    },
    "pageCategories": {
        "type": "pie",
        "title": "カテゴリ別 PV 構成",
        "cat_key": "category",
        "series": [(short_label_of("pageViews"), "pageViews")],
        "top_n": 10,
        "data_labels": True,
    },
    "landingPages": {
        "type": "bar",
        "title": "Top 20 ランディングページ",
        "cat_key": "path",
        "series": [(short_label_of("sessions"), "sessions")],
        "top_n": 20,
        "data_labels": True,
    },
    "fileDownloads": {
        "type": "bar",
        "title": "Top 20 ファイル DL",
        "cat_key": "fileName",
        "series": [("ダウンロード", "downloads")],  # 非指標はリテラルのまま
        "top_n": 20,
        "data_labels": True,
    },
    "externalLinks": {
        "type": "bar",
        "title": "Top 20 外部リンク",
        "cat_key": "linkUrl",
        "series": [(short_label_of("clicks"), "clicks")],
        "top_n": 20,
        "data_labels": True,
    },
}


def insert_chart_for_sheet(
    workbook,
    ws,
    sheet_key: str,
    visible_columns: list[dict],
    rows: list[dict],
    data_start_row: int = 1,  # ヘッダー行の次 (0-indexed)
):
    """
    指定シートキーの設定に従ってネイティブチャートを挿入。

    args:
      workbook:     xlsxwriter Workbook
      ws:           対象の Worksheet
      sheet_key:    DYNAMIC_SHEETS の key (monthly / daily / ...)
      visible_columns: そのシートの可視列定義 (build_dynamic_sheet 時と同じもの)
      rows:         画面と同じキー付け済の行データ
      data_start_row: 1 (ヘッダー行の次の行インデックス 0-based)
    """
    config = CHART_CONFIGS.get(sheet_key)
    if not config or not rows:
        return

    chart_type = config["type"]
    title = config["title"]
    cat_key = config["cat_key"]
    series_def = config["series"]
    top_n = config.get("top_n")

    # 実際に visible_columns に含まれているかチェック
    # (ユーザーが非表示にした列はスキップ)
    visible_keys = {c["key"] for c in visible_columns}
    filtered_series = [(label, key) for label, key in series_def if key in visible_keys]
    if not filtered_series:
        return

    # Top N 絞り込み (最初の系列の降順で並び替えを想定)
    used_rows = rows[:top_n] if top_n else rows

    if not used_rows:
        return

    # xlsxwriter のチャートは「セル範囲参照」で動作するため、
    # 使用するカテゴリ列・値列がデータ表のどの列にあるかを特定する必要がある。
    # build_dynamic_sheet は visible_columns の順でヘッダーを書くので
    # 列インデックスを再計算する。
    col_index_map = _build_column_index_map(visible_columns)

    cat_col = col_index_map.get(cat_key)
    if cat_col is None:
        return

    data_end_row = data_start_row + len(used_rows) - 1
    sheet_name = ws.name

    # チャートタイプに応じて xlsxwriter のオプションを決定
    if chart_type == "line":
        chart = workbook.add_chart({"type": "line"})
    elif chart_type == "column":
        chart = workbook.add_chart({"type": "column"})
    elif chart_type == "bar":
        chart = workbook.add_chart({"type": "bar"})
    elif chart_type == "pie":
        chart = workbook.add_chart({"type": "pie"})
    else:
        chart = workbook.add_chart({"type": "column"})

    # オプション
    use_data_labels = config.get("data_labels", False)
    use_markers = config.get("markers", False)
    use_dash = config.get("dash", False)

    # 系列を追加
    for series_idx, (label, key) in enumerate(filtered_series):
        val_col = col_index_map.get(key)
        if val_col is None:
            continue
        color = CHART_COLORS[series_idx % len(CHART_COLORS)]
        series_opts = {
            "name": label,
            "categories": [sheet_name, data_start_row, cat_col, data_end_row, cat_col],
            "values": [sheet_name, data_start_row, val_col, data_end_row, val_col],
            "fill": {"color": color},
            "line": {"color": color},
            "border": {"color": color},
        }
        if use_data_labels:
            series_opts["data_labels"] = {"value": True, "num_format": "#,##0", "font": {"name": "Yu Gothic", "size": 8}}
        if use_markers:
            series_opts["marker"] = {"type": "circle", "size": 5, "fill": {"color": color}, "border": {"color": color}}
        # 円グラフ: ポイント個別色 + パーセンテージのみ表示
        if chart_type == "pie":
            series_opts["points"] = [{"fill": {"color": CHART_COLORS[i % len(CHART_COLORS)]}} for i in range(len(used_rows))]
            series_opts["data_labels"] = {
                "value": False,
                "percentage": True,
                "category": False,
                "position": "outside_end",
                "font": {"name": "Yu Gothic", "size": 9, "bold": True},
                "num_format": "0.0%",
            }
            # fill/line/border は円グラフでは系列レベルではなくポイントで設定済み
            del series_opts["fill"]
            del series_opts["line"]
            del series_opts["border"]
        chart.add_series(series_opts)

    chart.set_title({"name": title, "name_font": {"name": "Yu Gothic", "bold": True, "size": 12}})
    chart.set_style(2)  # フラットスタイル（立体・シャドウなし）
    chart.set_plotarea({"border": {"none": True}, "shadow": False, "fill": {"none": True}})
    chart.set_chartarea({"border": {"none": True}, "shadow": False, "fill": {"none": True}})

    axis_font = {"name": "Yu Gothic", "size": 9}
    chart.set_x_axis({"num_font": axis_font, "name_font": axis_font})
    chart.set_y_axis({"num_font": axis_font, "name_font": axis_font})

    if chart_type == "bar":
        chart.set_y_axis({"reverse": True, "num_font": axis_font, "name_font": axis_font})
        chart.set_legend({"position": "bottom", "font": {"name": "Yu Gothic", "bold": False, "size": 9}})
    elif chart_type == "pie":
        chart.set_legend({"position": "right", "font": {"name": "Yu Gothic", "bold": False, "size": 9}})
    else:
        chart.set_legend({"position": "bottom", "font": {"name": "Yu Gothic", "bold": False, "size": 9}})

    # チャートサイズ
    is_wide = config.get("wide", False)
    if chart_type == "bar":
        chart.set_size({"width": 720, "height": 600})
    elif chart_type == "pie":
        chart.set_size({"width": 560, "height": 420})
    elif is_wide:
        chart.set_size({"width": 900, "height": 400})
    else:
        chart.set_size({"width": 640, "height": 400})

    # チャートをデータ表の右側に配置 (タイトルバーの下から)
    chart_insert_row = max(0, data_start_row - 1)  # ヘッダ行の位置から
    chart_insert_col = len(_expand_header_columns(visible_columns)) + 2  # データ表の右横 + 2 列余白

    ws.insert_chart(chart_insert_row, chart_insert_col, chart)


def _build_column_index_map(visible_columns: list[dict]) -> dict[str, int]:
    """
    visible_columns から key → 列インデックス のマップを生成。
    注: build_dynamic_sheet は比較モード時に "前期" "変化率" 列を挟むので、
    ここではチャートは比較モードを考慮せず「current」列のみを参照する。
    (比較ありシートは current 列だけが key-indexed で、prev/delta 列は無名)
    """
    index_map: dict[str, int] = {}
    col_idx = 0
    for col in visible_columns:
        index_map[col["key"]] = col_idx
        col_idx += 1
        # 比較ありなら前期+変化率で 2 列進む想定だが、
        # 現状は「比較モード時にチャート挿入しない」方針で簡略化
        # TODO: 比較対応時は index_map を別途構築
    return index_map


def _expand_header_columns(visible_columns: list[dict]) -> list[str]:
    """比較モード展開込みのヘッダー数を返す (チャート配置位置計算用)。"""
    result = []
    for col in visible_columns:
        result.append(col["label"])
    return result
