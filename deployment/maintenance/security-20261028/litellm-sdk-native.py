"""No network or production database: confirm KitchenOwl is not a LiteLLM proxy."""
import json
import os
import runpy
import sys

assert os.environ.get('UTILIBRE_SECURITY_DISPOSABLE') == 'yes'
assert os.environ['LLM_MODEL'] == os.environ['LLM_API_URL'] == ''
assert os.environ['LITELLM_LOCAL_MODEL_COST_MAP'] == 'true'
assert os.environ['LITELLM_TELEMETRY'] == 'false'
from app import app
from app.service import ingredient_parsing as ingredients

calls = []
def forbidden_completion(*args, **kwargs):
    calls.append(True)
    raise AssertionError('No provider call is permitted')

ingredients.completion = forbidden_completion
parsed = ingredients.parseIngredients(['2 cups flour', '3 apples'])
assert len(parsed) == 2 and all(value.name for value in parsed)
assert not calls
rules = sorted(str(rule) for rule in app.url_map.iter_rules())
for path in ['/utils/transform_request', '/key/generate', '/user/new', '/model/new']:
    assert path not in rules
    response = app.test_client().post(path, json={})
    assert response.status_code == 404
assert not any(name == 'litellm.proxy.proxy_server' for name in sys.modules)
# The existing two-account fixture also checks legitimate recipe operations.
runpy.run_path('/account-check.py', run_name='__main__')
print('LITELLM_SDK_RESULT ' + json.dumps(dict(
    passed=True, proxyRoutesAbsent=True, proxyServerLoaded=False,
    providerCalled=bool(calls), ingredientRows=len(parsed), nativeAccountsPassed=True,
    routeCount=len(rules), network='none', productionChanged=False)))
