'use strict';
importScripts('ui.js','store.js','privacy.js');
PromptDockPrivacy.clearLegacySettings({extension:true});
const {KEY, LIBRARY_KEY, readLibrary, mergeLibrary, defaults} = PromptDockStore;
const MENU_ID = 'promptdock-save-selection';
let nativeLanguage='zh';
function updateNativeLanguage(settings) {
  nativeLanguage=PromptDockUI.normalize(settings).language;
  chrome.action.setTitle({title:PromptDockUI.translate('PromptDock · 打开独立小窗',nativeLanguage)}).catch(()=>{});
  chrome.contextMenus.update?.(MENU_ID,{title:PromptDockUI.translate('保存选中文本到 PromptDock',nativeLanguage)},()=>{void chrome.runtime.lastError;});
}
PromptDockUI.load({extension:true}).then(updateNativeLanguage);
chrome.storage.onChanged?.addListener((changes,area)=>{if(area==='local'&&changes[PromptDockUI.KEY])updateNativeLanguage(changes[PromptDockUI.KEY].newValue);});
const WINDOW_TARGET_KEY='promptdock.window.target.v1';
let floatingWindowId=null,windowQueue=Promise.resolve();
function openFloatingWindow(browserWindowId) {
  const task=windowQueue.catch(()=>{}).then(async()=>{
    const url=chrome.runtime.getURL('window.html');
    if(floatingWindowId!==null){try{await chrome.windows.get(floatingWindowId);}catch{floatingWindowId=null;}}
    if(floatingWindowId===null){
      const contexts=await chrome.runtime.getContexts({});
      const existing=contexts.find(c=>c.documentUrl===url&&c.windowId>=0);
      if(existing)floatingWindowId=existing.windowId;
    }
    if(Number.isInteger(browserWindowId)&&browserWindowId>=0)await chrome.storage.session.set({[WINDOW_TARGET_KEY]:browserWindowId});
    if(floatingWindowId!==null){
      await chrome.windows.update(floatingWindowId,{focused:true,state:'normal'});
      return {id:floatingWindowId,reused:true};
    }
    const created=await chrome.windows.create({url,type:'popup',width:440,height:720});
    floatingWindowId=created.id;
    return {id:created.id,reused:false};
  });
  windowQueue=task;
  return task;
}
chrome.action.onClicked.addListener(tab=>{
  openFloatingWindow(tab?.windowId).catch(error=>{
    console.warn('PromptDock window failed:',error);
    chrome.action.setBadgeText({text:'!'});
    chrome.action.setTitle({title:PromptDockUI.translate('小窗打开失败，请重新加载扩展后重试',nativeLanguage)});
  });
});
let queue = Promise.resolve();
function serialized(task) { const result = queue.catch(()=>{}).then(task); queue=result; return result; }
function configurePanel() {
  if (!chrome.sidePanel?.setPanelBehavior) return;
  chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:false}).catch(console.warn);
}
chrome.runtime.onInstalled.addListener(()=>{
  PromptDockPrivacy.clearLegacySettings({extension:true});
  chrome.contextMenus.removeAll(()=>{
    chrome.contextMenus.create({id:MENU_ID,title:PromptDockUI.translate('保存选中文本到 PromptDock',nativeLanguage),contexts:['selection']},()=>{
      if(chrome.runtime.lastError)console.warn(chrome.runtime.lastError.message);
    });
  });
  configurePanel();
});
configurePanel();
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(sender.id!==chrome.runtime.id)return;
  if(message?.type==='promptdock.open-window'){
    openFloatingWindow(message.browserWindowId).then(window=>reply({ok:true,window}),error=>reply({ok:false,error:error.message}));
    return true;
  }
  if(message?.type!=='promptdock.commit')return;
  serialized(async()=>{
    const stored=await chrome.storage.local.get([LIBRARY_KEY,KEY]);
    const current=readLibrary(stored[LIBRARY_KEY],stored[KEY]);
    if(message.initialize && current!==undefined)return current;
    const next=mergeLibrary(current||{entries:[],categories:defaults},message.changes,message.categoryChanges);
    await chrome.storage.local.set({[LIBRARY_KEY]:next});
    return next;
  }).then(entries=>reply({ok:true,entries}),error=>reply({ok:false,error:error.message}));
  return true;
});
function openPanel(tab) {
  // Call synchronously from the user gesture, before any storage await.
  if(tab?.windowId!==undefined && chrome.sidePanel?.open) {
    chrome.sidePanel.open({windowId:tab.windowId}).catch(console.warn);
  } else chrome.tabs.create({url:chrome.runtime.getURL('library.html')});
}
chrome.commands.onCommand.addListener((command,tab)=>{if(command==='open-promptdock')openPanel(tab);});
chrome.contextMenus.onClicked.addListener((info,tab)=>{
  if(info.menuItemId!==MENU_ID || !info.selectionText?.trim())return;
  openPanel(tab);
  serialized(async()=>{
    const raw=await chrome.storage.local.get([LIBRARY_KEY,KEY]);
    const current=readLibrary(raw[LIBRARY_KEY],raw[KEY])||{entries:[],categories:[...defaults]};
    const list=current.entries, content=info.selectionText.trim().slice(0,30000);
    if(list.some(p=>p.content?.trim().toLowerCase()===content.toLowerCase()))return;
    const now=new Date().toISOString();
    list.unshift({id:crypto.randomUUID(),title:content.split(/\n/).find(Boolean).trim().slice(0,46),description:'从网页选中文本保存',content,category:'通用',tags:['网页摘录'],favorite:false,createdAt:now,updatedAt:now,usedAt:null,useCount:0});
    await chrome.storage.local.set({[LIBRARY_KEY]:current});
  }).catch(error=>{
    console.warn('PromptDock save failed:',error);
    chrome.action.setBadgeText({text:'!'});
    chrome.action.setTitle({title:PromptDockUI.translate('保存失败，请打开提示词仓检查存储并重试',nativeLanguage)});
  });
});
