"""Metric label SSoT adapter for Python (Firebase Functions).

Loads the generated JSON copied from /shared/metrics.json by
scripts/sync-metrics.mjs. Provides lookup helpers that mirror the
JS/Node adapter at functions/src/constants/metrics.js and the
frontend adapter at src/constants/metrics.js.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Optional

_SRC = Path(__file__).resolve().parent / "metrics.generated.json"

with _SRC.open("r", encoding="utf-8") as _f:
    _RAW = json.load(_f)

METRICS: dict[str, dict[str, Any]] = _RAW["metrics"]
COMPARISON_SUFFIX: dict[str, str] = _RAW["comparisonSuffix"]
TARGET_PREFIX: str = _RAW["targetPrefix"]

_ALIAS_MAP: dict[str, str] = {}
for _key, _meta in METRICS.items():
    _ALIAS_MAP[_key] = _key
    for _alias in _meta.get("aliases", []) or []:
        _ALIAS_MAP[_alias] = _key


def _strip_target_prefix(key: str) -> str:
    if isinstance(key, str) and key.startswith("target_"):
        return key[len("target_"):]
    return key


def resolve_alias(key: Optional[str]) -> Optional[str]:
    if key is None:
        return None
    stripped = _strip_target_prefix(key)
    return _ALIAS_MAP.get(stripped)


def _get_metric(key: Optional[str]) -> Optional[dict[str, Any]]:
    canonical = resolve_alias(key)
    if canonical is None:
        return None
    return METRICS[canonical]


def label_of(key: str, fallback: Optional[str] = None) -> str:
    m = _get_metric(key)
    if m is None:
        return fallback if fallback is not None else key
    return m["label"]


def short_label_of(key: str, fallback: Optional[str] = None) -> str:
    m = _get_metric(key)
    if m is None:
        return fallback if fallback is not None else key
    return m["shortLabel"]


def tooltip_of(key: str, fallback: str = "") -> str:
    m = _get_metric(key)
    if m is None:
        return fallback
    return m.get("description", "")


def format_of(key: str) -> str:
    m = _get_metric(key)
    if m is None:
        return "number"
    return m.get("format", "number")


def ai_yasashii_of(key: str) -> Optional[str]:
    m = _get_metric(key)
    if m is None:
        return None
    return m.get("aiYasashii")


def target_label_of(key: str) -> str:
    canonical = resolve_alias(key)
    if canonical is None:
        return key
    return f"{TARGET_PREFIX}{METRICS[canonical]['label']}"


def comparison_label(key: str, kind: str, use_short: bool = False) -> str:
    base = short_label_of(key) if use_short else label_of(key)
    suffix = COMPARISON_SUFFIX.get(kind, "")
    return f"{base}{suffix}"


def _format_number(value: Any, decimals: int) -> str:
    if value is None:
        return "-"
    try:
        num = float(value)
    except (TypeError, ValueError):
        return "-"
    if math.isnan(num):
        return "-"
    return f"{num:,.{decimals}f}"


def _format_duration_hms(value: Any) -> str:
    if value is None:
        return "-"
    try:
        total = int(round(float(value)))
    except (TypeError, ValueError):
        return "-"
    m = total // 60
    s = total % 60
    if m == 0:
        return f"{s}秒"
    return f"{m}分{s}秒"


def format_value(key: str, value: Any, omit_suffix: bool = False) -> str:
    m = _get_metric(key)
    if m is None:
        return "-" if value is None else str(value)
    if value is None or value == "":
        return "-"
    suffix = "" if omit_suffix else m.get("suffix", "") or ""
    fmt = m.get("format", "number")
    decimals = m.get("decimals", 0)
    if fmt == "percent":
        return f"{_format_number(value, decimals if decimals is not None else 1)}{suffix}"
    if fmt == "decimal":
        return f"{_format_number(value, decimals if decimals is not None else 2)}{suffix}"
    if fmt == "rankDecimal":
        return f"{_format_number(value, decimals if decimals is not None else 1)}{suffix}"
    if fmt == "duration":
        return _format_duration_hms(value)
    return f"{_format_number(value, decimals if decimals is not None else 0)}{suffix}"


def list_metric_keys() -> list[str]:
    return list(METRICS.keys())


def summary_metric_rows(keys: Optional[list[str]] = None) -> list[tuple[str, str, str]]:
    """(canonicalKey, label, format) tuples for summary tables.

    Used by Excel summary.py to build METRIC_LABELS equivalents.
    """
    target_keys = keys if keys is not None else list_metric_keys()
    rows: list[tuple[str, str, str]] = []
    for key in target_keys:
        m = METRICS.get(key)
        if m is None:
            continue
        rows.append((key, m["label"], m.get("format", "number")))
    return rows
