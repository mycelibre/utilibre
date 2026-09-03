#!/usr/bin/env python3
"""Regression checks for the SearXNG rendered-log privacy hook."""

from __future__ import annotations

import importlib.util
import io
import logging
from pathlib import Path
import sys


sys.dont_write_bytecode = True
hook_path = Path(__file__).resolve().parents[1] / "config" / "searxng" / "sitecustomize.py"
spec = importlib.util.spec_from_file_location("utility_searx_sitecustomize", hook_path)
if spec is None or spec.loader is None:
    raise RuntimeError(f"could not load {hook_path}")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

stream = io.StringIO()
handler = logging.StreamHandler(stream)
logger = logging.getLogger("utility.searx.redaction-test")
logger.handlers = [handler]
logger.propagate = False
logger.setLevel(logging.WARNING)

messages = (
    "q=SENTINEL_FIRST SENTINEL_LEAK",
    "upstream=https://example.invalid/search?q=SENTINEL_URL SENTINEL_URL_TAIL status=500",
    "{'q': 'SENTINEL_QUOTE\\' SENTINEL_TAIL'}",
)
for message in messages:
    logger.warning(message)

rendered = stream.getvalue()
if "SENTINEL" in rendered:
    raise AssertionError(f"query content escaped redaction: {rendered!r}")
if rendered.count("<redacted>") != 2 or rendered.count("<query-redacted>") != 1:
    raise AssertionError(f"expected redaction markers were absent: {rendered!r}")

print("SearXNG log-redaction regression checks passed")
