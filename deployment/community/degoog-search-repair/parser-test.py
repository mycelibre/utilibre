"""Offline regression for the pinned upstream Brave parser and bridge helpers."""
import sys
sys.path.insert(0, '/app/src/server/extensions/compatibility-layer/searx')
from bridge import engine
from bridge.errors import SearxEngineTooManyRequestsException

parser = engine.load('/opt/searx-engines/brave.py')
record = '{title:"Apostrophe: it\'s safe",url:"https://example.invalid/a",description:"plain text"}'
body = '{type:"data",data:{body:{response:{web:{results:[' + record + ']}}}}}'
fixtures = {
    'plain': 'data: [{type:"data",data:{}},' + body + ']',
    'iife': 'data: [(function(a){return {type:"data",data:{}}}({})),(function(a){return {type:"data",data:{body:{response:{web:{results:[a]}}}}}}(' + record + '))]',
    'mixed': 'data: [(function(a){return {type:"data",data:{}}}({})), ' + body + ']',
}
for name, fixture in fixtures.items():
    result = parser.extract_json_data(fixture)['data'][1]['data']['body']['response']['web']['results'][0]
    assert result['title'] == "Apostrophe: it's safe"
    assert result['url'] == 'https://example.invalid/a'
    print(name, 'passed')
for malformed in ['data: [fetch("https://example.invalid/")]', 'data: [{unclosed:true']:
    try:
        parser.extract_json_data(malformed)
    except (ValueError, KeyError):
        pass
    else:
        raise AssertionError('Malformed or executable input accepted')
assert str(SearxEngineTooManyRequestsException(message='provider limited')) == 'provider limited'
print('Malformed input rejected; provider message preserved.')
