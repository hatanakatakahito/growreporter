"""
ユーザー属性シート: 新規/リピーター, 性別, 年齢層, デバイス, 国/地域/市区町村
JS 側の createUsersSheet 相当。
"""

from shared.metrics import short_label_of

from ..helpers import append_ai_and_memo_sections, safe_sheet_name
from ..sheet_builder import write_sheet_title_bar
from ..styles import FOOTER_TEXT


def create_users_sheet(workbook, demographics: dict, ai_data: dict | None, memos: list | None, formats: dict, sheet_subtitle: str | None = None):
    """ユーザー属性シートを作成。"""
    ws = workbook.add_worksheet(safe_sheet_name("ユーザー属性"))
    ws.hide_gridlines(2)
    ws.set_footer(FOOTER_TEXT)

    ws.set_column(0, 0, 20)
    ws.set_column(1, 1, 16)
    ws.set_column(2, 2, 14)

    # シートタイトルバー (行 0-2)
    row = write_sheet_title_bar(ws, "ユーザー属性", sheet_subtitle, 3, formats)

    data = demographics.get("data") or demographics or {}

    sections = [
        ("新規/リピーター", data.get("newReturning")),
        ("性別", data.get("gender")),
        ("年齢層", data.get("age")),
        ("デバイス", data.get("device")),
        ("国", (data.get("location") or {}).get("country") if isinstance(data.get("location"), dict) else None),
        ("地域", (data.get("location") or {}).get("region") if isinstance(data.get("location"), dict) else None),
        ("市区町村", (data.get("location") or {}).get("city") if isinstance(data.get("location"), dict) else None),
    ]

    first_section = True
    for title, items in sections:
        if not items or len(items) == 0:
            continue
        if not first_section:
            row += 1  # セクション間空白
        first_section = False

        # ■ セクション帯
        ws.set_row(row, 24)
        ws.merge_range(row, 0, row, 2, f"■ {title}", formats["section_marker"])
        row += 1

        # ヘッダー
        ws.set_row(row, 24)
        ws.write(row, 0, "項目", formats["header"])
        ws.write(row, 1, short_label_of("totalUsers"), formats["header"])
        ws.write(row, 2, "割合", formats["header"])
        row += 1

        # データ（ゼブラ）
        for idx, item in enumerate(items):
            is_alt = (idx % 2 == 1)
            data_fmt = formats["data_alt"] if is_alt else formats["data"]
            num_fmt = formats["number_alt"] if is_alt else formats["number"]
            txt_fmt = formats["text_right_alt"] if is_alt else formats["text_right"]

            ws.set_row(row, 22)
            ws.write(row, 0, item.get("name") or "", data_fmt)
            value = item.get("value") or 0
            try:
                ws.write_number(row, 1, float(value), num_fmt)
            except (ValueError, TypeError):
                ws.write(row, 1, 0, num_fmt)

            percentage = item.get("percentage")
            if percentage is not None:
                try:
                    ws.write(row, 2, f"{float(percentage):.1f}%", txt_fmt)
                except (ValueError, TypeError):
                    ws.write(row, 2, "-", txt_fmt)
            else:
                ws.write(row, 2, "-", txt_fmt)
            row += 1

    # AI + メモ
    append_ai_and_memo_sections(
        ws,
        workbook,
        row,
        3,
        ai_data,
        memos,
        formats["ai_header"],
        formats["ai_content"],
        formats["memo_header"],
        formats["memo_content"],
        ai_placeholder_fmt=formats.get("ai_placeholder"),
    )

    return ws
