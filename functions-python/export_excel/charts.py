"""
xlsxwriter ネイティブチャート生成

各動的シートに適切なチャートを挿入する。
チャートは編集可能なネイティブ Excel チャートとして書き込まれるため、
Excel 上で軸変更・データ更新・コピペが可能。
"""

from typing import Any


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
            ("セッション", "sessions"),
            ("ユーザー", "users"),
            ("PV", "pageViews"),
            ("コンバージョン", "conversions"),
        ],
    },
    "daily": {
        "type": "line",
        "title": "日別推移",
        "cat_key": "date",
        "series": [
            ("セッション", "sessions"),
            ("コンバージョン", "conversions"),
        ],
    },
    "weekly": {
        "type": "column",
        "title": "曜日別",
        "cat_key": "dayName",
        "series": [
            ("セッション", "sessions"),
            ("コンバージョン", "conversions"),
        ],
    },
    "hourly": {
        "type": "column",
        "title": "時間帯別",
        "cat_key": "hour",
        "series": [
            ("セッション", "sessions"),
            ("コンバージョン", "conversions"),
        ],
    },
    "channels": {
        "type": "bar",
        "title": "集客チャネル別セッション",
        "cat_key": "channelName",
        "series": [
            ("セッション", "sessions"),
            ("コンバージョン", "conversions"),
        ],
    },
    "keywords": {
        "type": "bar",
        "title": "Top 20 キーワード クリック数",
        "cat_key": "keyword",
        "series": [("クリック", "clicks")],
        "top_n": 20,
    },
    "referrals": {
        "type": "bar",
        "title": "Top 20 参照元セッション",
        "cat_key": "source",
        "series": [
            ("セッション", "sessions"),
            ("コンバージョン", "conversions"),
        ],
        "top_n": 20,
    },
    "pages": {
        "type": "bar",
        "title": "Top 20 ページ別 PV",
        "cat_key": "path",
        "series": [("PV", "pageViews")],
        "top_n": 20,
    },
    "pageCategories": {
        "type": "pie",
        "title": "カテゴリ別 PV 構成",
        "cat_key": "category",
        "series": [("PV", "pageViews")],
    },
    "landingPages": {
        "type": "bar",
        "title": "Top 20 LP 別セッション",
        "cat_key": "path",
        "series": [("セッション", "sessions")],
        "top_n": 20,
    },
    "fileDownloads": {
        "type": "bar",
        "title": "Top 20 ファイル DL 数",
        "cat_key": "fileName",
        "series": [("ダウンロード", "downloads")],
        "top_n": 20,
    },
    "externalLinks": {
        "type": "bar",
        "title": "Top 20 外部リンク クリック",
        "cat_key": "linkUrl",
        "series": [("クリック", "clicks")],
        "top_n": 20,
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

    # 系列を追加
    for label, key in filtered_series:
        val_col = col_index_map.get(key)
        if val_col is None:
            continue
        chart.add_series({
            "name": label,
            "categories": [sheet_name, data_start_row, cat_col, data_end_row, cat_col],
            "values": [sheet_name, data_start_row, val_col, data_end_row, val_col],
        })

    chart.set_title({"name": title})
    chart.set_style(10)

    if chart_type != "pie":
        chart.set_legend({"position": "bottom"})
    else:
        chart.set_legend({"position": "right"})

    # チャートサイズ
    chart.set_size({"width": 640, "height": 400})

    # チャートをデータ表の右側に配置 (列 N 付近)
    # カラム幅を考慮しないで単純に固定位置
    chart_insert_row = 0
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
