// Upstream lifecycle functions, with no activity or answer logging.
import {execFileSync} from 'node:child_process';
execFileSync('docker',['exec','utilibre-pack-forms-app-1','python','-c',`
from wsgi import app
from liberaforms.domain.form import expire_all_by_date_condition, purge_expired_forms
from liberaforms.utils import date_time
with app.test_request_context(base_url='https://forms.utilibre.org'):
    now = date_time.now()
    expire_all_by_date_condition(now)
    purge_expired_forms(now)
`],{stdio:'ignore'});
console.log('Native form expiry/purge maintenance completed.');
