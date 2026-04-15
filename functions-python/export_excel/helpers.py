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


def compute_totals_row(headers: list[str], rows: list[list[Any]]) -> dict:
    """
    JS の computeTotalsRow と同じロジック。
    戻り値: {values: [...], kind: [...]} で各列の値と種別を返す。
    kind: 'label' | 'number' | 'text' | 'empty'
    """
    num_cols = len(headers)
    values: list[Any] = [""] * num_cols
    kinds: list[str] = ["empty"] * num_cols

    # 1 列目: ラベル
    values[0] = "合計 / 平均"
    kinds[0] = "label"

    if not rows:
        return {"values": values, "kinds": kinds}

    for c in range(1, num_cols):
        header = str(headers[c])
        # 変化率列はスキップ
        if "変化率" in header:
            continue

        col_vals = [r[c] for r in rows if r[c] not in (None, "", "-")]
        if not col_vals:
            continue

        # すべて数値 → 合計
        if all(isinstance(v, (int, float)) for v in col_vals):
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
            values[c] = sum(nums_mixed)
            kinds[c] = "number"

    return {"values": values, "kinds": kinds}


# ─── 行の高さ計算 ────────────────────────────────────────────


def calc_row_height(row_values: list[Any], col_widths: list[int]) -> float:
    """各セルのテキスト長から必要な行高さを推定。"""
    max_lines = 1
    for idx, v in enumerate(row_values):
        if v is None or v == "":
            continue
        s = str(v).replace("\r\n", "\n").replace("\r", "\n")
        wch = col_widths[idx] if idx < len(col_widths) else 10
        chars_per_line = max(8, wch * 0.5)
        lines = 0
        for seg in s.split("\n"):
            lines += max(1, math.ceil(len(seg) / chars_per_line))
        max_lines = max(max_lines, lines)
    return min(MAX_ROW_HEIGHT_PT, max(MIN_ROW_HEIGHT_PT, math.ceil(max_lines * LINE_HEIGHT_PT * 1.05)))


# ─── AI 分析 & メモセクション追記 ──────────────────────────


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
) -> int:
    """
    AI 分析 + メモセクションをワークシートに追記。
    戻り値: 追記後の次の行番号。
    """
    row = start_row

    # AI 分析セクション
    if ai_data and ai_data.get("summary"):
        row += 2  # 空白行

        # ヘッダー
        ws.set_row(row, 26)
        if num_cols > 1:
            ws.merge_range(row, 0, row, num_cols - 1, "■ AI分析", ai_header_fmt)
        else:
            ws.write(row, 0, "■ AI分析", ai_header_fmt)
        row += 1

        # 本文 (Markdown 記号を除去)
        clean_text = _strip_markdown(ai_data.get("summary", ""))
        lines = clean_text.split("\n")
        line_count = max(1, len(lines))
        height = min(MAX_ROW_HEIGHT_PT, max(MIN_ROW_HEIGHT_PT, line_count * LINE_HEIGHT_PT * 1.05))
        ws.set_row(row, height)
        if num_cols > 1:
            ws.merge_range(row, 0, row, num_cols - 1, clean_text, ai_content_fmt)
        else:
            ws.write(row, 0, clean_text, ai_content_fmt)
        row += 1

    # メモセクション
    if memos and len(memos) > 0:
        row += 2

        ws.set_row(row, 26)
        if num_cols > 1:
            ws.merge_range(row, 0, row, num_cols - 1, "■ メモ", memo_header_fmt)
        else:
            ws.write(row, 0, "■ メモ", memo_header_fmt)
        row += 1

        for memo in memos:
            memo_text = _format_memo_text(memo)
            lines = memo_text.split("\n")
            line_count = max(1, len(lines))
            height = min(MAX_ROW_HEIGHT_PT, max(MIN_ROW_HEIGHT_PT, line_count * LINE_HEIGHT_PT * 1.05))
            ws.set_row(row, height)
            if num_cols > 1:
                ws.merge_range(row, 0, row, num_cols - 1, memo_text, memo_content_fmt)
            else:
                ws.write(row, 0, memo_text, memo_content_fmt)
            row += 1

    return row


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
