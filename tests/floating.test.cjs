'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function api(){const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../extension/floating.js'),'utf8'),ctx);return ctx.PromptDockFloating;}
class Element {
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.parentNode=null;this.dataset={};this.style={};this.events={};this.textContent='';}
 append(...nodes){nodes.forEach(n=>this.appendChild(n));}
 appendChild(node){return this.insertBefore(node,null);}
 insertBefore(node,before){node.remove();const i=before?this.children.indexOf(before):this.children.length;if(i<0)throw Error('Invalid reference');this.children.splice(i,0,node);node.parentNode=this;const adopt=n=>{n.ownerDocument=this.ownerDocument;n.children.forEach(adopt);};adopt(node);return node;}
 remove(){if(this.parentNode){const a=this.parentNode.children;a.splice(a.indexOf(this),1);this.parentNode=null;}}
 addEventListener(name,fn){this.events[name]=fn;}
 cloneNode(){const node=new Element(this.tagName,this.ownerDocument);Object.assign(node,{textContent:this.textContent,href:this.href,rel:this.rel});return node;}
}
function doc(){const d={title:'',querySelectorAll:()=>d.styles,createElement:tag=>new Element(tag,d),styles:[]};d.documentElement=new Element('html',d);d.head=new Element('head',d);d.body=new Element('body',d);return d;}
function setup(request){const source=doc(),target=doc(),events={},calls=[];source.body.dataset={mode:'extension',surface:'window'};const root=new Element('div',source),input=new Element('input',source);input.value='尚未保存的正文';root.appendChild(input);source.body.appendChild(root);const css=new Element('link',source);css.rel='stylesheet';css.href='chrome-extension://test/styles.css';source.styles=[css];const pip={document:target,closed:false,addEventListener:(n,f)=>events[n]=f,close(){this.closed=true;events.pagehide?.();}};const host={document:source,focus:()=>calls.push('focus'),documentPictureInPicture:{requestWindow:options=>{calls.push(options);return request?request(pip):Promise.resolve(pip);}}};return {source,target,root,input,pip,host,calls,events};}
test('Pin request is synchronous from click and moves the original DOM with draft and listeners intact',async()=>{
 const s=setup(),changes=[],controller=api().create({sourceWindow:s.host,root:s.root,onChange:c=>changes.push(c)});let clicks=0;s.input.addEventListener('click',()=>clicks++);const pending=controller.toggle();assert.equal(s.calls.length,1);assert.equal(controller.pending,true);await pending;
 assert.equal(controller.pinned,true);assert.equal(s.root.ownerDocument,s.target);assert.equal(s.input.value,'尚未保存的正文');s.input.events.click();assert.equal(clicks,1);assert.equal(s.target.head.children[0].href,'chrome-extension://test/styles.css');assert.equal(s.target.body.dataset.pinned,'true');assert.equal(changes[0].document,s.target);
});
test('Closing PiP restores the same DOM and draft to its source without initializing a second app',async()=>{
 const s=setup(),changes=[],c=api().create({sourceWindow:s.host,root:s.root,onChange:x=>changes.push(x)});await c.toggle();s.input.value='浮窗里修改的正文';s.events.pagehide();assert.equal(c.pinned,false);assert.equal(s.root.parentNode,s.source.body);assert.equal(s.input.value,'浮窗里修改的正文');assert.equal(s.source.body.children.length,1);assert.equal(changes.at(-1).document,s.source);
});
test('Explicit unpin and return button restore the source and close PiP',async()=>{
 for(const byButton of [false,true]){const s=setup(),c=api().create({sourceWindow:s.host,root:s.root});await c.toggle();if(byButton)s.source.body.children[0].children[2].events.click();else await c.toggle();assert.equal(c.pinned,false);assert.equal(s.pip.closed,true);assert.equal(s.root.parentNode,s.source.body);assert.equal(s.source.body.children.length,1);}
});
test('Unsupported or denied APIs leave the original app untouched and do not fake pinning',async()=>{
 const s=setup();delete s.host.documentPictureInPicture;const c=api().create({sourceWindow:s.host,root:s.root});await assert.rejects(c.toggle(),/不支持/);assert.equal(c.pinned,false);assert.equal(s.root.parentNode,s.source.body);
 const denied=setup(()=>Promise.reject(Object.assign(Error('Denied'),{name:'NotAllowedError'}))),d=api().create({sourceWindow:denied.host,root:denied.root});await assert.rejects(d.toggle(),/Denied/);assert.equal(d.pending,false);assert.equal(d.pinned,false);assert.equal(denied.source.body.children.length,1);
});
test('Double-click during pending activation makes exactly one browser request',async()=>{
 let resolve;const s=setup(pip=>new Promise(r=>resolve=()=>r(pip))),c=api().create({sourceWindow:s.host,root:s.root});const first=c.toggle();assert.equal(await c.toggle(),false);assert.equal(s.calls.length,1);resolve();await first;assert.equal(c.pinned,true);c.close();
});
test('Setup failure restores the original app and closes the partial PiP window',async()=>{
 const s=setup(),c=api().create({sourceWindow:s.host,root:s.root,onChange:x=>{if(x.pinned)throw Error('Render failed');}});await assert.rejects(c.toggle(),/Render failed/);assert.equal(c.pinned,false);assert.equal(c.pending,false);assert.equal(s.root.parentNode,s.source.body);assert.equal(s.pip.closed,true);assert.equal(s.source.body.children.length,1);
});
test('Pinned windows inherit language and dark theme, and source labels refresh without losing the draft',async()=>{
 const s=setup();s.source.documentElement.lang='en';s.source.documentElement.dataset.theme='dark';let language='en';const c=api().create({sourceWindow:s.host,root:s.root,translate:text=>language==='en'?'English: '+text:text});await c.toggle();assert.equal(s.target.documentElement.lang,'en');assert.equal(s.target.documentElement.dataset.theme,'dark');assert.ok(s.source.body.children[0].children[0].textContent.startsWith('English:'));
 language='zh';c.refresh();assert.equal(s.source.body.children[0].children[0].textContent,'置顶浮窗已开启');assert.equal(s.input.value,'尚未保存的正文');c.close();assert.equal(s.root.parentNode,s.source.body);
});
