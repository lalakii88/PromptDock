/* Shared, local-only storage. All extension writes run in the service worker. */
(() => {
  'use strict';
  const KEY = 'promptdock.entries.v1';
  // Storage/message serialization may reorder object keys; order is not a data edit.
  function equal(a,b) {
    if(a===b)return true;
    if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
    if(Array.isArray(a))return a.length===b.length&&a.every((value,index)=>equal(value,b[index]));
    const keys=Object.keys(a);
    return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&equal(a[key],b[key]));
  }
  function favoriteOnly(change) {
    const {before,after}=change;
    if(!before||!after||typeof before.favorite!=='boolean'||typeof after.favorite!=='boolean'||before.favorite===after.favorite)return false;
    const rest=obj=>Object.fromEntries(Object.entries(obj).filter(([key])=>key!=='favorite'&&key!=='updatedAt'));
    return equal(rest(before),rest(after));
  }
  function merge(current, changes) {
    if (!Array.isArray(current) || !Array.isArray(changes) || changes.length > 5000) throw Error('无效的保存请求');
    const next = current.map(p=>({...p}));
    const seen = new Set();
    for (const change of changes) {
      if (!change || typeof change.id !== 'string' || seen.has(change.id)) throw Error('无效的记录');
      seen.add(change.id);
      const index = next.findIndex(p=>p.id===change.id);
      const previous = index < 0 ? null : next[index];
      const changed=!equal(previous,change.before),favoriteMerge=changed&&previous&&favoriteOnly(change);
      if (changed&&!favoriteMerge) throw Error('这条提示词已在其他窗口更新，请重新打开后再修改');
      if (change.after === null) { if(index>=0)next.splice(index,1); }
      else {
        const p = change.after;
        if (p.id !== change.id || typeof p.title !== 'string' || !p.title.trim() || p.title.length>150 || typeof p.content !== 'string' || !p.content.trim() || p.content.length>30000 || !Array.isArray(p.tags)) throw Error('记录格式或长度不正确');
        if(favoriteMerge)next[index]={...previous,favorite:p.favorite,updatedAt:Date.parse(previous.updatedAt)>Date.parse(p.updatedAt)?previous.updatedAt:p.updatedAt};
        else if(index>=0)next[index]=p; else next.unshift(p);
      }
    }
    return next;
  }
  function diff(before, after) {
    const old = new Map(before.map(p=>[p.id,p]));
    const fresh = new Map(after.map(p=>[p.id,p]));
    return [...new Set([...old.keys(),...fresh.keys()])].flatMap(id=>equal(old.get(id)||null,fresh.get(id)||null)?[]:[{id,before:old.get(id)||null,after:fresh.get(id)||null}]);
  }
  globalThis.PromptDockStore = {KEY, merge, diff};
})();
/* v2 adds independently saved, including empty, categories. Legacy v1 is read-only. */
(() => {
  const S=PromptDockStore;
  const LIBRARY_KEY='promptdock.library.v2';
  const defaults=['通用'];
  const oldDefaults=['文生图','图生视频','角色设定','场景设计','镜头语言','剧本创作','网页摘录','其他'];
  function library(entries,categories,presetVersion=0) {
    const occupied=new Set(entries.map(p=>p.category||'通用'));
    const kept=presetVersion===1?categories:categories.filter(name=>!oldDefaults.includes(name)||occupied.has(name));
    return {entries,categories:[...new Set([...defaults,...kept,...occupied])],categoryPresetVersion:1};
  }
  function readLibrary(current,legacy) {
    if(current===undefined){
      if(legacy===undefined)return undefined;
      if(!Array.isArray(legacy))throw Error('原始提示词存储损坏，未覆盖');
      return library(legacy,legacy.map(p=>p.category||'通用'));
    }
    if(!current||!Array.isArray(current.entries)||!Array.isArray(current.categories)||current.categories.some(n=>typeof n!=='string'||!n.trim()||n.length>28)||new Set(current.categories).size!==current.categories.length)throw Error('提示词库格式损坏，未覆盖');
    return library(current.entries,current.categories,current.categoryPresetVersion);
  }
  function categoryDiff(before,after){return [...new Set([...before,...after])].flatMap(name=>before.includes(name)===after.includes(name)?[]:[{name,before:before.includes(name),after:after.includes(name)}]);}
  function mergeLibrary(current,changes,categoryChanges=[]) {
    const entries=S.merge(current.entries,changes),categories=[...current.categories];
    if(!Array.isArray(categoryChanges)||categoryChanges.length>1000)throw Error('无效分类请求');
    const seen=new Set();
    for(const op of categoryChanges){
      if(!op||typeof op.name!=='string'||!op.name.trim()||op.name.length>28||typeof op.before!=='boolean'||typeof op.after!=='boolean'||seen.has(op.name))throw Error('无效分类名称');
      seen.add(op.name);
      if(op.name==='通用'&&!op.after)throw Error('通用是默认归档分类，不能删除或重命名');
      const index=categories.indexOf(op.name);
      if((index>=0)!==op.before)throw Error('分类已在其他窗口修改，请重新打开分类管理');
      if(op.after&&index<0)categories.push(op.name);else if(!op.after&&index>=0)categories.splice(index,1);
    }
    // An uncategorized legacy row maps to the default bucket.
    for(const entry of entries)if(!categories.includes(entry.category||'通用'))throw Error('分类仍包含其他窗口新增的提示词，请刷新后重试');
    return {entries,categories,categoryPresetVersion:1};
  }
  Object.assign(S,{LIBRARY_KEY,defaults,readLibrary,categoryDiff,mergeLibrary});
})();
