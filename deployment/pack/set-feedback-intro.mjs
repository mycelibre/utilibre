import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const content=await readFile(new URL('./feedback-intro.md',import.meta.url),'utf8');
const code=`import sys
from wsgi import app
from liberaforms.models.form import Form
text=sys.stdin.read()
with app.test_request_context():
 f=Form.find(id=1)
 assert f and f.slug=='feedback' and f.is_e2ee
 f.save_introduction_text(text)
 print('Updated only the operator-owned encrypted feedback form introduction.')
`;
console.log(execFileSync('docker',['exec','-i','utilibre-pack-forms-app-1','python','-c',code],{input:content,encoding:'utf8'}).trim());
