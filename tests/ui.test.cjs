'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function api(globals={}){const ctx=vm.createContext(globals);vm.runInContext(fs.readFileSync(path.join(__dirname,'../extension/ui.js'),'utf8'),ctx);return ctx.PromptDockUI;}
test('UI preferences whitelist language and theme and do not persist unrelated fields',async()=>{
 const db={},a=api({localStorage:{getItem:k=>db[k]||null,setItem:(k,v)=>db[k]=v}});await a.save({language:'en',theme:'dark',apiKey:'NEVER-PERSIST',entries:[{title:'mine'}]});assert.deepEqual(JSON.parse(db[a.KEY]),{language:'en',theme:'dark'});assert.equal(JSON.stringify(db).includes('NEVER-PERSIST'),false);assert.equal((await a.load()).language,'en');assert.equal(a.normalize({language:'script',theme:'<img>'}).theme,'light');
});
test('Extension UI preferences use their own durable key and read back both choices',async()=>{
 const db={'promptdock.library.v2':'KEEP'},a=api({chrome:{storage:{local:{get:async k=>({[k]:db[k]}),set:async v=>Object.assign(db,v)}}}});await a.save({language:'en',theme:'dark'},{extension:true});const saved=await a.load({extension:true});assert.equal(saved.theme,'dark');assert.equal(saved.language,'en');assert.equal(db['promptdock.library.v2'],'KEEP');
});
test('Storage denial defaults safely and save failure remains observable',async()=>{
 const a=api({localStorage:{getItem(){throw Error('Denied');},setItem(){throw Error('Quota');}}});assert.equal((await a.load()).language,'zh');await assert.rejects(a.save({theme:'dark'}),/Quota/);
});
test('Static fragments translate accessible attributes and annotate only known interface text',()=>{
 const a=api(),html=a.fragment('<button title="编辑">新建提示词</button><input placeholder="例如：电影感特写镜头">',{language:'en',html:true});assert.ok(html.includes('title="Edit"'));assert.ok(html.includes('>New prompt</span>'));assert.ok(html.includes('placeholder="e.g. Cinematic close-up"'));assert.ok(html.includes('data-i18n="新建提示词"'));assert.equal(a.translate('__proto__','en'),'__proto__');assert.equal(a.translate('未知用户内容','en'),'未知用户内容');
 const option=a.fragment('<option value="zh">最近更新</option>',{language:'en',html:true});assert.equal(option.includes('<span'),false);assert.ok(option.includes('Recently updated'));
});
test('Applying preferences updates marked controls and theme without touching user input',()=>{
 const a=api(),marked={textContent:'新建提示词',getAttribute:()=> '新建提示词'},attr={value:'用户未保存输入',attrs:{'data-i18n-placeholder':'这个提示词适合什么场景？'},getAttribute(k){return this.attrs[k];},setAttribute(k,v){this.attrs[k]=v;}},theme={setAttribute(k,v){this[k]=v;}},language={value:'zh'};
 const d={body:{dataset:{}},documentElement:{dataset:{},style:{}},querySelectorAll:q=>q==='[data-i18n]'?[marked]:q==='[data-i18n-placeholder]'?[attr]:[],getElementById:id=>id==='uiTheme'?theme:id==='uiLanguage'?language:null};
 a.apply(d,{language:'en',theme:'dark'});assert.equal(d.documentElement.lang,'en');assert.equal(d.documentElement.dataset.theme,'dark');assert.equal(d.documentElement.style.colorScheme,'dark');assert.equal(marked.textContent,'New prompt');assert.equal(attr.attrs.placeholder,'What is this prompt useful for?');assert.equal(attr.value,'用户未保存输入');assert.equal(theme.textContent,'Light mode');assert.equal(theme['aria-pressed'],'true');
 a.apply(d,{language:'zh',theme:'light'});assert.equal(marked.textContent,'新建提示词');assert.equal(attr.value,'用户未保存输入');assert.equal(theme.textContent,'夜间模式');
});
test('Dark palette has readable body and secondary text contrast',()=>{
 const luminance=hex=>{const rgb=hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};const ratio=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
 assert.ok(ratio('edf2e9','1d2520')>=4.5);assert.ok(ratio('a7b3a7','253029')>=4.5);assert.ok(ratio('182016','c1e780')>=4.5);const css=fs.readFileSync(path.join(__dirname,'../extension/styles.css'),'utf8');for(const selector of ['.dialog','.pin-placeholder','textarea','.form-error'])assert.ok(css.includes(selector));assert.ok(css.includes('[data-theme="dark"]'));
});
