'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const legacy=['promptdock.ai.settings.v1','promptdock.ai.session.v1'];
function privacy(globals){const ctx=vm.createContext(globals);vm.runInContext(fs.readFileSync(path.join(__dirname,'../extension/privacy.js'),'utf8'),ctx);return ctx.PromptDockPrivacy;}
function webStorage(){const db=Object.fromEntries([...legacy.map(k=>[k,'SECRET-DO-NOT-READ']),['promptdock.library.v2','USER-LIBRARY'],['unrelated','KEEP']]);return {db,getItem(){throw Error('Must not read retired credentials');},removeItem:k=>delete db[k]};}
test('Web migration clears only retired settings and Key records without reading or transmitting them',async()=>{
 const local=webStorage(),session=webStorage(),p=privacy({localStorage:local,sessionStorage:session,fetch(){throw Error('No network');}});assert.equal(await p.clearLegacySettings(),true);
 for(const s of [local,session]){for(const k of legacy)assert.equal(s.db[k],undefined);assert.equal(s.db['promptdock.library.v2'],'USER-LIBRARY');assert.equal(s.db.unrelated,'KEEP');}assert.equal(await p.clearLegacySettings(),true);
});
test('Extension migration clears local and session settings, preserves the library and is idempotent',async()=>{
 const local=webStorage(),session=webStorage();const area=s=>({get(){throw Error('Must not read keys');},remove:async keys=>keys.forEach(k=>s.removeItem(k))});const p=privacy({chrome:{storage:{local:area(local),session:area(session)}}});assert.equal(await p.clearLegacySettings({extension:true}),true);assert.equal(await p.clearLegacySettings({extension:true}),true);
 for(const s of [local,session]){for(const k of legacy)assert.equal(s.db[k],undefined);assert.equal(s.db['promptdock.library.v2'],'USER-LIBRARY');assert.equal(s.db.unrelated,'KEEP');}
});
test('Blocked storage does not throw or prevent cleaning the other area',async()=>{
 const session=webStorage(),p=privacy({localStorage:{removeItem(){throw Error('Blocked');}},sessionStorage:session});assert.equal(await p.clearLegacySettings(),false);for(const k of legacy)assert.equal(session.db[k],undefined);
 const extensionSession=webStorage(),q=privacy({chrome:{storage:{local:{remove:async()=>{throw Error('Blocked');}},session:{remove:async keys=>keys.forEach(k=>extensionSession.removeItem(k))}}}});assert.equal(await q.clearLegacySettings({extension:true}),false);for(const k of legacy)assert.equal(extensionSession.db[k],undefined);
});
test('Storage getter failures are contained so the local app can continue',async()=>{
 const globals={};Object.defineProperty(globals,'localStorage',{get(){throw Error('SecurityError');}});Object.defineProperty(globals,'sessionStorage',{get(){throw Error('SecurityError');}});assert.equal(await privacy(globals).clearLegacySettings(),false);
});
