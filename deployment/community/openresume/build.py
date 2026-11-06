"""Compatibility entry point for the reviewed bilingual static build. No deployment."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name("build-localized.py")), run_name="__main__")
