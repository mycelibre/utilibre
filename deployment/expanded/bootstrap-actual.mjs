// Run inside the pinned Actual container with `docker exec -i ... node --input-type=module`.
// Establish the operator before first-user auto-provisioning is enabled.
import { randomUUID } from 'node:crypto';
import { i as getAccountDb, r as enableOpenID } from '/app/chunks/account-db-CyiKvvrD.js';
const db = getAccountDb();
db.transaction(() => {
  const owner = db.first("SELECT user_name FROM users WHERE owner = 1 AND user_name <> ''");
  if (owner && owner.user_name !== 'utilibre-admin') throw Error('Unexpected existing owner; refusing to change it');
  if (!owner) {
    const users = db.first("SELECT count(*) AS count FROM users WHERE user_name <> ''");
    if (users.count !== 0) throw Error('Existing users require a manual ownership review');
    db.mutate('INSERT INTO users (id,user_name,display_name,enabled,owner,role) VALUES (?,?,?,1,1,?)', [randomUUID(), 'utilibre-admin', 'Utilibre administrator', 'ADMIN']);
  }
});
const result = await enableOpenID({openId: {
  discoveryURL: process.env.ACTUAL_OPENID_DISCOVERY_URL,
  client_id: process.env.ACTUAL_OPENID_CLIENT_ID,
  client_secret: process.env.ACTUAL_OPENID_CLIENT_SECRET,
  server_hostname: process.env.ACTUAL_OPENID_SERVER_HOSTNAME,
}});
if (result?.error) throw Error(result.error);
console.log('Actual operator established; OpenID enabled. New approved users will be BASIC, never first-user owners.');
