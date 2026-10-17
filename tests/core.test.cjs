'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const root=path.resolve(__dirname,'../extension');
function store(){const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'store.js'),'utf8'),ctx);return ctx.PromptDockStore;}
const record=(id,content=id)=>({id,title:id,content,tags:[]});
const plain=x=>JSON.parse(JSON.stringify(x));
test('Original standalone crashes in head; repaired startup waits for DOM',()=>{
 const old=fs.readFileSync(path.join(__dirname,'fixtures/legacy-app.js'),'utf8');
 assert.throws(()=>vm.runInNewContext(old,{document:{body:null}}),/null/);
 let event;vm.runInNewContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),{document:{body:null,readyState:'loading',addEventListener:(name,fn,opts)=>{event={name,fn,opts};}}});
 assert.equal(event.name,'DOMContentLoaded');assert.equal(event.opts.once,true);
});
test('Separate-record concurrent writes preserve both additions',()=>{
 const s=store();const a=record('a'), b=record('b');
 const first=s.merge([],s.diff([],[a]));assert.deepEqual(plain(s.merge(first,s.diff([],[b]))),[b,a]);
});
test('Conflicting edits reject without overwriting latest data',()=>{
 const s=store(), original=record('a'), latest=record('a','new');
 assert.throws(()=>s.merge([latest],s.diff([original],[record('a','stale')])),/其他窗口/);
 assert.equal(latest.content,'new');
});
test('Deletes affect only target record and conflict with concurrent edits',()=>{
 const s=store(),a=record('a'),b=record('b');
 assert.deepEqual(plain(s.merge([a,b],s.diff([a],[]))),[b]);
 assert.throws(()=>s.merge([record('a','changed')],s.diff([a],[])),/其他窗口/);
});
test('Reject invalid commits and duplicate operation IDs',()=>{
 const s=store();assert.throws(()=>s.merge([],[{id:'x',before:null,after:record('y')}]));
 assert.throws(()=>s.merge([],Array(2).fill({id:'x',before:null,after:record('x')})));
});
function appAPI(localStorage={getItem:()=>null,setItem(){}},overrides={}){
 const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,classList:{toggle(){},add(){},remove(){}},handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},dataset:{},setAttribute(name,value){this[name]=value;},focus(){}});return elements.get(id);};
 const ctx=vm.createContext({window:{addEventListener(){}},localStorage,console,document:{body:{dataset:{mode:'preview'},style:{},addEventListener(){}},removeEventListener(){},addEventListener(){},readyState:'complete',getElementById:element,querySelector:()=>null,querySelectorAll:()=>[]},location:{protocol:'https:'},crypto:require('node:crypto').webcrypto,URL,AbortController,navigator:{},setTimeout:()=>0,clearTimeout(){},...overrides});
 ctx.window.document=ctx.document;ctx.window.navigator=ctx.navigator;
 vm.runInContext(fs.readFileSync(path.join(root,'ui.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'store.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'privacy.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'floating.js'),'utf8'),ctx);
 const src=fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/  init\(\)\.catch\(error=>\{[^\n]*\}\);/, '  globalThis.api={normalize,variableNames,filledContent,h,state,filtered,renderCards,openModal,updateCategoryInput,beginCustomCategory,selectedCategory,editorSignature,closeModal,persist,store,onSave,saveCategory,openCategoryManager,startCategoryRename,requestCategoryDelete,deleteCategory,categories,bind,seeds,simplifyPresets,LEGACY_PRESETS,openTutorial,closeTutorial,practiceTutorial,openExtensionSurface,openVariables,downloadItems,toggleFavorite,togglePinnedWindow,markup,applyPreferences,changePreferences};');
 vm.runInContext(src,ctx);return {api:ctx.api,elements,floating:ctx.PromptDockFloating,ui:ctx.PromptDockUI,document:ctx.document,window:ctx.window};
}
test('Old backup records normalize without changing IDs, content or counts',()=>{
 const {api:a}=appAPI();const p=a.normalize({...record('old'),favorite:true,useCount:4,category:'通用'});
 assert.equal(p.id,'old');assert.equal(p.content,'old');assert.equal(p.useCount,4);assert.equal(p.favorite,true);
 assert.equal(a.normalize({title:{},content:'x'}),null);
});
test('Template repeated names deduplicate and replacements remain literal',()=>{
 const {api:a}=appAPI();assert.deepEqual(plain(a.variableNames('【角色】 {{角色}} {{场景}}')),['角色','场景']);
 a.state.templateFields['角色']='$& <b>人物</b>';assert.equal(a.filledContent({content:'【角色】 {{场景}}'}),'$& <b>人物</b> {{场景}}');
});
test('Prototype-like template names do not crash or access inherited properties',()=>{
 const {api:a}=appAPI();assert.equal(a.filledContent({content:'{{constructor}} {{__proto__}}'}),'{{constructor}} {{__proto__}}');
 a.state.templateFields['__proto__']='正常文字';assert.equal(a.filledContent({content:'{{__proto__}}'}),'正常文字');
});
test('Search matches all terms; favorites and recent-use filters work',()=>{
 const {api:a}=appAPI();a.state.entries=[a.normalize({...record('a','电影 逆光'),tags:['人物'],favorite:true,usedAt:'2026-10-10'}),a.normalize(record('b','电影'))];
 a.state.search='电影 人物';assert.equal(a.filtered().length,1);a.state.search='';a.state.scope='recent';assert.equal(a.filtered().length,1);a.state.scope='favorite';assert.equal(a.filtered().length,1);
});
test('Untrusted imported HTML is escaped in cards, tags and attributes',()=>{
 const {api:a,elements}=appAPI();a.state.entries=[a.normalize({id:'\"><img src=x onerror=alert(1)>',title:'<script>alert(1)</script>',content:'<img src=x>',tags:['<b>'],category:'<svg>'})];
 a.renderCards();const html=elements.get('cards').innerHTML;assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&quot;'));
});
function background(){
 const events={},calls=[],db={};
 const event=name=>({addListener:fn=>events[name]=fn});
 const chrome={runtime:{id:'test',onInstalled:event('install'),onMessage:event('message'),getURL:p=>'chrome-extension://test/'+p},commands:{onCommand:event('command')},contextMenus:{onClicked:event('menu'),removeAll:cb=>cb(),create:(v,cb)=>{calls.push(['create',v]);cb();}},sidePanel:{setPanelBehavior:async v=>{calls.push(['behavior',v]);},open:v=>{calls.push(['open',v]);return Promise.resolve();}},storage:{local:{get:async k=>{calls.push(['get']);await new Promise(r=>setTimeout(r,1));return Object.fromEntries((Array.isArray(k)?k:[k]).map(key=>[key,db[key]===undefined?undefined:plain(db[key])]));},set:async v=>{calls.push(['set']);await new Promise(r=>setTimeout(r,1));Object.assign(db,plain(v));}}},tabs:{create:v=>calls.push(['tab',v])},action:{onClicked:event('action'),setBadgeText:()=>Promise.resolve(),setTitle:()=>Promise.resolve()}};
 const ctx=vm.createContext({chrome,console,crypto:require('node:crypto').webcrypto});ctx.importScripts=(...files)=>files.forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx));vm.runInContext(fs.readFileSync(path.join(root,'background.js'),'utf8'),ctx);
 const send=(changes,initialize=false)=>new Promise(resolve=>events.message({type:'promptdock.commit',changes,initialize},{id:'test'},resolve));
 return {events,calls,db,chrome,send};
}
test('Worker serializes simultaneous writes and protects first-run initialization',async()=>{
 const b=background(),s=store(),a=record('a'),c=record('c');const result=await Promise.all([b.send(s.diff([],[a])),b.send(s.diff([],[c]))]);
 assert.ok(result.every(r=>r.ok));assert.equal(b.db[s.LIBRARY_KEY].entries.length,2);
 const init=await b.send(s.diff([],[record('seed')]),true);assert.equal(init.entries.entries.length,2);
});
test('Context menu opens sidebar before awaiting storage; duplicate text saves once',async()=>{
 const b=background(),s=store();b.calls.length=0;b.events.menu({menuItemId:'promptdock-save-selection',selectionText:'选中的文本'},{windowId:7});
 assert.equal(b.calls.find(c=>c[0]!=='behavior')[0],'open');await b.send([]);assert.equal(b.db[s.LIBRARY_KEY].entries.length,1);
 b.events.menu({menuItemId:'promptdock-save-selection',selectionText:'选中的文本'},{windowId:7});await b.send([]);assert.equal(b.db[s.LIBRARY_KEY].entries.length,1);
});
test('Worker rejects foreign senders and malformed stored data',async()=>{
 const b=background(),s=store();let reply=false;
 assert.equal(b.events.message({type:'promptdock.commit',changes:[]},{id:'other'},()=>{reply=true;}),undefined);assert.equal(reply,false);
 b.db[s.KEY]={corrupt:true};assert.equal((await b.send([])).ok,false);assert.deepEqual(b.db[s.KEY],{corrupt:true});
});
test('MV3 package uses local scripts, no API host permissions and blocks external connections',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));assert.equal(m.manifest_version,3);assert.equal(m.version,'1.4.1');assert.deepEqual(m.permissions,['storage','sidePanel','contextMenus']);assert.equal(m.host_permissions,undefined);assert.equal(m.optional_host_permissions,undefined);assert.ok(m.content_security_policy.extension_pages.includes("connect-src 'none'"));
 for(const file of ['index.html','sidepanel.html','library.html','window.html']){const html=fs.readFileSync(path.join(root,file),'utf8');assert.equal(/<script(?![^>]*src=)[^>]*>\s*\S/.test(html),false);}
 assert.ok(fs.existsSync(path.join(root,m.side_panel.default_path)));assert.ok(fs.existsSync(path.join(root,m.background.service_worker)));
});

test('Manifest exposes both store locales and every localized field resolves in each locale',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 const locales=fs.readdirSync(path.join(root,'_locales')).sort();
 assert.deepEqual(locales,['en_US','zh_CN']);assert.equal(m.default_locale,'zh_CN');
 assert.equal(m.name,'__MSG_extensionName__');assert.equal(m.description,'__MSG_extensionDescription__');
 const refs=[...JSON.stringify(m).matchAll(/__MSG_([A-Za-z0-9_]+)__/g)].map(x=>x[1]);
 for(const locale of locales){
  const messages=JSON.parse(fs.readFileSync(path.join(root,'_locales',locale,'messages.json'),'utf8'));
  for(const ref of refs)assert.ok(typeof messages[ref]?.message==='string'&&messages[ref].message.trim(),`${locale}: ${ref}`);
  assert.ok(messages.extensionName.message.length<=75);assert.ok(messages.extensionDescription.message.length<=132);
 }
 const en=JSON.parse(fs.readFileSync(path.join(root,'_locales/en_US/messages.json'),'utf8'));
 const zh=JSON.parse(fs.readFileSync(path.join(root,'_locales/zh_CN/messages.json'),'utf8'));
 assert.equal(en.extensionName.message,'PromptDock · Prompt Library');assert.equal(zh.extensionName.message,'PromptDock · 提示词仓');
});

test('Category changes and custom categories do not reset typed prompt content',()=>{
 const {api:a,elements:e}=appAPI();a.openModal();
 e.get('fieldTitle').value='测试提示词';e.get('fieldContent').value='已输入的内容';
 e.get('fieldCategory').value='图生视频';a.updateCategoryInput();
 assert.equal(a.selectedCategory(),'图生视频');assert.equal(e.get('customCategoryWrap').hidden,true);
 assert.equal(e.get('fieldCustomCategory').disabled,true);
 e.get('fieldCategory').value='';a.updateCategoryInput();e.get('fieldCustomCategory').value='  我的项目  ';
 assert.equal(a.selectedCategory(),'我的项目');assert.equal(e.get('customCategoryWrap').hidden,false);
 assert.equal(e.get('fieldCustomCategory').required,true);assert.equal(e.get('fieldContent').value,'已输入的内容');
 e.get('fieldCategory').value='角色设定';a.updateCategoryInput();assert.equal(a.selectedCategory(),'角色设定');
});
test('Closing after category changes opens in-page discard dialog without native confirm',()=>{
 const {api:a,elements:e}=appAPI();a.openModal();e.get('fieldCategory').value='文生图';
 a.closeModal();assert.equal(e.get('discardOverlay').hidden,false);assert.equal(e.get('editorOverlay').hidden,false);
 a.closeModal(true);assert.equal(e.get('editorOverlay').hidden,true);assert.equal(e.get('discardOverlay').hidden,true);
});

test('Explicit custom-category button flow accepts trimmed names and keeps prompt fields',()=>{
 const {api:a,elements:e}=appAPI();a.openModal();e.get('fieldTitle').value='短剧镜头';e.get('fieldContent').value='镜头内容';
 a.beginCustomCategory();assert.equal(e.get('fieldCategory').value,'');assert.equal(e.get('customCategoryWrap').hidden,false);
 e.get('fieldCustomCategory').value='  我的短剧  ';assert.equal(a.selectedCategory(),'我的短剧');
 assert.equal(e.get('fieldTitle').value,'短剧镜头');assert.equal(e.get('fieldContent').value,'镜头内容');
 a.state.entries=[a.normalize({...record('custom'),category:a.selectedCategory()})];a.openModal('custom');
 assert.equal(e.get('fieldCategory').value,'我的短剧');assert.ok(e.get('fieldCategory').innerHTML.includes('我的短剧'));
 assert.equal(e.get('customCategoryWrap').hidden,true);
});

function localStorageMock(){const db={};return {db,getItem:k=>db[k]??null,setItem:(k,v)=>{db[k]=v;},removeItem:k=>{delete db[k];}};}
const event={preventDefault(){}};
test('Saving a new prompt persists an atomic library and shows the new card',async()=>{
 const storage=localStorageMock(),{api:a,elements:e}=appAPI(storage);await a.persist(true);a.openModal();
 e.get('fieldTitle').value='保存测试';e.get('fieldContent').value='电影光影';
 a.state.scope='favorite';a.state.search='不存在';
 await a.onSave(event);const data=JSON.parse(storage.db['promptdock.library.v2']);
 assert.equal(data.entries[0].title,'保存测试');assert.equal(a.state.scope,'all');assert.equal(a.state.search,'');
 assert.equal(e.get('editorOverlay').hidden,true);assert.equal(a.filtered().length,1);
});
test('Storage-blocked preview can save for the session and explicitly discloses temporary retention',async()=>{
 const denied=()=>{const error=Error('Blocked sandbox storage');error.name='SecurityError';throw error;};
 const {api:a,elements:e}=appAPI({getItem:denied,setItem:denied});await a.persist(true);a.openModal();
 e.get('fieldTitle').value='临时保存';e.get('fieldContent').value='内容不丢失';await a.onSave(event);
 assert.equal((await a.store.get()).entries[0].title,'临时保存');assert.equal(e.get('sessionNotice').hidden,false);
 assert.ok(e.get('storageStatus').textContent.includes('暂存'));assert.equal(e.get('editorOverlay').hidden,true);
});
test('Quota failure leaves editor values intact, reports cause and can be retried',async()=>{
 const storage=localStorageMock(),{api:a,elements:e}=appAPI(storage);await a.persist(true);a.openModal();
 e.get('fieldTitle').value='待保存';e.get('fieldContent').value='重要内容';const good=storage.setItem;
 storage.setItem=()=>{const error=Error('空间不足');error.name='QuotaExceededError';throw error;};
 await a.onSave(event);assert.equal(e.get('editorOverlay').hidden,false);assert.equal(e.get('fieldContent').value,'重要内容');assert.ok(e.get('formError').textContent.includes('空间不足'));
 assert.equal(JSON.parse(storage.db['promptdock.library.v2']).entries.length,0);
 storage.setItem=good;await a.onSave(event);assert.equal(e.get('editorOverlay').hidden,true);
});
test('Empty categories persist, duplicate creation is rejected, and rename/delete preserves prompt content',async()=>{
 const storage=localStorageMock(),{api:a,elements:e}=appAPI(storage);await a.persist(true);a.openCategoryManager();
 e.get('categoryName').value='个人项目';await a.saveCategory(event);
 assert.ok(JSON.parse(storage.db['promptdock.library.v2']).categories.includes('个人项目'));
 assert.ok(a.categories().some(([name,count])=>name==='个人项目'&&count===0));
 e.get('categoryName').value='个人项目';await a.saveCategory(event);assert.ok(e.get('categoryError').textContent.includes('已经存在'));
 a.openModal();e.get('fieldTitle').value='项目提示词';e.get('fieldContent').value='保留原文';e.get('fieldCategory').value='个人项目';await a.onSave(event);
 a.startCategoryRename('个人项目');e.get('categoryName').value='水墨短片';await a.saveCategory(event);
 assert.equal(a.state.entries[0].category,'水墨短片');assert.equal(a.state.entries[0].content,'保留原文');assert.ok(!a.state.categoryNames.includes('个人项目'));
 a.requestCategoryDelete('水墨短片');await a.deleteCategory();assert.equal(a.state.entries[0].category,'通用');assert.equal(a.state.entries[0].content,'保留原文');assert.ok(!a.state.categoryNames.includes('水墨短片'));
 const restored=await a.store.get();assert.ok(!restored.categories.includes('水墨短片'));assert.equal(restored.entries[0].content,'保留原文');
});
test('Legacy v1 storage migrates without overwriting the old backup',async()=>{
 const storage=localStorageMock(),s=store();const legacy=[{...record('legacy'),category:'文生图'}];storage.db[s.KEY]=JSON.stringify(legacy);
 const {api:a}=appAPI(storage);const loaded=await a.store.get();assert.equal(loaded.entries[0].id,'legacy');
 assert.deepEqual(JSON.parse(storage.db[s.KEY]),legacy);
});
test('Category and prompt changes commit atomically and reject stale concurrent records',()=>{
 const s=store(),original={...record('a'),category:'旧分类'},current={entries:[original],categories:['旧分类','通用']};
 const renamed={...original,category:'新分类'};
 const next=s.mergeLibrary(current,s.diff([original],[renamed]),s.categoryDiff(current.categories,['新分类','通用']));
 assert.deepEqual(plain(next.categories).sort(),['通用','新分类'].sort());assert.equal(next.entries[0].category,'新分类');
 assert.throws(()=>s.mergeLibrary({entries:[{...original,content:'其他窗口修改'}],categories:current.categories},s.diff([original],[renamed]),s.categoryDiff(current.categories,['新分类','通用'])),/其他窗口/);
 assert.throws(()=>s.mergeLibrary(current,[],s.categoryDiff(current.categories,['通用'])),/分类仍包含/);
 assert.throws(()=>s.mergeLibrary({entries:[],categories:['通用']},[],[{name:'通用',before:true,after:false}]),/不能/);
});

test('Save button calls saving directly without native form submission; editing updates the same record',async()=>{
 const storage=localStorageMock(),{api:a,elements:e}=appAPI(storage);a.bind();await a.persist(true);a.openModal();
 e.get('fieldTitle').value='按钮保存';e.get('fieldContent').value='原文';
 await e.get('saveEntry').handlers.click(event);assert.equal(a.state.entries.length,1);
 const id=a.state.entries[0].id;a.openModal(id);e.get('fieldContent').value='更新内容';await e.get('saveEntry').handlers.click(event);
 assert.equal(a.state.entries.length,1);assert.equal(a.state.entries[0].id,id);assert.equal(JSON.parse(storage.db['promptdock.library.v2']).entries[0].content,'更新内容');
});

test('One preset supports all three walkthrough variables',()=>{
 const {api:a}=appAPI();const seeds=a.seeds();assert.equal(seeds.length,1);assert.deepEqual(plain(a.variableNames(seeds[0].content)),['主体','场景','光线']);
});
test('Legacy preset cleanup keeps user-created, edited, used and favorited records',()=>{
 const {api:a}=appAPI();const now=new Date().toISOString();const sample=a.LEGACY_PRESETS[0];
 const original=a.normalize({...sample,id:'pristine',createdAt:now,updatedAt:now});
 const edited={...original,id:'edited',content:'我的修改'},used={...original,id:'used',useCount:1},favorite={...original,id:'favorite',favorite:!original.favorite},mine=a.normalize(record('mine'));
 a.state.entries=[original,edited,used,favorite,mine];assert.equal(a.simplifyPresets(),true);
 assert.deepEqual(plain(a.state.entries.map(p=>p.id)).slice(0,4),['edited','used','favorite','mine']);assert.equal(a.state.entries.length,5);assert.equal(a.simplifyPresets(),false);
});
test('Short variable guide opens actual variable inputs without changing the template',()=>{
 const {api:a,elements:e}=appAPI();a.state.entries=a.seeds();const original=plain(a.state.entries);a.openTutorial();
 assert.equal(e.get('tutorialOverlay').hidden,false);a.practiceTutorial();assert.equal(e.get('tutorialOverlay').hidden,true);
 assert.equal(e.get('variablesOverlay').hidden,false);assert.equal(a.state.templateId,original[0].id);assert.deepEqual(plain(a.state.entries),original);
});
test('Toolbar action directly opens the independent window and does not auto-open sidebar',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),b=background();assert.equal(m.action.default_popup,undefined);assert.equal(typeof b.events.action,'function');assert.equal(b.calls.find(c=>c[0]==='behavior')[1].openPanelOnActionClick,false);
});
test('Independent window opens sidebar in the originating browser and then closes; edits block switching',async()=>{
 const calls=[],key='promptdock.window.target.v1';let changed;const chrome={storage:{local:{},session:{get:async()=>({[key]:7})},onChanged:{addListener:fn=>changed=fn}},runtime:{sendMessage:async msg=>{calls.push(['message',plain(msg)]);return {ok:true};}},windows:{update:async(id,options)=>calls.push(['focus',id,plain(options)])},sidePanel:{open:async options=>calls.push(['panel',plain(options)])}};
 const fixture=appAPI(undefined,{chrome,location:{protocol:'chrome-extension:'},window:{addEventListener(){},close(){calls.push(['close']);}},document:{body:{dataset:{mode:'extension',surface:'window'},style:{}},addEventListener(){},readyState:'complete',getElementById:id=>{if(!fixture.elements.has(id))fixture.elements.set(id,{hidden:true,addEventListener(){},focus(){},classList:{add(){},remove(){}}});return fixture.elements.get(id);},querySelectorAll:()=>[]}});
 const {api:a,elements:e}=fixture;a.bind();await Promise.resolve();e.get('editorOverlay').hidden=true;
 await a.openExtensionSurface('sidepanel');assert.deepEqual(calls,[['panel',{windowId:7}],['focus',7,{focused:true}],['close']]);calls.length=0;
 changed({[key]:{newValue:9}},'session');await a.openExtensionSurface('sidepanel');assert.equal(calls[0][1].windowId,9);calls.length=0;
 e.get('editorOverlay').hidden=false;await a.openExtensionSurface('sidepanel');assert.equal(calls.length,0);
});

test('Only one default category; upgrades remove unused old presets and preserve occupied and custom categories',()=>{
 const s=store();assert.deepEqual(plain(s.defaults),['通用']);
 const old={entries:[{...record('mine'),category:'文生图'}],categories:['通用','文生图','图生视频','其他','我的项目']};
 const read=s.readLibrary(old);assert.deepEqual(plain(read.categories),['通用','文生图','我的项目']);assert.equal(read.entries[0].category,'文生图');
 const saved=s.mergeLibrary(read,[],s.categoryDiff(read.categories,[...read.categories,'图生视频']));
 assert.ok(s.readLibrary(saved).categories.includes('图生视频'));assert.equal(old.categories.length,5);
});
test('Web selection saves into the single default category without creating another preset',async()=>{
 const b=background(),s=store();b.events.menu({menuItemId:'promptdock-save-selection',selectionText:'记录文本'},{windowId:7});await b.send([]);
 assert.equal(b.db[s.LIBRARY_KEY].entries[0].category,'通用');assert.deepEqual(b.db[s.LIBRARY_KEY].categories,['通用']);assert.ok(b.db[s.LIBRARY_KEY].entries[0].tags.includes('网页摘录'));
});

test('Previously generated variable templates remain usable and retain metadata through editing',async()=>{
 const storage=localStorageMock(),{api:a,elements:e}=appAPI(storage);const p=a.normalize({id:'retained-template',title:'真人三视图',category:'我的项目',content:'为{{角色名称}}制作真人写实三视图。',variables:[{name:'角色名称',description:'角色名字或身份',example:'年轻的侦探'}],tags:['角色'],favorite:true,useCount:3});
 a.state.entries=[p];a.state.categoryNames.push('我的项目');await a.persist(true);
 assert.equal(JSON.parse(storage.db['promptdock.library.v2']).entries[0].variables[0].name,'角色名称');a.openVariables(p.id);assert.ok(e.get('variableFields').innerHTML.includes('例如：年轻的侦探'));
 a.state.templateFields['角色名称']='Lila';assert.equal(a.filledContent(p),'为Lila制作真人写实三视图。');assert.equal(p.content,'为{{角色名称}}制作真人写实三视图。');
 a.openModal(p.id);e.get('fieldContent').value+='\n保持全身完整';await a.onSave(event);assert.equal(a.state.entries[0].id,p.id);assert.equal(a.state.entries[0].variables.length,1);assert.equal(a.state.entries[0].favorite,true);assert.equal(a.state.entries[0].category,'我的项目');
});

test('Packaged source has no model client, AI dialogs, outbound request code or permission requests',()=>{
 assert.equal(fs.existsSync(path.join(root,'ai.js')),false);
 for(const name of ['app.js','store.js','background.js','privacy.js','floating.js']){const src=fs.readFileSync(path.join(root,name),'utf8');assert.equal(/PromptDockAI|aiOverlay|aiSettingsOverlay|\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|permissions\.request/.test(src),false,name);}
 for(const name of ['index.html','sidepanel.html','library.html','window.html']){const html=fs.readFileSync(path.join(root,name),'utf8');assert.ok(!html.includes('ai.js'));for(const src of [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]))assert.ok(fs.existsSync(path.join(root,src)),src);}
 assert.ok(fs.readFileSync(path.join(root,'index.html'),'utf8').includes("connect-src 'none'"));
});

test('Object key order changes do not create edits or false favorite conflicts',()=>{
 const s=store(),before={...record('p'),favorite:false,updatedAt:'2026-10-12T06:00:00Z',variables:[{name:'角色',description:'名称',example:'侦探'}]},reordered=Object.fromEntries(Object.entries(before).reverse());reordered.variables=[Object.fromEntries(Object.entries(before.variables[0]).reverse())];
 assert.deepEqual(plain(s.diff([before],[reordered])),[]);const saved=s.merge([reordered],s.diff([before],[{...before,favorite:true,updatedAt:'2026-10-12T06:01:00Z'}]));assert.equal(saved[0].favorite,true);
});
test('Favorite-only updates merge with current content and copy count without overwriting them',()=>{
 const s=store(),before={...record('p'),favorite:false,useCount:0,updatedAt:'2026-10-12T06:00:00Z'},latest={...before,content:'其他窗口编辑后的正文',useCount:3,usedAt:'2026-10-12T06:02:00Z',updatedAt:'2026-10-12T06:02:00Z'},after={...before,favorite:true,updatedAt:'2026-10-12T06:01:00Z'};
 const saved=s.merge([latest],s.diff([before],[after]))[0];assert.equal(saved.favorite,true);assert.equal(saved.content,latest.content);assert.equal(saved.useCount,3);assert.equal(saved.usedAt,latest.usedAt);assert.equal(saved.updatedAt,latest.updatedAt);
 assert.throws(()=>s.merge([],s.diff([before],[after])),/其他窗口/);assert.throws(()=>s.merge([latest],s.diff([before],[{...after,content:'过期正文的新编辑'}])),/其他窗口/);
});
test('Favorite click saves after storage key reordering and after a concurrent copy update',async()=>{
 const storage=localStorageMock(),{api:a}=appAPI(storage);const p=a.normalize({...record('p'),favorite:false,useCount:0});a.state.entries=[p];await a.persist(true);
 const data=JSON.parse(storage.db['promptdock.library.v2']);data.entries[0]=Object.fromEntries(Object.entries(data.entries[0]).reverse());data.entries[0].useCount=4;data.entries[0].usedAt='2026-10-12T06:02:00Z';storage.db['promptdock.library.v2']=JSON.stringify(data);
 await a.toggleFavorite(p.id);const saved=JSON.parse(storage.db['promptdock.library.v2']).entries[0];assert.equal(saved.favorite,true);assert.equal(saved.useCount,4);assert.equal(a.state.entries[0].useCount,4);await a.toggleFavorite(p.id);assert.equal(a.state.entries[0].favorite,false);
});
test('Window pin UI changes only after success and reports failed activation without a fake pinned state',async()=>{
 const fixture=appAPI(undefined,{chrome:{storage:{local:{}}},location:{protocol:'chrome-extension:'},document:{body:{dataset:{mode:'extension',surface:'window'},style:{},addEventListener(){}},readyState:'complete',removeEventListener(){},addEventListener(){},getElementById:id=>{if(!fixture.elements.has(id))fixture.elements.set(id,{textContent:'',hidden:true,classList:{add(){},remove(){},toggle(){}},setAttribute(name,value){this[name]=value;}});return fixture.elements.get(id);},querySelectorAll:()=>[]}});
 const {api:a,floating:f,document:d,window:w,elements:e}=fixture;let pinned=false,fail=true;
 f.create=options=>({pending:false,toggle:async()=>{if(fail)throw Error('Unsupported');pinned=!pinned;options.onChange({window:w,document:d,pinned});}});
 await a.togglePinnedWindow();assert.ok(e.get('toast').innerHTML.includes('Unsupported'));assert.equal(e.get('pinWindow'),undefined);
 fail=false;await a.togglePinnedWindow();assert.equal(e.get('pinWindow').textContent,'取消置顶');assert.equal(e.get('pinWindow')['aria-pressed'],'true');await a.togglePinnedWindow();assert.equal(e.get('pinWindow').textContent,'置顶');assert.equal(e.get('pinWindow')['aria-pressed'],'false');
});

test('English interface and guide render without untranslated UI text while user prompt text is preserved',()=>{
 const {api:a,elements:e}=appAPI();a.applyPreferences({language:'en',theme:'dark'});a.markup();a.openTutorial();
 for(const id of ['app','tutorialBody']){const html=e.get(id).innerHTML;assert.equal(/[\u3400-\u9fff]/.test(html.replace(/<[^>]*>/g,'').replace(/中文/g,'')),false,id);assert.equal(/(?<![\w-])(?:title|aria-label|placeholder)="[^"\n]*[\u3400-\u9fff]/.test(html),false,id);}
 a.state.entries=[a.normalize({id:'mine',title:'新建提示词',description:'保存提示词',content:'保持中文正文 {{角色}}',category:'我的项目',tags:['复制']})];a.renderCards();const html=e.get('cards').innerHTML;assert.ok(html.includes('新建提示词'));assert.ok(html.includes('保持中文正文 {{角色}}'));assert.ok(html.includes('我的项目'));assert.ok(html.includes('Copy'));
});
test('Switching language and theme preserves editor values, categories, variable inputs and library bytes',async()=>{
 const storage=localStorageMock(),{api:a,elements:e,ui}=appAPI(storage);await a.persist(true);a.openModal();e.get('fieldTitle').value='我的人物';e.get('fieldContent').value='描述 {{角色}}';e.get('fieldCustomCategory').value='新建分类';const library=storage.db['promptdock.library.v2'];a.state.templateFields['角色']='Lila';
 await a.changePreferences({language:'en',theme:'dark'});assert.equal(e.get('fieldTitle').value,'我的人物');assert.equal(e.get('fieldContent').value,'描述 {{角色}}');assert.equal(e.get('fieldCustomCategory').value,'新建分类');assert.equal(a.state.templateFields['角色'],'Lila');assert.equal(storage.db['promptdock.library.v2'],library);assert.deepEqual(JSON.parse(storage.db[ui.KEY]),{language:'en',theme:'dark'});
 await a.changePreferences({language:'zh',theme:'light'});assert.equal(e.get('fieldContent').value,'描述 {{角色}}');assert.equal(e.get('editorTitle').textContent,'新建提示词');
});
test('Rapid presentation changes persist the final combined choice in order',async()=>{
 const storage=localStorageMock(),{api:a,ui}=appAPI(storage);await Promise.all([a.changePreferences({language:'en'}),a.changePreferences({theme:'dark'})]);assert.deepEqual(JSON.parse(storage.db[ui.KEY]),{language:'en',theme:'dark'});
});
test('Preference storage events update another window without replacing its draft',()=>{
 let onChange;const fixture=appAPI(undefined,{chrome:{storage:{local:{},onChanged:{addListener:fn=>onChange=fn}},windows:{getCurrent:async()=>({id:7})}},location:{protocol:'chrome-extension:'}});const {api:a,elements:e}=fixture;a.bind();a.openModal();e.get('fieldContent').value='别的窗口切换时保留';
 onChange({'promptdock.ui.v1':{newValue:{language:'en',theme:'dark'}}},'local');assert.equal(e.get('fieldContent').value,'别的窗口切换时保留');assert.equal(e.get('editorTitle').textContent,'New prompt');
});
