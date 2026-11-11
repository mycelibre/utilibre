"""Read aggregate WBO state only; refuse to discard a temporary board."""
import importlib.util
from pathlib import Path
import stat

source = Path(__file__).resolve().parents[2] / 'community/wbo/ram_history.py'
spec = importlib.util.spec_from_file_location('wbo_ram', source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
name = 'utilibre-collaboration-pilot-wbo-1'
info = module.inspect(name)
root = Path('/proc') / str(info['State']['Pid']) / 'root/opt/app/server-data'
assert root.is_dir()
assert not any(stat.S_ISREG(p.lstat().st_mode) for p in root.rglob('*')), 'Retained boards prevent recreation'
assert module.connections(name) == 0, 'An active connection prevents recreation'
