"""Update only the reviewed direct constraints; never run against user state."""
from pathlib import Path
p = Path('/code/pyproject.toml')
s = p.read_text()
replacements = {'"python-dotenv ~= 0.14.0"': '"python-dotenv == 1.2.4"', '"flask-cors ~= 3.0.9"': '"flask-cors == 6.0.5"', '"jwcrypto ~= 0.8"': '"jwcrypto == 1.6.1"', '"pyopenssl ~= 19.1.0"': '"pyopenssl == 26.4.0"', '"pycryptodome ~= 3.9.8"': '"pycryptodome == 3.24.0"', '"PGPy == 0.5.4"': '"PGPy == 0.6.0"', '"requests ~= 2.25.1"': '"requests == 2.34.2"', '"cryptography ~= 37.0.1"': '"cryptography == 50.0.2"', '"newrelic-telemetry-sdk ~= 0.5.0"': '"newrelic-telemetry-sdk == 0.9.0"'}
for old, new in replacements.items():
    assert s.count(old) == 1, old
    s = s.replace(old, new)
p.write_text(s)
