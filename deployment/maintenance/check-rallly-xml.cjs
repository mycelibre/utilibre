// Native installed SDK parser path; synthetic XML only, network disabled.
const assert=require('node:assert/strict');
const path='/app/node_modules/.pnpm/fast-xml-parser@5.3.4/node_modules/fast-xml-parser';
assert.equal(require(path+'/package.json').version,'5.11.2');
const {XMLParser,XMLBuilder,XMLValidator}=require(path);
const parser=new XMLParser({ignoreAttributes:false});
const sample='<ListBucketResult><Name>fictional</Name><Contents><Key>practice.txt</Key><Size>21</Size></Contents></ListBucketResult>';
const decoded=parser.parse(sample);assert.equal(decoded.ListBucketResult.Contents.Size,21);
assert.deepEqual(parser.parse(new XMLBuilder({ignoreAttributes:false}).build(decoded)),decoded);
assert.notEqual(XMLValidator.validate('<broken>'),true);
assert.equal(parser.parse('<example>mañana &amp; café</example>').example,'mañana & café');
assert.equal({}.polluted,undefined);
console.log('Native XML parsing, UTF-8, round trip and invalid syntax detection passed');
