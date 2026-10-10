"""Use the native user manager; credentials are read from stdin, never logged."""
import asyncio,json,sys
from beaverhabits.app.auth import user_create,user_get_by_email
from beaverhabits.app.db import create_db_and_tables
from beaverhabits.configs import settings
async def main():
 r=json.load(sys.stdin);assert r['email']==settings.ADMIN_EMAIL
 await create_db_and_tables();assert await user_get_by_email(r['email']) is None,'Administrator already exists'
 await user_create(r['email'],r['password'],is_superuser=True)
 print('Native service administrator created; public registration remains closed.')
asyncio.run(main())
