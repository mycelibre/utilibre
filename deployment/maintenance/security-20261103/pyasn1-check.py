"""Small synthetic ASN.1 compatibility case plus the pinned upstream suite."""
import importlib.metadata, io, json, pathlib, sys, unittest
from pyasn1.codec.ber import decoder, encoder
from pyasn1.type import univ

assert importlib.metadata.version('pyasn1') == sys.argv[1]
fixed = sys.argv[2] == 'fixed'
normal = 0
for value in [univ.Integer(-17), univ.Integer(42), univ.OctetString(b'fictional'),
              univ.ObjectIdentifier('1.2.840.113549'), univ.Boolean(True),
              univ.BitString(binValue='010011'), univ.Real((17, 2, 4))]:
    result, rest = decoder.decode(encoder.encode(value), asn1Spec=value.clone())
    assert result == value and rest == b''
    normal += 1

# Upstream's nested constructed-string regression uses seven harmless bytes.
nested_correct = True
for raw in ['24052403040141', '240724800401410000']:
    result, rest = decoder.decode(bytes.fromhex(raw))
    nested_correct &= result.asOctets() == b'A' and rest == b''
assert nested_correct == fixed, 'Expected baseline/fixed nested-string behavior'

tests = 0
if fixed:
    # The mount contains upstream tests only, not a second pyasn1 implementation.
    sys.path.insert(0, '/opt/utilibre-pyasn1-tests')
    suite = unittest.defaultTestLoader.discover('/opt/utilibre-pyasn1-tests/tests', top_level_dir='/opt/utilibre-pyasn1-tests')
    result = unittest.TextTestRunner(stream=sys.stderr, verbosity=0).run(suite)
    assert result.wasSuccessful() and result.testsRun > 1000
    tests = result.testsRun
print(json.dumps({'passed':True, 'version':sys.argv[1], 'normalChecks':normal,
                  'nestedStringCorrect':nested_correct, 'upstreamTests':tests,
                  'network':'none', 'scope':'Pinned upstream suite and bounded functional regression; no large denial-of-service load test.'}))
