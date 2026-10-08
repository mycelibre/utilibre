import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const owner=await readFile('/opt/utilibre/pack-secrets/liberaforms-owner.json','utf8');
// Native model creation, equivalent to the upstream CLI, without passwords in
// command arguments or logs. Existing accounts and forms are never overwritten.
const script=`import json,sys
from wsgi import app
from liberaforms.models.site import Site
from liberaforms.models.user import User
owner=json.loads(sys.stdin.readline())
with app.test_request_context():
 site=Site.find()
 site.name='Utilibre · LiberaForms'
 site.invitation_only=True
 site.newuser_enableuploads=False
 site.smtp_config={'host':'mx.mailgt.dev','port':26,'user':'','password':'','encryption':'STARTTLS','noreplyAddress':'no-reply@utilibre.org'}
 site.resources_menu={'enabled':True,'languages':{'es-ES':[['Utilibre','https://utilibre.org/es/']],'en-US':[['Utilibre','https://utilibre.org/en/']]}}
 site.save()
 if not User.find(email=owner['email']):
  user=User(username=owner['username'],email=owner['email'],password=owner['password'],preferences=User.new_user_preferences(),admin=User.default_admin_settings(),role='admin',validated_email=True,uploads_enabled=False,uploads_limit='0 MB')
  user.save()
 print('Native owner and SMTP configured; invitations retained; uploads disabled.')
`;
const output=execFileSync('docker',['compose','-f','deployment/pack/compose.forms.yaml','run','--rm','-T','app','python','-c',script],{input:owner+'\n',encoding:'utf8'});
console.log(output.trim());
