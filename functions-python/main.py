"""
Firebase Functions エントリポイント — 分析レポートの Excel / PPTX 生成

対応関数:
  - generate_analysis_excel: Excel レポートを生成して Cloud Storage にアップロード
  - generate_analysis_pptx:   PPTX レポートを生成して Cloud Storage にアップロード

アーキテクチャ:
  - クライアントから allData を JSON で受信
  - xlsxwriter / python-pptx でネイティブチャート付きファイルを生成
  - Cloud Storage `exports/{uid}/{timestamp}_{filename}` にアップロード
  - 有効期限 30 分の signed URL を返却
"""

import base64
import datetime
import io
import traceback
from typing import Any

from firebase_functions import https_fn, options
from firebase_admin import initialize_app

initialize_app()

# リージョンは既存の Node.js 関数と統一
REGION = "asia-northeast1"


@https_fn.on_call(
    region=REGION,
    memory=options.MemoryOption.GB_1,
    timeout_sec=120,
    cors=options.CorsOptions(
        cors_origins=["*"],
        cors_methods=["get", "post"],
    ),
)
def generate_analysis_excel(req: https_fn.CallableRequest) -> dict[str, Any]:
    """分析レポート Excel を生成して signed URL を返す。"""
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="ログインが必要です",
        )

    uid = req.auth.uid
    data = req.data or {}

    try:
        from export_excel.builder import build_excel_workbook

        site_name = data.get("siteName") or "GrowReporter"
        buffer = io.BytesIO()
        build_excel_workbook(buffer, data)
        buffer.seek(0)

        filename = _build_filename(site_name, data.get("dateRange"), ext="xlsx")
        b64 = base64.b64encode(buffer.read()).decode("utf-8")

        return {
            "success": True,
            "base64": b64,
            "fileName": filename,
            "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
    except Exception as e:
        print(f"[generate_analysis_excel] error: {e}")
        print(traceback.format_exc())
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f"Excel 生成に失敗しました: {e}",
        )


@https_fn.on_call(
    region=REGION,
    memory=options.MemoryOption.GB_1,
    timeout_sec=120,
    cors=options.CorsOptions(
        cors_origins=["*"],
        cors_methods=["get", "post"],
    ),
)
def generate_analysis_pptx(req: https_fn.CallableRequest) -> dict[str, Any]:
    """分析レポート PPTX を生成して signed URL を返す。"""
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="ログインが必要です",
        )

    uid = req.auth.uid
    data = req.data or {}

    try:
        from export_pptx.builder import build_pptx_presentation

        site_name = data.get("siteName") or "GrowReporter"
        buffer = io.BytesIO()
        build_pptx_presentation(buffer, data)
        buffer.seek(0)

        filename = _build_filename(site_name, data.get("dateRange"), ext="pptx")
        b64 = base64.b64encode(buffer.read()).decode("utf-8")

        return {
            "success": True,
            "base64": b64,
            "fileName": filename,
            "contentType": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        }
    except Exception as e:
        print(f"[generate_analysis_pptx] error: {e}")
        print(traceback.format_exc())
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f"PPTX 生成に失敗しました: {e}",
        )


# ─── ヘルパー ────────────────────────────────────────────────


def _build_filename(site_name: str, date_range: dict | None, ext: str) -> str:
    """ファイル名を構築。"""
    safe_name = _sanitize(site_name)
    if date_range and date_range.get("from") and date_range.get("to"):
        period = f"{date_range['from']}_{date_range['to']}"
    else:
        period = datetime.datetime.now().strftime("%Y%m%d")
    return f"{safe_name}_分析レポート_{period}.{ext}"


def _sanitize(name: str) -> str:
    """ファイル名用の安全化。"""
    if not name:
        return "report"
    for ch in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']:
        name = name.replace(ch, '_')
    return name.strip() or "report"


