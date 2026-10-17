'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../extension'),key='promptdock.window.target.v1';
function setup(){
 const events={},calls=[],windows=new Map(),session={},local={};let nextId=100,delayContexts=false,failCreate=false;
 const event=name=>({addListener:fn=>events[name]=fn});
 const area=db=>({get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,db[k]])),set:async values=>Object.assign(db,values),remove:async keys=>(Array.isArray(keys)?keys:[keys]).forEach(k=>delete db[k])});
 const chrome={runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,onInstalled:event('install'),onMessage:event('message'),getContexts:async()=>delayContexts?[]:[...windows.values()].map(w=>({documentUrl:w.url,windowId:w.id,contextType:'TAB'}))},storage:{local:area(local),session:area(session),onChanged:event('storageChange')},contextMenus:{onClicked:event('menu'),removeAll:cb=>cb(),create:(options,cb)=>cb(),update:(id,options,cb)=>{calls.push(['menuTitle',id,options]);cb();}},commands:{onCommand:event('command')},sidePanel:{setPanelBehavior:async options=>calls.push(['panelBehavior',options]),open:async options=>calls.push(['panel',options])},action:{onClicked:event('action'),setBadgeText:async v=>calls.push(['badge',v]),setTitle:async v=>calls.push(['title',v])},windows:{get:async id=>{if(!windows.has(id))throw Error('No window');return windows.get(id);},update:async(id,options)=>{if(!windows.has(id))throw Error('No window');calls.push(['update',id,options]);return Object.assign(windows.get(id),options);},create:async options=>{if(failCreate)throw Error('Create failed');calls.push(['create',options]);const w={...options,id:nextId++};windows.set(w.id,w);return w;}},tabs:{create:async options=>calls.push(['tab',options])}};
 function load(){const ctx=vm.createContext({chrome,crypto:require('node:crypto').webcrypto,console:{warn(){}}});ctx.importScripts=(...names)=>names.forEach(n=>vm.runInContext(fs.readFileSync(path.join(root,n),'utf8'),ctx));vm.runInContext(fs.readFileSync(path.join(root,'background.js'),'utf8'),ctx);}
 load();return {calls,windows,session,events,load,set delayContexts(v){delayContexts=v;},set failCreate(v){failCreate=v;},send:message=>new Promise(resolve=>events.message(message,{id:'test'},resolve))};
}
const settled=()=>new Promise(resolve=>setImmediate(resolve));
test('Toolbar click directly opens the independent window, records originating browser and leaves sidebar closed',async()=>{
 const b=setup();b.events.action({windowId:7});await settled();const created=b.calls.find(c=>c[0]==='create')[1];assert.equal(created.url,'chrome-extension://test/window.html');assert.equal(created.type,'popup');assert.equal(b.session[key],7);assert.equal(b.windows.size,1);assert.equal(b.calls.some(c=>c[0]==='panel'),false);
});
test('Rapid repeated toolbar clicks reuse one window even before document contexts finish loading',async()=>{
 const b=setup();b.delayContexts=true;for(const windowId of [7,7,9])b.events.action({windowId});await settled();assert.equal(b.calls.filter(c=>c[0]==='create').length,1);assert.equal(b.calls.filter(c=>c[0]==='update').length,2);assert.equal(b.windows.size,1);assert.equal(b.session[key],9);
});
test('Worker restart finds and reuses the existing PromptDock window without a tabs permission',async()=>{
 const b=setup();b.events.action({windowId:7});await settled();const id=[...b.windows.keys()][0];b.load();b.events.action({windowId:12});await settled();assert.equal(b.calls.filter(c=>c[0]==='create').length,1);assert.equal(b.calls.filter(c=>c[0]==='update').at(-1)[1],id);assert.equal(b.session[key],12);
});
test('A closed independent window is replaced on the next toolbar click',async()=>{
 const b=setup();b.events.action({windowId:7});await settled();b.windows.clear();b.events.action({windowId:7});await settled();assert.equal(b.calls.filter(c=>c[0]==='create').length,2);assert.equal(b.windows.size,1);
});
test('Sidebar open-window requests use the same reuse flow and reject foreign senders',async()=>{
 const b=setup();const first=await b.send({type:'promptdock.open-window',browserWindowId:4}),second=await b.send({type:'promptdock.open-window',browserWindowId:5});assert.equal(first.ok,true);assert.equal(second.ok,true);assert.equal(second.window.id,first.window.id);assert.equal(second.window.reused,true);assert.equal(b.session[key],5);
 let replied=false;assert.equal(b.events.message({type:'promptdock.open-window',browserWindowId:7},{id:'foreign'},()=>replied=true),undefined);assert.equal(replied,false);assert.equal(b.calls.filter(c=>c[0]==='create').length,1);
});
test('Create failures are visible and do not prevent a later successful toolbar click',async()=>{
 const b=setup();b.failCreate=true;b.events.action({windowId:7});await settled();assert.ok(b.calls.some(c=>c[0]==='badge'&&c[1].text==='!'));assert.equal(b.windows.size,0);b.failCreate=false;b.events.action({windowId:7});await settled();assert.equal(b.windows.size,1);
});
test('Language changes also update toolbar and selection-menu captions',async()=>{
 const b=setup();await settled();b.events.storageChange({'promptdock.ui.v1':{newValue:{language:'en',theme:'dark'}}},'local');assert.equal(b.calls.filter(c=>c[0]==='title').at(-1)[1].title,'PromptDock · Open floating window');assert.equal(b.calls.filter(c=>c[0]==='menuTitle').at(-1)[2].title,'Save selection to PromptDock');
});
