#!/usr/bin/env python3
"""Regression check for local SearXNG pagination overrides."""

from __future__ import annotations

from pathlib import Path


settings_path = Path(__file__).resolve().parents[1] / "config" / "searxng" / "settings.yml"
lines = settings_path.read_text(encoding="utf-8").splitlines()

engine_blocks: dict[str, dict[str, str]] = {}
current_engine: str | None = None
for line in lines:
    if line.startswith("  - name: "):
        current_engine = line.removeprefix("  - name: ").strip()
        engine_blocks[current_engine] = {}
        continue
    if current_engine is None:
        continue
    if line.startswith("  ") and not line.startswith("    "):
        current_engine = None
        continue
    if line.startswith("    ") and not line.startswith("      ") and ":" in line:
        key, value = line.strip().split(":", 1)
        engine_blocks[current_engine][key] = value.strip()

fynd = engine_blocks.get("fynd")
if fynd is None:
    raise AssertionError("the local Fynd engine override is missing")
if fynd.get("disabled") != "false":
    raise AssertionError("Fynd must remain explicitly enabled as a first-page contributor")
if fynd.get("paging") != "false":
    raise AssertionError("Fynd paging must stay disabled until its sx/psx state is supported")

search_values: dict[str, str] = {}
suspended_times: dict[str, str] = {}
in_search = False
in_suspended_times = False
for line in lines:
    if line == "search:":
        in_search = True
        continue
    if in_search and line and not line.startswith(" "):
        break
    if not in_search or not line.strip() or line.lstrip().startswith("#"):
        continue
    if line.startswith("  ") and not line.startswith("    ") and ":" in line:
        key, value = line.strip().split(":", 1)
        search_values[key] = value.strip()
        in_suspended_times = key == "suspended_times"
        continue
    if in_suspended_times and line.startswith("    ") and not line.startswith("      ") and ":" in line:
        key, value = line.strip().split(":", 1)
        suspended_times[key] = value.strip()

if search_values.get("max_page") != "5":
    raise AssertionError("anonymous SearXNG searches must stay capped at five pages")

expected_suspensions = {
    "SearxEngineAccessDenied": "86400",
    "SearxEngineCaptcha": "86400",
    "SearxEngineTooManyRequests": "3600",
}
if suspended_times != expected_suspensions:
    raise AssertionError(
        "single-egress upstream suspension windows changed: "
        f"expected {expected_suspensions!r}, got {suspended_times!r}"
    )

print("SearXNG pagination configuration regression checks passed")
