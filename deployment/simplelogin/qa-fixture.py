"""Create only a disposable fictional native model fixture; no outbound mail."""
import json,secrets
from server import create_light_app
from app.models import User,Alias
from app.db import Session
with create_light_app().app_context():
 email='utilibreqa1009@example.invalid'
 assert User.get_by(email=email) is None
 password=secrets.token_urlsafe(32)
 u=User.create(email=email,name='Fictional museum curator',password=password,activated=True,notification=False)
 Session.commit()
 a=Alias.create(email='fictionalmuseum1009@simplelogin.utilibre.org',user_id=u.id,mailbox_id=u.default_mailbox_id,note='Fictional museum bulletin')
 Session.commit()
 print('QA_JSON:'+json.dumps({'id':u.id,'email':email,'password':password,'alias':a.email,'aliasId':a.id}))
