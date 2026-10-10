"""Initialize only a new, empty TRIP installation before admitting any user."""
from pathlib import Path
import secrets, asyncio
from sqlmodel import Session,select
from trip.main import app
from trip.config import ensure_secret_key
from trip.db.core import get_engine,init_user_data,init_and_migrate_db
from trip.models.models import User
from trip.security import hash_password,create_access_token
ensure_secret_key()
asyncio.run(init_and_migrate_db())
with Session(get_engine()) as session:
 assert not session.exec(select(User)).first(), 'Refuse to reseed an existing installation'
 u=User(username='trip-pilot-admin',password=hash_password(secrets.token_urlsafe(48)),is_admin=True)
 session.add(u);session.commit();init_user_data(session,u.username)
 p=Path('/app/storage/pilot-admin.token');p.write_text(create_access_token({'sub':u.username}));p.chmod(0o600)
print('Private native bootstrap admin seeded; no usable password disclosed.')
