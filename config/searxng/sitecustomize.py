"""Redact search terms from SearXNG dependency log records.

Python imports ``sitecustomize`` during interpreter startup when this directory
is on ``PYTHONPATH``.  The deployed upstream image remains unchanged; this
source-visible hook replaces only query values in rendered operational logs.
"""

from __future__ import annotations

import logging
import re
from typing import Any


_original_factory = logging.getLogRecordFactory()
_sensitive_tail = re.compile(
    r"(?:https?://[^\s?]+\?)|(?:\b(?:q|query)=)|(?:['\"](?:q|query)['\"]\s*:\s*)",
    re.IGNORECASE,
)


def _redact(value: str) -> str:
    """Remove the first query value and the remainder of its rendered record.

    Rendered dependency messages are not a format we can safely parse: query
    values can contain spaces, commas, quotes, or escaped quotes.  Keeping only
    the trusted prefix is deliberately conservative and prevents a malformed
    value from escaping a best-effort regular-expression boundary.
    """

    match = _sensitive_tail.search(value)
    if match is None:
        return value
    marker = "<query-redacted>" if match.group(0).endswith("?") else "<redacted>"
    return f"{value[:match.end()]}{marker}"


def _record_factory(*args: Any, **kwargs: Any) -> logging.LogRecord:
    record = _original_factory(*args, **kwargs)
    try:
        rendered = record.getMessage()
    except Exception:  # Logging must never break the application.
        return record
    record.msg = _redact(rendered)
    record.args = ()
    return record


logging.setLogRecordFactory(_record_factory)
