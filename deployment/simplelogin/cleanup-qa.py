"""Delete only the exact synthetic account through upstream's native model."""
import json,datetime
from server import create_light_app
from app.models import User,Alias
from app.db import Session
with create_light_app().app_context():
 u=User.get_by(email='utilibreqa1009@example.invalid')
 assert u and u.name=='Fictional museum curator'
 uid=u.id
 User.delete(uid,commit=True)
 assert User.get(uid) is None
 assert Alias.filter_by(user_id=uid).count()==0
 print('QA_CLEANUP:'+json.dumps({'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'nativeModelAccountCleanup':True,'liveOwnedAliasesRemoved':True,'nativeUiDeletionNotTested':'confirmation mail requires configured SMTP; no outbound mail was sent','deletedAliasReservationsMayRemain':True}))
