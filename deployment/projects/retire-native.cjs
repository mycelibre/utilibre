/* Run inside the Projects container after native fixture deletion/logout.
 * Invokes the upstream deletion helper for exactly the two owned QA accounts.
 * Soft-deleted identity fields and native archives are intentionally retained.
 */
const assert=require('node:assert/strict');
const run=process.env.UTILIBRE_PROJECTS_CHECK_RUN||'';
assert(!run||/^[a-z0-9]{1,20}$/.test(run));
const runSuffix=run?'-'+run:'';
const app=require('sails');
const config=require('sails/accessible/rc')('sails');
config.hooks={...config.hooks,http:false,views:false,sockets:false,pubsub:false,watcher:false};
config.log={level:'error'};
app.load(config,async error=>{
 if(error)throw error;
 try{
  for(const suffix of ['a','b']){
   const user=await User.findOne({email:'utilibre-projects-check-'+suffix+runSuffix+'@utilibre.org'});
   assert(user&&!user.isAdmin&&!user.deletedAt&&user.isSso);
   assert.equal(await ProjectManager.count({userId:user.id}),0);
   const retired=await sails.helpers.users.deleteOne.with({record:user,actorUser:User.OIDC});assert(retired.deletedAt);
   await Session.destroy({userId:user.id});
   assert.equal(await IdentityProviderUser.count({userId:user.id}),0);
  }
  assert.equal(await User.count({email:'utilibre-projects-check-denied'+runSuffix+'@utilibre.org'}),0);
  console.log('Native helper soft-deleted two QA accounts; their sessions and identity links revoked. Denied identity has no app account.');
 }catch(e){process.exitCode=1;console.error(e.message);}
 finally{await new Promise(r=>app.lower(r));}
});
