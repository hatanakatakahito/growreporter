"""
xlsxwriter 用のヘルパー関数群。
JS 側の fmt*, calcRowHeight, appendAIAndMemoSections, computeTotalsRow に対応。
"""

import math
import re
from datetime import datetime
from typing import Any

from .styles import (
    AI_CONTENT_STYLE,
    AI_SECTION_STYLE,
    DATA_CELL_STYLE,
    DECIMAL_CELL_STYLE,
    MAX_ROW_HEIGHT_PT,
    MEMO_SECTION_STYLE,
    MIN_ROW_HEIGHT_PT,
    LINE_HEIGHT_PT,
    NUMBER_CELL_STYLE,
    PERCENT_CELL_STYLE,
    TEXT_RIGHT_STYLE,
    TOTAL_LABEL_STYLE,
    TOTAL_NUMBER_STYLE,
    TOTAL_TEXT_STYLE,
)


# ─── フォーマット変換 ────────────────────────────────────────


def fmt_num(value: Any) -> float:
    """数値への安全変換。"""
    if value is None or value == "":
        return 0
    if isinstance(value, (int, float)):
        return value
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0


def fmt_pct(value: Any) -> str:
    """0-1 の小数を "X.XX%" 文字列に変換。"""
    if value is None:
        return "-"
    try:
        n = float(value)
        return f"{n * 100:.2f}%"
    except (ValueError, TypeError):
        return "-"


def fmt_date(date_str: Any) -> str:
    """YYYYMMDD を YYYY/MM/DD に変換。"""
    if not date_str:
        return ""
    s = str(date_str)
    if len(s) == 8 and s.isdigit():
        return f"{s[:4]}/{s[4:6]}/{s[6:8]}"
    return s


def fmt_year_month(ym: Any) -> str:
    """YYYYMM を YYYY年MM月 に変換。"""
    if not ym:
        return ""
    s = str(ym)
    if len(s) == 6 and s.isdigit():
        return f"{s[:4]}年{s[4:]}月"
    if "-" in s:
        parts = s.split("-")
        if len(parts) == 2:
            return f"{parts[0]}年{parts[1]}月"
    return s


def fmt_duration(seconds: Any) -> str:
    """秒数を m:ss 形式に変換。"""
    try:
        v = float(seconds or 0)
        m = int(v // 60)
        s = int(v % 60)
        return f"{m}:{s:02d}"
    except (ValueError, TypeError):
        return "0:00"


def fmt_change(current: Any, prev: Any) -> str:
    """変化率を +X.X% / -X.X% 文字列で返す。"""
    try:
        c = float(current) if current is not None else None
        p = float(prev) if prev is not None else None
        if c is None or p is None or p == 0:
            return "-"
        change = ((c - p) / p) * 100
        sign = "+" if change > 0 else ""
        return f"{sign}{change:.1f}%"
    except (ValueError, TypeError):
        return "-"


def safe_sheet_name(name: str) -> str:
    """Excel シート名に使えない文字を除去して 31 文字以内に切り詰める。"""
    if not name:
        return "Sheet"
    for ch in ["/", "\\", ":", "*", "?", '"', "[", "]"]:
        name = name.replace(ch, "_")
    return name[:31]


# ─── セル値 & スタイル選択 ──────────────────────────────────


def format_cell_for_export(col: dict, value: Any) -> Any:
    """
    列定義の format に応じて Excel セルに書き込む値を返す。
    画面側の analysisColumns.js と同じロジック。
    """
    if value is None or value == "":
        return "-"

    fmt = col.get("format")

    if fmt in ("number", "decimal"):
        try:
            return float(value) if isinstance(value, str) else value
        except (ValueError, TypeError):
            return "-"

    if fmt == "percent":
        try:
            n = float(value)
            pct = n * 100 if abs(n) <= 1 else n
            return f"{pct:.2f}%"
        except (ValueError, TypeError):
            return "-"

    if fmt == "duration":
        return fmt_duration(value)

    return str(value)


def cell_format_for_column(col: dict, workbook_fmts: dict):
    """列定義の format に応じて適切な xlsxwriter フォーマットを返す。"""
    fmt = col.get("format")
    if fmt == "number":
        return workbook_fmts["number"]
    if fmt == "decimal":
        return workbook_fmts["decimal"]
    if fmt == "percent":
        return workbook_fmts["text_right"]  # "X.XX%" 文字列として渡す
    if fmt == "duration":
        return workbook_fmts["text_right"]
    return workbook_fmts["data"]


# ─── 合計 / 平均行の計算 ─────────────────────────────────────


PCT_RE = re.compile(r"^(-?\d+(?:\.\d+)?)%$")
SEC_RE = re.compile(r"^(\d+(?:\.\d+)?)秒$")


def compute_totals_row(headers: list[str], rows: list[list[Any]], out_cols: list[dict] | None = None) -> dict:
    """
    合計 / 平均行を計算。
    out_cols が渡された場合、列の format に応じて合計 or 平均を使い分ける。
      - number → 合計
      - decimal / percent / duration → 平均
      - 変化率列・delta列 → スキップ
    戻り値: {values: [...], kinds: [...]}
    """
    num_cols = len(headers)
    values: list[Any] = [""] * num_cols
    kinds: list[str] = ["empty"] * num_cols

    values[0] = "合計 / 平均"
    kinds[0] = "label"

    if not rows:
        return {"values": values, "kinds": kinds}

    # 平均を使うべき format (小数系 / 率系 / 時間系)
    AVG_FORMATS = {"decimal", "percent", "duration"}

    for c in range(1, num_cols):
        header = str(headers[c])
        if "変化率" in header:
            continue

        # out_cols から列の type と format を取得
        col_meta = out_cols[c] if out_cols and c < len(out_cols) else None
        if col_meta and col_meta.get("type") == "delta":
            continue

        col_format = col_meta.get("col", {}).get("format") if col_meta else None
        use_avg = col_format in AVG_FORMATS

        col_vals = [r[c] for r in rows if r[c] not in (None, "", "-")]
        if not col_vals:
            continue

        # すべて数値
        if all(isinstance(v, (int, float)) for v in col_vals):
            if use_avg:
                avg = sum(col_vals) / len(col_vals)
                values[c] = round(avg, 2)
            else:
                values[c] = sum(col_vals)
            kinds[c] = "number"
            continue

        # すべてパーセンテージ文字列 → 平均
        if all(isinstance(v, str) and PCT_RE.match(v) for v in col_vals):
            nums = [float(PCT_RE.match(v).group(1)) for v in col_vals]
            avg = sum(nums) / len(nums)
            values[c] = f"{avg:.2f}%"
            kinds[c] = "text"
            continue

        # 数値文字列混在
        nums_mixed = []
        all_num = True
        for v in col_vals:
            if isinstance(v, (int, float)):
                nums_mixed.append(v)
            else:
                try:
                    nums_mixed.append(float(v))
                except (ValueError, TypeError):
                    all_num = False
                    break
        if all_num and nums_mixed:
            if use_avg:
                values[c] = round(sum(nums_mixed) / len(nums_mixed), 2)
            else:
                values[c] = sum(nums_mixed)
            kinds[c] = "number"

    return {"values": values, "kinds": kinds}


# ─── 行の高さ計算 ────────────────────────────────────────────


def _visual_width(s: str) -> int:
    """Excel の digit-width 単位でのテキスト可視幅 (日本語 = 2, ASCII = 1)。"""
    w = 0
    for c in s:
        w += 2 if ord(c) > 0x7F else 1
    return w


def calc_row_height(row_values: list[Any], col_widths: list[int]) -> float:
    """各セルのテキスト長から必要な行高さを推定（日本語の全角幅を考慮）。

    visual_width が col_width 以下なら 1 行扱い（境界ケースの過剰折り返しを避ける）。
    明示的な改行 \\n と、はみ出し量から実際の wrap 行数を算出する。
    """
    max_lines = 1
    for idx, v in enumerate(row_values):
        if v is None or v == "":
            continue
        s = str(v).replace("\r\n", "\n").replace("\r", "\n")
        # 列幅 (digit-width 単位)。xlsxwriter の column width はこの単位に近い
        wch = max(4, col_widths[idx] if idx < len(col_widths) else 10)
        lines = 0
        for seg in s.split("\n"):
            vw = _visual_width(seg)
            # col 幅以下は折り返し無し（Excel は若干余裕を持って収める）
            if vw <= wch:
                lines += 1
            else:
                lines += math.ceil(vw / wch)
        max_lines = max(max_lines, lines)
    if max_lines <= 1:
        return MIN_ROW_HEIGHT_PT
    return min(MAX_ROW_HEIGHT_PT, max(MIN_ROW_HEIGHT_PT, math.ceil(max_lines * LINE_HEIGHT_PT * 1.05)))


# ─── AI 分析 & メモセクション追記 ──────────────────────────


AI_PLACEHOLDER_TEXT = "※ 画面で AI 分析を生成するとここに表示されます"

# AI セクションはセルではなく図形 (text box) として描画 → 列幅に左右されない統一幅
# 幅 18.3 cm (= 18.3 × 37.795 px ≒ 692 px @ 96 DPI)
AI_BOX_WIDTH_PX = 692
AI_BOX_MIN_HEIGHT_PX = 227   # 最小 6.0 cm (短文時の見た目維持)
AI_BOX_MAX_HEIGHT_PX = 1500  # 上限 ≒ 39.7 cm (1 ページに収まる範囲の余裕値)
# 本文 1 行あたりの可視幅: フォント 10pt + 内側マージン考慮で約 60 半角相当
AI_CHARS_PER_LINE = 60
# 1 行の高さ: 10pt × line-spacing 1.4 ≒ 18px
AI_LINE_HEIGHT_PX = 18
AI_BODY_PADDING_PX = 16  # 本文上下の余白合計

AI_TITLE_HEIGHT_PX = 32  # タイトル部 (0.85 cm)


def _estimate_ai_body_height_px(text: str) -> int:
    """AI 本文テキストから必要なボックス高さ (px) を推定。

    日本語 = 全角 2、ASCII = 半角 1 で `_visual_width` を算出し、
    AI_CHARS_PER_LINE で割って行数を求める。明示的な改行も加算。
    """
    if not text:
        return AI_LINE_HEIGHT_PX + AI_BODY_PADDING_PX
    lines = 0
    for seg in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        vw = _visual_width(seg)
        # 空行は 1 行扱い
        lines += max(1, math.ceil(vw / AI_CHARS_PER_LINE))
    return lines * AI_LINE_HEIGHT_PX + AI_BODY_PADDING_PX


def _insert_ai_textbox(ws, row: int, ai_data: dict | None) -> int:
    """AI セクションを Excel テキストボックスとして挿入し、ボックス下端の次の行を返す。

    全シート共通の固定幅 18.3 cm、高さは本文文字数に応じて自動拡張
    (最小 6.0 cm 〜 最大 39.7 cm)。editAs="absolute" で列幅変更の影響なし。
    タイトル「■ AI分析」(紫太字) と本文 (ダーク) は xlsxwriter の rich text 制約により
    別シェイプだが、同じ塗り・枠線・幅で隙間なく繋げて視覚的に 1 ブロックに見せる。
    """
    if ai_data and ai_data.get("summary"):
        body_text = _strip_markdown(ai_data.get("summary", ""))
        is_placeholder = False
    else:
        body_text = AI_PLACEHOLDER_TEXT
        is_placeholder = True

    # 本文長から必要高さを推定し、最小・最大でクランプ
    estimated_body_h = _estimate_ai_body_height_px(body_text)
    min_body_h = AI_BOX_MIN_HEIGHT_PX - AI_TITLE_HEIGHT_PX  # 195 px (旧固定値)
    max_body_h = AI_BOX_MAX_HEIGHT_PX - AI_TITLE_HEIGHT_PX
    body_height_px = max(min_body_h, min(max_body_h, estimated_body_h))
    total_height_px = body_height_px + AI_TITLE_HEIGHT_PX

    # 配色 (プレースホルダは控えめに)
    title_color = "#7C3AED"
    body_color = "#9CA3AF" if is_placeholder else "#1E293B"
    bg_color = "#F9FAFB" if is_placeholder else "#F5F3FF"
    border_color = "#E5E7EB" if is_placeholder else "#DDD6FE"

    common_options = {
        "width": AI_BOX_WIDTH_PX,
        "x_offset": 4,
        "fill": {"color": bg_color},
        "border": {"color": border_color},
        "object_position": 3,  # セルから完全独立 (列幅変更でリサイズされない)
    }

    # 1) タイトルボックス (紫太字)
    title_options = {
        **common_options,
        "height": AI_TITLE_HEIGHT_PX,
        "y_offset": 4,
        "align": {"vertical": "middle", "horizontal": "left"},
        "font": {"name": "Yu Gothic", "size": 11, "bold": True, "color": title_color},
    }
    ws.insert_textbox(row, 0, "  ■ AI分析", title_options)

    # 2) 本文ボックス (タイトルの直下に隙間なく配置)
    body_options = {
        **common_options,
        "height": body_height_px,
        "y_offset": 4 + AI_TITLE_HEIGHT_PX,
        "align": {"vertical": "top", "horizontal": "left"},
        "font": {
            "name": "Yu Gothic",
            "size": 10,
            "color": body_color,
            "italic": is_placeholder,
        },
    }
    ws.insert_textbox(row, 0, body_text, body_options)

    # 次に書き込み可能な行 = ボックス下端より下
    rows_consumed = math.ceil(total_height_px / 20) + 1
    return row + rows_consumed


def append_ai_and_memo_sections(
    ws,
    workbook,
    start_row: int,
    num_cols: int,
    ai_data: dict | None,
    memos: list | None,
    ai_header_fmt,
    ai_content_fmt,
    memo_header_fmt,
    memo_content_fmt,
    ai_placeholder_fmt=None,
) -> int:
    """
    AI 分析 + メモセクションをワークシートに追記。
    AI セクション = Excel テキストボックス (全シート固定幅 800px、高さ自動)
    メモセクション = セル merge (データ表幅または最低 8 列)
    戻り値: 追記後の次の行番号。
    """
    row = start_row

    # AI セクション (テキストボックスで挿入 — 全シート統一幅)
    row += 2  # 空白行
    row = _insert_ai_textbox(ws, row, ai_data)

    # メモセクション (セルで描画 — データ表またはAI 領域の幅に合わせる)
    if memos and len(memos) > 0:
        ai_end_col = max(num_cols - 1, 7)  # 最低 8 列分
        # データ表より右の余白列を補填
        for c in range(num_cols, ai_end_col + 1):
            ws.set_column(c, c, 14)
        ai_cols = ai_end_col + 1

        row += 2

        ws.set_row(row, 26)
        if ai_cols > 1:
            ws.merge_range(row, 0, row, ai_end_col, "■ メモ", memo_header_fmt)
        else:
            ws.write(row, 0, "■ メモ", memo_header_fmt)
        row += 1

        for memo in memos:
            memo_text = _format_memo_text(memo)
            height = _estimate_wrapped_height(memo_text, ai_cols)
            ws.set_row(row, height)
            if ai_cols > 1:
                ws.merge_range(row, 0, row, ai_end_col, memo_text, memo_content_fmt)
            else:
                ws.write(row, 0, memo_text, memo_content_fmt)
            row += 1

    return row


def _estimate_wrapped_height(text: str, num_cols: int) -> float:
    """
    マージセル内のテキストが折り返した時の行数を推定し、適切な行高さを返す。

    num_cols から merge 幅をざっくり推定。1 列 ≒ 18 char width として
    日本語混在テキストが全角 60〜100 字/行で折り返す想定。
    """
    if not text:
        return MIN_ROW_HEIGHT_PT
    # マージ幅 ≒ 列幅 18 char × num_cols（経験値）
    total_char_width = max(60, num_cols * 18)
    # 日本語混在は char_width × 0.7 を 1 行あたり目安文字数として扱う
    chars_per_line = max(50, int(total_char_width * 0.7))

    visual_lines = 0
    for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        visual_lines += max(1, math.ceil(len(line) / chars_per_line))

    return min(MAX_ROW_HEIGHT_PT, max(MIN_ROW_HEIGHT_PT, math.ceil(visual_lines * LINE_HEIGHT_PT * 1.0)))


def _strip_markdown(text: str) -> str:
    """Markdown の #, **, * 等を除去。"""
    if not text:
        return ""
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"__(.+?)__", r"\1", text)
    text = re.sub(r"_(.+?)_", r"\1", text)
    text = re.sub(r"~~(.+?)~~", r"\1", text)
    text = re.sub(r"`(.+?)`", r"\1", text)
    return text.strip()


def _format_memo_text(memo: dict) -> str:
    """メモオブジェクトを 1 セル用テキストに整形。"""
    parts = []

    # 投稿者
    if memo.get("isConsultantNote"):
        name = memo.get("consultantName") or "コンサルタント"
        parts.append(f"【{name}（担当コンサルタント）】")
    else:
        last = memo.get("userLastName") or ""
        first = memo.get("userFirstName") or ""
        display = memo.get("userDisplayName") or ""
        name = f"{last} {first}".strip() or display or "匿名"
        parts.append(f"【{name}】")

    # 日付
    ts = memo.get("updatedAt") or memo.get("createdAt")
    if ts:
        date_str = _format_timestamp(ts)
        if date_str:
            parts[0] += f" {date_str}"

    # 本文
    content = memo.get("content") or ""
    parts.append(content)

    return "\n".join(parts)


def _format_timestamp(ts: Any) -> str:
    """Firestore Timestamp / epoch seconds / ISO 文字列を YYYY/MM/DD HH:MM に変換。"""
    try:
        if isinstance(ts, dict):
            if "seconds" in ts:
                d = datetime.fromtimestamp(ts["seconds"])
            elif "_seconds" in ts:
                d = datetime.fromtimestamp(ts["_seconds"])
            else:
                return ""
        elif isinstance(ts, (int, float)):
            d = datetime.fromtimestamp(ts)
        elif isinstance(ts, str):
            d = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        else:
            return ""
        return d.strftime("%Y/%m/%d %H:%M")
    except (ValueError, TypeError, KeyError):
        return ""
