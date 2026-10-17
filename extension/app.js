/* PromptDock 1.4.1 — offline-first prompt library. No remote services required. */
(() => {
  function boot() {
  'use strict';
  let document=globalThis.document,window=globalThis.window,navigator=globalThis.navigator;
  let floatingController=null,keyHandler=null;
  let preferences=PromptDockUI.normalize(),preferenceWrites=0,preferenceQueue=Promise.resolve();
  const tr=text=>PromptDockUI.translate(text,preferences.language);
  const uiHTML=html=>PromptDockUI.fragment(html,{language:preferences.language,html:true});
  const uiFragment=(raw,html,inTag,inOption)=>PromptDockUI.fragment(raw,{language:preferences.language,html,inTag,inOption});
  const categoryLabel=name=>name==='通用'?tr('通用'):name;
  const KEY = 'promptdock.entries.v1';
  const LIBRARY_KEY=PromptDockStore.LIBRARY_KEY;
  const WINDOW_TARGET_KEY='promptdock.window.target.v1';
  const MODE = document.body?.dataset.mode || 'preview';
  const HAS_EXTENSION_STORAGE = location.protocol === 'chrome-extension:' && typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  const DAYS = 24 * 60 * 60 * 1000;
  const FIXED_CATEGORIES = ['通用'];
  const I = {
    search:'<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4.5 4.5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    star:'<path d="m12 2.8 2.86 5.8 6.4.93-4.63 4.52 1.1 6.36L12 17.4l-5.73 3.01 1.1-6.36-4.63-4.52 6.4-.93L12 2.8Z"/>',
    edit:'<path d="M12 20h9M15.5 4.5l4 4L9 19l-5 1 1-5L15.5 4.5Z"/><path d="m13.5 6.5 4 4"/>',
    close:'<path d="M18 6 6 18M6 6l12 12"/>',
    all:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    down:'<path d="m6 9 6 6 6-6"/>',
    tag:'<path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7.5" cy="7.5" r="1"/>',
    spark:'<path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3ZM19 18v4M17 20h4"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v3h16v-3"/>',
    upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"/>',
    trash:'<path d="M4 7h16M10 7V4h4v3m-8 0 1 13h10l1-13M10 11v5M14 11v5"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    layout:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3V7Z"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    layers:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    variables:'<path d="M8 4H5v16h3M16 4h3v16h-3M10 8l4 8M14 8l-4 8"/>',
    share:'<path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/>'
  };
  const icon = (name, cls='') => `<svg class="icon ${cls}" aria-hidden="true" viewBox="0 0 24 24">${I[name] || I.spark}</svg>`;
  const h = (value) => String(value ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const uid = () => (globalThis.crypto?.randomUUID?.() || `p${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const cleanTags = (value) => [...new Set((Array.isArray(value) ? value : String(value||'').split(/[,，、\n]+/)).map(x=>String(x).trim().slice(0,25)).filter(Boolean))].slice(0,15);
  const dateShort = (iso) => { const d = new Date(iso); return isNaN(d) ? tr('刚刚') : `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`; };
  const normalize = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    if(typeof obj.title!=='string'||typeof obj.content!=='string')return null;
    const title = String(obj.title||'').trim().slice(0,150);
    const content = String(obj.content||'').trim().slice(0,30000);
    if (!title || !content) return null;
    const createdAt = !isNaN(Date.parse(obj.createdAt)) ? obj.createdAt : new Date().toISOString();
    return {
      id: String(obj.id||uid()).slice(0,100), title,
      description:String(obj.description||'').trim().slice(0,750), content,
      category:String(obj.category||'通用').trim().slice(0,28) || '通用', tags:cleanTags(obj.tags),
      ...(Array.isArray(obj.variables)?{variables:obj.variables.filter(v=>v&&typeof v.name==='string'&&typeof v.description==='string'&&typeof v.example==='string').slice(0,18).map(v=>({name:v.name.slice(0,40),description:v.description.slice(0,200),example:v.example.slice(0,1200)}))}:{}),
      favorite:obj.favorite === true, createdAt,
      updatedAt:!isNaN(Date.parse(obj.updatedAt)) ? obj.updatedAt : createdAt,
      usedAt:obj.usedAt && !isNaN(Date.parse(obj.usedAt)) ? obj.usedAt : null,
      useCount:Number.isFinite(Number(obj.useCount)) ? Math.max(0, Math.min(999999,Math.trunc(Number(obj.useCount)))) : 0
    };
  };

  function seeds() {
    const now=new Date().toISOString();
    return [normalize({id:uid(),title:'示例：电影感场景模板',category:'通用',tags:['示例','模板'],favorite:true,
      description:'唯一预设示例。点击「填写模板变量」，换上你的主体、场景和光线。',
      content:'为{{主体}}创作一张电影感画面。\n场景：{{场景}}。光线：{{光线}}。\n构图清晰，前中后景有层次，材质自然，主体突出，整体色彩协调。无文字、字幕、水印或品牌标志。',
      createdAt:now,updatedAt:now})];
  }

  const state = {categoryNames:[...FIXED_CATEGORIES],entries:[],search:'',scope:'all',category:null,tag:null,sort:'updated',editingId:null,detailId:null,pendingDeleteId:null,templateId:null,templateFields:Object.create(null),editorInitial:null,visibleLimit:60,initialized:false};
  let tutorialFocus=null,extensionWindowId=null;
  const SURFACE=document.body?.dataset.surface||'page';
  let toastTimer;
  let baseline = [];
  let categoryBaseline=[...FIXED_CATEGORIES];
  let memoryOnly=false;
  let memoryLibrary;
  let lastSaveError='';
  let categoryEditing=null;
  let pendingCategoryDelete=null;
  let saving = false;
  let storageHealthy = true;
  let viewMode = 'grid';
  let lastFocused = null;

  const clone = value => JSON.parse(JSON.stringify(value));
  function storageBlocked(error) {return error?.name==='SecurityError'||error?.name==='NotAllowedError';}
  const store = {
    async get() {
      if(HAS_EXTENSION_STORAGE){const raw=await chrome.storage.local.get([LIBRARY_KEY,KEY]);return PromptDockStore.readLibrary(raw[LIBRARY_KEY],raw[KEY]);}
      if(memoryOnly)return memoryLibrary;
      let raw,legacy;
      try {raw=localStorage.getItem(LIBRARY_KEY);if(raw===null)legacy=localStorage.getItem(KEY);}
      catch(error){if(!storageBlocked(error))throw error;memoryOnly=true;return memoryLibrary;}
      return PromptDockStore.readLibrary(raw===null?undefined:JSON.parse(raw),legacy==null?undefined:JSON.parse(legacy));
    },
    async set(value, initialize=false) {
      const changes=PromptDockStore.diff(baseline,value.entries);
      const categoryChanges=PromptDockStore.categoryDiff(categoryBaseline,value.categories);
      if(HAS_EXTENSION_STORAGE){
        const result=await chrome.runtime.sendMessage({type:'promptdock.commit',changes,categoryChanges,initialize});
        if(!result?.ok)throw Error(result?.error||tr('插件后台未响应，请重新加载扩展'));
        return result.entries;
      }
      const write=async()=>{
        const current=await this.get();
        if(initialize && current!==undefined)return current;
        const next=PromptDockStore.mergeLibrary(current||{entries:[],categories:[...FIXED_CATEGORIES]},changes,categoryChanges);
        if(!memoryOnly){
          try {localStorage.setItem(LIBRARY_KEY,JSON.stringify(next));}
          catch(error){if(!storageBlocked(error))throw error;memoryOnly=true;}
        }
        if(memoryOnly)memoryLibrary=clone(next);
        return next;
      };
      if(!memoryOnly && navigator.locks?.request){
        try{return await navigator.locks.request('promptdock-write',{ifAvailable:true},lock=>{if(!lock)throw Error(tr('另一个窗口正在保存，请稍后重试'));return write();});}
        catch(error){if(!storageBlocked(error))throw error;return write();}
      }
      return write();
    }
  };
  function storageStatus(text, error=false) {
    const el=document.getElementById('storageStatus');
    if(el){el.textContent=tr(text);el.classList.toggle('storage-error',error);}
  }
  async function persist(initialize=false) {
    if(saving)return false;
    if(!storageHealthy){lastSaveError=tr('原始存储数据无法读取，请先导出备份');toast(lastSaveError,true);return false;}
    saving=true;storageStatus(tr('正在保存…'));
    document.getElementById('saveEntry').disabled=true;
    for(const id of ['detailDuplicate','detailCopy','variableCopy','sidebarImport'])document.getElementById(id).disabled=true;
    try {
      const saved=await store.set({entries:clone(state.entries),categories:[...state.categoryNames]},initialize);
      baseline=clone(saved.entries);categoryBaseline=[...saved.categories];state.entries=saved.entries.map(normalize).filter(Boolean);state.categoryNames=[...saved.categories];
      lastSaveError='';storageStatus(memoryOnly?tr('当前预览暂存 · 请导出备份'):tr('已保存到本机'),memoryOnly);
      document.getElementById('sessionNotice').hidden=!memoryOnly;
      if(HAS_EXTENSION_STORAGE)chrome.action.setBadgeText({text:''}).catch(()=>{});
      return true;
    } catch(err) {
      state.entries=baseline.map(normalize).filter(Boolean);state.categoryNames=[...categoryBaseline];
      lastSaveError=err.message||tr('保存失败');
      storageStatus(tr('保存失败 · 请重试'),true);toast(err.message||tr('保存失败，请导出备份'),true);
      return false;
    } finally {saving=false;document.getElementById('saveEntry').disabled=false;for(const id of ['detailDuplicate','detailCopy','variableCopy','sidebarImport'])document.getElementById(id).disabled=false;render();}
  }
  function toast(message, error=false) {
    message=tr(message);
    const el = document.getElementById('toast');
    if (!el) return;
    el.innerHTML = `${icon(error?'info':'check')}<span>${h(message)}</span>`;
    el.classList.add('shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('shown'), 2800);
  }
  function findEntry(id) { return state.entries.find(p=>p.id===id); }

  function markup() {
    document.getElementById('app').innerHTML = `${uiFragment("\n      <div class=\"app-shell\">\n        <header class=\"topbar\">\n          <div class=\"brand\"><div class=\"brand-mark\" aria-hidden=\"true\">✳</div><div><div class=\"brand-name\">prompt<span>dock.</span></div><div class=\"brand-caption\">YOUR PROMPT LIBRARY · 1.4.1</div></div></div>\n          <div class=\"top-actions\"><select class=\"ui-language\" id=\"uiLanguage\" aria-label=\"语言\"><option value=\"zh\">中文</option><option value=\"en\">English</option></select><button class=\"btn btn-sm theme-toggle\" type=\"button\" id=\"uiTheme\" data-action=\"toggle-theme\" aria-pressed=\"false\">夜间模式</button><span id=\"storageStatus\" class=\"storage-status\" role=\"status\">本地提示词库</span><button class=\"btn btn-icon\" data-action=\"fullpage\" type=\"button\" title=\"打开完整工作台\" aria-label=\"打开完整工作台\">",true,false,false)}${icon('layout')}</button>
            <button class="btn export-top" id="topExport" type="button">${icon('download')}${uiFragment(" 导出备份</button>\n            <button class=\"btn btn-primary\" data-action=\"new\" type=\"button\">",true,false,false)}${icon('plus')}${uiFragment(" 新建提示词</button>\n          </div>\n        </header>\n        <section class=\"hero\">\n          <div><p class=\"eyebrow\">MAKE IDEAS REUSABLE · 让灵感随时待命</p><h1>好灵感，随手可取<span class=\"spark\">✳</span></h1><p class=\"desc\">存起来、找得到、用得快。给每个好提示词一个固定的家。</p></div>\n          <div class=\"hero-stats\"><div class=\"stat\"><strong class=\"stat-value\" id=\"statTotal\">0</strong><span class=\"stat-label\">已收录提示词</span></div><div class=\"stat\"><strong class=\"stat-value\" id=\"statFaves\">0</strong><span class=\"stat-label\">常用收藏</span></div><div class=\"stat\"><strong class=\"stat-value\" id=\"statCopies\">0</strong><span class=\"stat-label\">累计复制次数</span></div></div>\n        </section>\n        ",true,false,false)}${MODE==='preview' ? uiHTML('<div class="page-notice">网页与插件各自本地保存 · 使用 JSON 导入 / 导出迁移你的提示词。</div>') : ''}${uiFragment("\n        <div class=\"page-notice\" id=\"legacyCleanupNotice\" hidden>旧版 API 配置暂未清理完成。本版不会使用或发送这些配置，重新打开后会再次尝试清理。</div>\n        <div class=\"getting-started\"><div><strong>一个模板，反复使用</strong><span>用 {{变量}} 替换每次要改的内容。</span></div><button class=\"btn btn-sm\" type=\"button\" data-action=\"tutorial\">了解变量 ",true,false,false)}${icon('arrow')}</button></div>
        ${HAS_EXTENSION_STORAGE?`${uiFragment("<div class=\"extension-tools\" aria-label=\"窗口方式\">",true,false,false)}${SURFACE!=='sidepanel'?uiHTML('<button class="btn btn-sm" type="button" data-action="sidepanel">侧边栏</button>'):''}${SURFACE!=='window'?uiHTML('<button class="btn btn-sm" type="button" data-action="floating">独立小窗</button>'):uiHTML('<button class="btn btn-sm pin-button" type="button" id="pinWindow" data-action="pin-window" aria-pressed="false">置顶</button>')}<span id="pinNote">${SURFACE==='window'?tr('直接记录和取用；需要一直显示时点击「置顶」。'):tr('选中文字 → 右键保存；取用时复制后粘贴到网页。')}</span></div>`:''}${uiFragment("\n        <div class=\"workspace\">\n          <aside class=\"sidebar\" aria-label=\"提示词导航\">\n            <div class=\"nav-heading\">WORKSPACE · 工作台</div>\n            <div class=\"nav-main\">\n              <button type=\"button\" class=\"nav-button active\" data-action=\"scope\" data-scope=\"all\">",true,false,false)}${icon('all')}${uiFragment(" 全部提示词 <span class=\"count\" id=\"navAll\">0</span></button>\n              <button type=\"button\" class=\"nav-button\" data-action=\"scope\" data-scope=\"favorite\">",true,false,false)}${icon('star')}${uiFragment(" 我的收藏 <span class=\"count\" id=\"navFavorites\">0</span></button>\n            <button type=\"button\" class=\"nav-button\" data-action=\"scope\" data-scope=\"recent\">",true,false,false)}${icon('clock')}${uiFragment(" 最近使用 <span class=\"count\" id=\"navRecent\">0</span></button></div>\n            <div class=\"nav-divider\"></div><div class=\"category-heading-row\"><div class=\"nav-heading category-heading\">CATEGORIES · 分类</div><button class=\"btn btn-sm\" type=\"button\" data-action=\"manage-categories\">管理</button></div>\n            <div id=\"categoryNav\"></div>\n            <div class=\"nav-foot\">\n              <button type=\"button\" data-action=\"tutorial\">",true,false,false)}${icon('variables')}${uiFragment(" 变量说明</button>\n              <button id=\"sidebarImport\" type=\"button\">",true,false,false)}${icon('upload')}${uiFragment(" 导入提示词</button>\n              <button id=\"sidebarExport\" type=\"button\">",true,false,false)}${icon('download')}${uiFragment(" 导出 JSON 备份</button>\n              <p class=\"nav-hint\">",true,false,false)}${MODE === 'extension' ? tr('本地保存 · 不连接模型接口') : tr('浏览器本地保存 · 预览版不与扩展共享数据')}${uiFragment("</p>\n            </div>\n          </aside>\n          <main class=\"content\"><div class=\"page-notice session-notice\" id=\"sessionNotice\" hidden>此预览环境限制了浏览器存储。内容可在当前页面暂存，关闭或刷新前请导出 JSON 备份；下载后用 Edge 打开可使用本地保存。</div>\n            <div class=\"toolbar\"><label class=\"search-wrap\" aria-label=\"搜索提示词\">",true,false,false)}${icon('search')}${uiFragment("<input type=\"search\" id=\"searchInput\" placeholder=\"搜索标题、内容、标签...\" autocomplete=\"off\"/><kbd>Ctrl K</kbd></label>\n              <select class=\"sort-select\" id=\"sortSelect\" aria-label=\"排序方式\"><option value=\"updated\">最近更新</option><option value=\"used\">最近使用</option><option value=\"created\">最近创建</option><option value=\"title\">标题 A–Z</option><option value=\"popular\">复制最多</option></select>\n            </div>\n            <div class=\"filter-header\"><div class=\"results-title\" id=\"resultsTitle\">全部提示词 <span>0 条结果</span></div><div class=\"filter-actions\"><button class=\"clear-filter\" id=\"clearFilters\" type=\"button\">清除筛选</button><div class=\"view-switch\" role=\"group\" aria-label=\"显示方式\"><button class=\"btn btn-icon\" data-action=\"layout\" data-layout=\"grid\" aria-label=\"卡片视图\" aria-pressed=\"true\">",true,false,false)}${icon('all')}${uiFragment("</button><button class=\"btn btn-icon\" data-action=\"layout\" data-layout=\"list\" aria-label=\"列表视图\" aria-pressed=\"false\">",true,false,false)}${icon('layout')}${uiFragment("</button></div></div></div>\n            <div class=\"tag-row\" id=\"tagRow\"></div><div class=\"prompt-grid\" id=\"cards\"></div><div class=\"show-more\" id=\"showMoreWrap\" hidden><button type=\"button\" class=\"btn\" data-action=\"more\">加载更多提示词 <span id=\"showMoreCount\"></span></button></div>\n            <footer class=\"footer\"><span>把创作时间留给灵感，把重复工作交给 PromptDock。</span><span class=\"footer-mark\">PROMPTDOCK / 1.4.1</span></footer>\n          </main>\n        </div>\n      </div>\n      <div class=\"overlay\" id=\"tutorialOverlay\" hidden><section class=\"dialog tutorial-dialog\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"tutorialTitle\"><div class=\"dialog-head\"><div><p class=\"overline\">PROMPT VARIABLES</p><h2 id=\"tutorialTitle\">变量是什么？</h2></div><button class=\"btn btn-icon\" type=\"button\" data-action=\"close-tutorial\" id=\"tutorialClose\" aria-label=\"关闭变量说明\">",true,false,false)}${icon('close')}${uiFragment("</button></div><div class=\"dialog-body\" id=\"tutorialBody\"></div><div class=\"dialog-footer\"><button class=\"btn\" type=\"button\" data-action=\"close-tutorial\">知道了</button><button class=\"btn btn-primary\" type=\"button\" data-action=\"tutorial-practice\">用示例试一下 ",true,false,false)}${icon('arrow')}${uiFragment("</button></div></section></div>\n      <div class=\"overlay\" id=\"editorOverlay\" hidden>\n        <section class=\"dialog\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"editorTitle\">\n          <div class=\"dialog-head\"><div><p class=\"overline\">CURATE YOUR LIBRARY</p><h2 id=\"editorTitle\">新建提示词</h2></div><button type=\"button\" class=\"btn btn-icon\" data-action=\"close-editor\" aria-label=\"关闭编辑弹窗\">",true,false,false)}${icon('close')}${uiFragment("</button></div>\n          <form id=\"editorForm\" class=\"dialog-body\" autocomplete=\"off\">\n            <div class=\"form-grid\">\n              <div class=\"field full\"><label for=\"fieldTitle\">提示词名称 <span class=\"required\">*</span></label><input maxlength=\"150\" id=\"fieldTitle\" placeholder=\"例如：电影感特写镜头\" required /></div>\n              <div class=\"field\"><label for=\"fieldCategory\">所属分类</label><div class=\"category-control\"><select id=\"fieldCategory\" aria-label=\"所属分类\"></select><button type=\"button\" class=\"btn btn-sm\" data-action=\"custom-category\">＋ 自定义分类</button></div><div id=\"customCategoryWrap\" hidden><label for=\"fieldCustomCategory\">新分类名称</label><input id=\"fieldCustomCategory\" maxlength=\"28\" placeholder=\"例如：我的短剧、产品广告、水墨项目\" disabled /><div class=\"field-hint\">随这条提示词一起保存，之后可直接选择此分类。</div></div></div>\n              <div class=\"field\"><label for=\"fieldTags\">标签</label><input id=\"fieldTags\" placeholder=\"用逗号分隔，如：写实, 特写\" maxlength=\"350\"/></div>\n              <div class=\"field full\"><label for=\"fieldDescription\">简短说明（可选）</label><input id=\"fieldDescription\" maxlength=\"750\" placeholder=\"这个提示词适合什么场景？\"/></div>\n              <div class=\"field full\"><label for=\"fieldContent\">提示词内容 <span class=\"required\">*</span></label><textarea id=\"fieldContent\" maxlength=\"30000\" placeholder=\"粘贴或输入你的提示词...\" required></textarea><div class=\"field-hint\"><span id=\"contentCount\">0 / 30,000</span> · 用 {{角色}} 或【场景】建立可填写模板。Ctrl + Enter 保存。</div></div>\n            </div><div class=\"form-error\" id=\"formError\" role=\"alert\"></div>\n          </form>\n          <div class=\"dialog-footer\"><button class=\"btn btn-danger btn-sm\" type=\"button\" id=\"deleteEntry\" data-action=\"delete\" hidden>",true,false,false)}${icon('trash')}${uiFragment(" 删除</button><div class=\"end\"><button class=\"btn\" type=\"button\" data-action=\"close-editor\">取消</button><button class=\"btn btn-primary\" type=\"button\" id=\"saveEntry\">",true,false,false)}${icon('check')}${uiFragment(" 保存提示词</button></div></div>\n        </section>\n      </div>\n      <div class=\"overlay\" id=\"detailOverlay\" hidden><section class=\"dialog\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"detailTitle\"><div class=\"dialog-head\"><div><p class=\"overline\">PROMPT DETAIL</p><h2 id=\"detailTitle\"></h2></div><button class=\"btn btn-icon\" type=\"button\" data-action=\"close-detail\" aria-label=\"关闭详情\">",true,false,false)}${icon('close')}</button></div><div class="dialog-body" id="detailBody"></div><div class="dialog-footer detail-footer"><div class="end"><button type="button" class="btn" id="detailDuplicate">${icon('layers')}${uiFragment(" 创建副本</button><button type=\"button\" class=\"btn\" id=\"detailShare\">",true,false,false)}${icon('share')}${uiFragment(" 分享 JSON</button></div><div class=\"end\"><button type=\"button\" class=\"btn\" id=\"detailEdit\">",true,false,false)}${icon('edit')}${uiFragment(" 编辑</button><button type=\"button\" class=\"btn btn-primary\" id=\"detailCopy\">",true,false,false)}${icon('copy')}${uiFragment(" 复制全文</button></div></div></section></div>\n      <div class=\"overlay\" id=\"variablesOverlay\" hidden><section class=\"dialog variable-dialog\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"variablesTitle\"><div class=\"dialog-head\"><div><p class=\"overline\">PROMPT VARIABLES</p><h2 id=\"variablesTitle\">填写变量，快速复用</h2></div><button type=\"button\" class=\"btn btn-icon\" data-action=\"close-variables\" aria-label=\"关闭变量填写\">",true,false,false)}${icon('close')}${uiFragment("</button></div><div class=\"dialog-body\"><p class=\"variable-hint\">只替换本次复制的内容，不会修改原提示词。</p><div class=\"variable-fields\" id=\"variableFields\"></div><label class=\"preview-title\" for=\"variablePreview\">实时预览</label><div class=\"content-block variable-preview\" id=\"variablePreview\" role=\"textbox\" aria-readonly=\"true\" tabindex=\"0\"></div></div><div class=\"dialog-footer\"><button class=\"btn\" type=\"button\" data-action=\"close-variables\">返回</button><button class=\"btn btn-primary\" type=\"button\" id=\"variableCopy\">",true,false,false)}${icon('copy')}${uiFragment(" 复制填写后的内容</button></div></section></div>\n      <div class=\"overlay\" id=\"confirmOverlay\" hidden><section class=\"dialog confirm-dialog\" role=\"alertdialog\" aria-modal=\"true\" aria-labelledby=\"confirmTitle\"><h3 id=\"confirmTitle\">确定删除这个提示词？</h3><p>删除后无法撤销。建议定期导出备份，以免重要内容丢失。</p><div class=\"confirm-actions\"><button type=\"button\" class=\"btn\" data-action=\"cancel-delete\">取消</button><button type=\"button\" class=\"btn btn-danger\" data-action=\"confirm-delete\">",true,false,false)}${icon('trash')}${uiFragment(" 确认删除</button></div></section></div>\n      <div class=\"overlay\" id=\"discardOverlay\" hidden><section class=\"dialog confirm-dialog\" role=\"alertdialog\" aria-modal=\"true\" aria-labelledby=\"discardTitle\"><h3 id=\"discardTitle\">保留刚才的修改？</h3><p>提示词尚未保存。你可以继续编辑，或放弃本次修改。</p><div class=\"confirm-actions\"><button type=\"button\" class=\"btn btn-primary\" id=\"keepEditing\" data-action=\"keep-editing\">继续编辑</button><button type=\"button\" class=\"btn\" data-action=\"discard-edit\">放弃修改</button></div></section></div>\n      <div class=\"overlay\" id=\"categoryManagerOverlay\" hidden><section class=\"dialog\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"categoryManagerTitle\"><div class=\"dialog-head\"><div><p class=\"overline\">ORGANIZE YOUR LIBRARY</p><h2 id=\"categoryManagerTitle\">分类管理</h2></div><button class=\"btn btn-icon\" type=\"button\" data-action=\"close-category-manager\" aria-label=\"关闭分类管理\">",true,false,false)}${icon('close')}${uiFragment("</button></div><div class=\"dialog-body\"><form id=\"categoryForm\" class=\"category-add-form\"><div class=\"field\"><label id=\"categoryNameLabel\" for=\"categoryName\">新建分类</label><input id=\"categoryName\" maxlength=\"28\" required placeholder=\"例如：水墨短片、广告项目\" /></div><button type=\"button\" class=\"btn btn-primary\" id=\"categorySubmit\">添加分类</button><button type=\"button\" class=\"btn\" data-action=\"cancel-category-rename\" id=\"categoryCancel\" hidden>取消</button></form><div id=\"categoryError\" class=\"form-error\" role=\"alert\"></div><p class=\"variable-hint\">分类可以单独保存。重命名会更新其中的提示词；删除只移除分类，提示词归入「通用」。</p><div id=\"categoryManagerList\"></div></div></section></div>\n      <div class=\"overlay\" id=\"categoryDeleteOverlay\" hidden><section class=\"dialog confirm-dialog\" role=\"alertdialog\" aria-modal=\"true\" aria-labelledby=\"categoryDeleteTitle\"><h3 id=\"categoryDeleteTitle\">删除分类？</h3><p id=\"categoryDeleteMessage\"></p><div class=\"confirm-actions\"><button class=\"btn\" type=\"button\" data-action=\"cancel-category-delete\">取消</button><button class=\"btn btn-danger\" type=\"button\" data-action=\"confirm-category-delete\" id=\"categoryDeleteConfirm\">删除分类</button></div></section></div>\n      <div class=\"toast\" id=\"toast\" role=\"status\" aria-live=\"polite\"></div>\n      <input type=\"file\" id=\"importInput\" accept=\"application/json,.json\" hidden />",true,false,false)}`;
  }

  function categories() {
    const freq = new Map(state.categoryNames.map(name=>[name,0]));
    for(const item of state.entries) freq.set(item.category,(freq.get(item.category)||0)+1);
    return [...freq.entries()].sort((a,b)=>{
      const ia = FIXED_CATEGORIES.indexOf(a[0]); const ib = FIXED_CATEGORIES.indexOf(b[0]);
      return (ia===-1?1000:ia)-(ib===-1?1000:ib) || a[0].localeCompare(b[0],'zh-CN');
    });
  }
  function renderCategories() {
    document.getElementById('navRecent').textContent=state.entries.filter(p=>p.usedAt).length;
    document.getElementById('navAll').textContent = state.entries.length;
    document.getElementById('navFavorites').textContent = state.entries.filter(p=>p.favorite).length;
    document.querySelectorAll('[data-action="scope"]').forEach(el=>el.classList.toggle('active',state.scope===el.dataset.scope && !state.category));
    document.getElementById('categoryNav').innerHTML = categories().map(([name,count]) =>
      `<button class="nav-button ${state.category===name?'active':''}" data-action="category" data-category="${h(name)}" type="button">${icon('folder')} <span>${h(categoryLabel(name))}</span><span class="count">${count}</span></button>`).join('');
  }
  function renderTags() {
    const counts = new Map();
    const eligible = state.entries.filter(p=> (!state.category||p.category===state.category) && (state.scope!=='favorite'||p.favorite) && (state.scope!=='recent'||p.usedAt));
    for(const p of eligible) for(const tag of p.tags) counts.set(tag,(counts.get(tag)||0)+1);
    const top = [...counts.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'zh-CN')).slice(0,18);
    if(state.tag && !counts.has(state.tag)) state.tag = null;
    const chips = [`<button type="button" class="tag-chip ${state.tag===null?'selected':''}${uiFragment("\" data-action=\"tag\" data-tag=\"\">全部标签</button>",true,true,false)}`];
    for (const [tag] of top) chips.push(`<button type="button" class="tag-chip ${state.tag===tag?'selected':''}" data-action="tag" data-tag="${h(tag)}"># ${h(tag)}</button>`);
    if(state.tag && !top.some(([tag])=>tag===state.tag)) chips.push(`<button type="button" class="tag-chip selected" data-action="tag" data-tag="${h(state.tag)}"># ${h(state.tag)}</button>`);
    document.getElementById('tagRow').innerHTML=chips.join('');
  }
  function filtered() {
    const terms=state.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const list=state.entries.filter(p => (!state.category || p.category===state.category)
      && (state.scope!=='favorite'||p.favorite) && (state.scope!=='recent'||p.usedAt)
      && (!state.tag||p.tags.includes(state.tag))
      && (!terms.length || terms.every(term => [p.title,p.description,p.content,p.category,...p.tags].join('\n').toLocaleLowerCase().includes(term))));
    const descTime=(k)=>(a,b)=>new Date(b[k]||0)-new Date(a[k]||0) || a.title.localeCompare(b.title,'zh-CN');
    if(state.scope==='recent'||state.sort==='used') list.sort(descTime('usedAt'));
    else if(state.sort==='created') list.sort(descTime('createdAt'));
    else if(state.sort==='title') list.sort((a,b)=>a.title.localeCompare(b.title,'zh-CN'));
    else if(state.sort==='popular') list.sort((a,b)=>b.useCount-a.useCount || new Date(b.updatedAt)-new Date(a.updatedAt));
    else list.sort(descTime('updatedAt'));
    return list;
  }
  function renderCards() {
    document.getElementById('cards').classList.toggle('list-view',viewMode==='list');
    const matches = filtered();
    const data = matches.slice(0,state.visibleLimit);
    const sectionName = (state.category?categoryLabel(state.category):null) || (state.scope==='favorite'?tr('我的收藏'):state.scope==='recent'?tr('最近使用'):tr('全部提示词'));
    document.getElementById('resultsTitle').innerHTML = `${h(sectionName)} <span>${matches.length}${uiFragment(" 条结果</span>",true,false,false)}`;
    document.getElementById('statTotal').textContent=state.entries.length;
    document.getElementById('statFaves').textContent=state.entries.filter(p=>p.favorite).length;
    document.getElementById('statCopies').textContent=state.entries.reduce((n,p)=>n+p.useCount,0);
    const active = !!(state.category||state.scope!=='all'||state.tag||state.search);
    document.getElementById('showMoreWrap').hidden = matches.length <= state.visibleLimit;
    document.getElementById('showMoreCount').textContent = `${uiFragment("（还有 ",false,false,false)}${Math.max(0,matches.length-state.visibleLimit)}${uiFragment(" 条）",false,false,false)}`;
    document.getElementById('clearFilters').hidden=!active;
    if(!data.length) {
      const fresh = !state.entries.length;
      document.getElementById('cards').innerHTML = `<div class="empty"><div class="empty-icon">${icon(fresh?'spark':'search')}</div><h3>${fresh?tr('你的提示词库准备好了'):tr('没有找到匹配的提示词')}</h3><p>${fresh?tr('添加第一条提示词，把创作经验变成可反复调用的灵感资产。'):tr('试试其他关键词，或者清除标签及分类筛选。')}</p><button type="button" class="btn btn-primary" data-action="${fresh?'new':'reset'}">${icon(fresh?'plus':'arrow')} ${fresh?tr('新建第一条'):tr('查看全部提示词')}</button></div>`;
      return;
    }
    document.getElementById('cards').innerHTML = data.map(p => `
      <article class="prompt-card" data-id="${h(p.id)}">
        <div class="card-top"><span class="cat-pill"><i class="cat-dot" aria-hidden="true"></i>${h(categoryLabel(p.category))}</span><button type="button" class="favorite-btn ${p.favorite?'is-favorite':''}" aria-label="${p.favorite?tr('取消收藏'):tr('加入收藏')}" title="${p.favorite?tr('取消收藏'):tr('加入收藏')}" data-action="favorite" data-id="${h(p.id)}">${icon('star')}</button></div>
        <button class="card-title-link" type="button" data-action="view" data-id="${h(p.id)}"><h3 class="card-title">${h(p.title)}</h3></button>
        <p class="card-description">${h(p.description || tr('未添加说明。点击标题查看完整内容。'))}</p>
        <div class="card-preview">${h(p.content)}</div>
        <div class="card-tags">${p.tags.slice(0,3).map(t=>`<span class="mini-tag"># ${h(t)}</span>`).join('')}${p.tags.length>3?`<span class="mini-tag">+${p.tags.length-3}</span>`:''}</div>
        <div class="card-bottom"><span class="meta">${dateShort(p.updatedAt)}${p.useCount?`${uiFragment(" · 已用 ",false,false,false)}${p.useCount}${uiFragment(" 次",false,false,false)}`:''}</span><div class="card-actions">${variableNames(p.content).length?`<button type="button" class="btn btn-icon" data-action="variables" data-id="${h(p.id)}${uiFragment("\" title=\"填写模板变量\" aria-label=\"填写模板变量\">",true,true,false)}${icon('variables')}</button>`:''}<button class="btn btn-icon btn-sm" type="button" data-action="edit" data-id="${h(p.id)}${uiFragment("\" title=\"编辑\" aria-label=\"编辑 ",true,true,false)}${h(p.title)}">${icon('edit')}</button><button class="copy-btn" type="button" data-action="copy" data-id="${h(p.id)}">${icon('copy')}${uiFragment(" 复制</button></div></div>\n      </article>",true,false,false)}`).join('');
  }
  function render() { renderCategories(); renderTags(); renderCards(); }
  function openModal(id=null) {
    const p=id?findEntry(id):null;
    if(id&&!p) return;
    state.editingId=p?.id||null;
    lastFocused=document.activeElement;
    document.getElementById('editorTitle').textContent = p?tr('编辑提示词'):tr('新建提示词');
    document.getElementById('fieldTitle').value=p?.title||'';
    const categoriesList=[...new Set([...state.categoryNames,...state.entries.map(e=>e.category)])];
    document.getElementById('fieldCategory').innerHTML=categoriesList.map(x=>`<option value="${h(x)}">${h(categoryLabel(x))}</option>`).join('')+uiHTML('<option value="">＋ 新建分类</option>');
    document.getElementById('fieldCategory').value=p?.category||state.category||'通用';
    document.getElementById('fieldCustomCategory').value='';
    updateCategoryInput();
    document.getElementById('fieldTags').value=p?.tags.join(', ')||'';
    document.getElementById('fieldDescription').value=p?.description||'';
    document.getElementById('fieldContent').value=p?.content||'';
    document.getElementById('contentCount').textContent=`${document.getElementById('fieldContent').value.length.toLocaleString()} / 30,000`;
    state.editorInitial=editorSignature();
    document.getElementById('formError').textContent='';document.getElementById('formError').dataset.saveError='';
    document.getElementById('deleteEntry').hidden=!p;
    document.getElementById('editorOverlay').hidden=false;
    document.body.style.overflow='hidden';
    document.getElementById('fieldTitle').focus();
  }
  function updateCategoryInput() {
    const custom=document.getElementById('fieldCategory').value==='';
    document.getElementById('customCategoryWrap').hidden=!custom;
    const input=document.getElementById('fieldCustomCategory');
    input.disabled=!custom;input.required=custom;
  }
  function beginCustomCategory() {
    document.getElementById('fieldCategory').value='';
    updateCategoryInput();
    document.getElementById('fieldCustomCategory').focus();
  }
  function selectedCategory() {
    return document.getElementById('fieldCategory').value || document.getElementById('fieldCustomCategory').value.trim();
  }
  function editorSignature() {
    return ['fieldTitle','fieldCategory','fieldCustomCategory','fieldTags','fieldDescription','fieldContent'].map(id=>document.getElementById(id).value).join('\u0000');
  }
  function closeModal(force=false) {
    if(!force && state.editorInitial!==null && editorSignature()!==state.editorInitial){document.getElementById('discardOverlay').hidden=false;document.getElementById('keepEditing').focus();return;}
    document.getElementById('discardOverlay').hidden=true;
    document.getElementById('editorOverlay').hidden=true;
    document.body.style.overflow='';state.editingId=null;state.editorInitial=null;
    if(lastFocused?.isConnected) lastFocused.focus();
  }
  function viewDetail(id) {
    const p=findEntry(id); if(!p) return;
    state.detailId=id;lastFocused=document.activeElement;
    document.getElementById('detailTitle').textContent=p.title;
    document.getElementById('detailBody').innerHTML = `
      <p class="detail-desc">${h(p.description||tr('这个提示词暂时没有说明。'))}</p>
      <div class="detail-info"><span class="cat-pill"><i class="cat-dot"></i>${h(categoryLabel(p.category))}</span>${p.tags.map(t=>`<span class="mini-tag"># ${h(t)}</span>`).join('')}</div>
      ${variableNames(p.content).length?`<button type="button" class="btn btn-template" id="detailVars">${icon('variables')}${uiFragment(" 填写变量并复制 · ",true,false,false)}${variableNames(p.content).length}${uiFragment(" 项</button>",true,false,false)}`:''}${uiFragment("\n      <div class=\"content-block\" id=\"detailContent\"></div>\n      <div class=\"detail-metadata\">创建于 ",true,false,false)}${dateShort(p.createdAt)}${uiFragment(" · 更新于 ",true,false,false)}${dateShort(p.updatedAt)}${uiFragment(" · 已复制 ",true,false,false)}${p.useCount}${uiFragment(" 次</div>",true,false,false)}`;
    document.getElementById('detailContent').textContent=p.content;
    document.getElementById('detailOverlay').hidden=false;document.body.style.overflow='hidden';
    document.getElementById('detailCopy').focus();
  }
  function closeDetail() {
    document.getElementById('detailOverlay').hidden=true;
    document.body.style.overflow='';state.detailId=null;
    if(lastFocused?.isConnected) lastFocused.focus();
  }
  const PLACEHOLDER=/【([^【】\n]{1,40})】|\{\{([^{}\n]{1,40})\}\}/g;
  function variableNames(content) {
    const found=[];for(const match of content.matchAll(PLACEHOLDER)) {
      const key=(match[1]||match[2]).trim();
      if(key && !found.includes(key)) found.push(key);
      if(found.length>=18)break;
    }
    return found;
  }
  function filledContent(p) {
    return p.content.replace(PLACEHOLDER,(whole,a,b)=>{
      const value=state.templateFields[(a||b).trim()];
      return typeof value==='string' && value.trim() ? value : whole;
    });
  }
  function renderVariablePreview() {
    const p=findEntry(state.templateId);
    if(p)document.getElementById('variablePreview').textContent=filledContent(p);
  }
  function openVariables(id) {
    const p=findEntry(id);if(!p)return;
    lastFocused=document.activeElement;
    const names=variableNames(p.content);if(!names.length){toast(tr('该提示词没有【变量】或 {{变量}} 占位符'),true);return;}
    state.templateId=id;state.templateFields=Object.create(null);
    document.getElementById('variableFields').innerHTML=names.map((name,i)=>{const v=p.variables?.find(v=>v.name===name);return `<div class="field"><label for="var${i}">${h(name)}</label><input type="text" maxlength="1200" id="var${i}" data-varname="${h(name)}" placeholder="${h(v?.example?tr('例如：')+v.example:tr('输入')+name+tr('（留空保留占位符）'))}">${v?.description?`<div class="field-hint">${h(v.description)}</div>`:''}</div>`;}).join('');
    document.getElementById('variablesOverlay').hidden=false;document.body.style.overflow='hidden';
    renderVariablePreview();document.querySelector('#variableFields input')?.focus();
  }
  function closeVariables() {
    document.getElementById('variablesOverlay').hidden=true;
    state.templateId=null;state.templateFields=Object.create(null);
    if(document.getElementById('detailOverlay').hidden)document.body.style.overflow='';
    else document.getElementById('detailVars')?.focus();
    if(document.getElementById('detailOverlay').hidden && lastFocused?.isConnected)lastFocused.focus();
  }
  async function copyText(content) {
    try {
      if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(content);
      else throw Error('clipboard API unavailable');
      return true;
    } catch {
      const temp=document.createElement('textarea');temp.value=content;
      temp.style.position='fixed';temp.style.left='-10000px';document.body.append(temp);
      temp.focus();temp.select();
      let success=false;try{success=document.execCommand('copy');}catch{}finally{temp.remove();}
      return success;
    }
  }
  async function copyVariables() {
    if(saving)return;
    const p=findEntry(state.templateId);if(!p)return;
    const success=await copyText(filledContent(p));
    if(!success){toast(tr('复制失败，请手动选择预览文本'),true);return;}
    p.useCount++;p.usedAt=new Date().toISOString();const saved=await persist();renderCards();
    closeVariables();
    const meta=document.querySelector('#detailBody .detail-metadata');
    if(meta)meta.textContent=`${uiFragment("创建于 ",false,false,false)}${dateShort(p.createdAt)}${uiFragment(" · 更新于 ",false,false,false)}${dateShort(p.updatedAt)}${uiFragment(" · 已复制 ",false,false,false)}${p.useCount}${uiFragment(" 次",false,false,false)}`;
    if(saved)toast(tr('已复制填写后的提示词'));
  }
  async function onSave(evt) {
    evt.preventDefault();
    if(saving)return;
    document.getElementById('formError').dataset.saveError='';
    const title=document.getElementById('fieldTitle').value.trim();
    const content=document.getElementById('fieldContent').value.trim();
    if(!selectedCategory()){document.getElementById('formError').textContent=tr('请输入自定义分类名称');return;}
    if(!title||!content) {document.getElementById('formError').textContent=tr('名称和内容不能为空');return;}
    const now=new Date().toISOString();
    const prev=state.editingId?findEntry(state.editingId):null;
    const data=normalize({
      id:prev?.id||uid(),title,content,description:document.getElementById('fieldDescription').value,
      category:selectedCategory()||'通用',
      tags:document.getElementById('fieldTags').value,favorite:prev?.favorite||false,
      ...(prev?.variables?{variables:prev.variables.filter(v=>variableNames(content).includes(v.name))}:{}),
      createdAt:prev?.createdAt||now,updatedAt:now,usedAt:prev?.usedAt||null,useCount:prev?.useCount||0
    });
    if(!data) return;
    if(!state.categoryNames.includes(data.category))state.categoryNames.push(data.category);
    if(prev) state.entries=state.entries.map(p=>p.id===prev.id?data:p);
    else state.entries.unshift(data);
    if(!await persist()){document.getElementById('formError').dataset.saveError='true';document.getElementById('formError').textContent=`${tr(lastSaveError)}${uiFragment("。输入内容仍保留。",false,false,false)}`;return;}
    if(!prev){state.scope='all';state.category=data.category;state.tag=null;state.search='';document.getElementById('searchInput').value='';state.visibleLimit=60;}
    closeModal(true);render();toast(memoryOnly?tr('已暂存到当前预览，关闭前请导出备份'):prev?tr('提示词已更新'):tr('已保存到提示词库'));
  }
  async function copyEntry(id) {
    if(saving)return;
    const p=findEntry(id);if(!p)return;
    const success=await copyText(p.content);
    if(!success){toast(tr('复制失败，请在详情中手动复制'),true);return;}
    p.useCount+=1;p.usedAt=new Date().toISOString();
    const saved=await persist();renderCards();if(saved)toast(tr('已复制到剪贴板'));
    if(state.detailId===id) {
      const el=document.querySelector('#detailBody .detail-metadata');
      if(el)el.textContent=`${uiFragment("创建于 ",false,false,false)}${dateShort(p.createdAt)}${uiFragment(" · 更新于 ",false,false,false)}${dateShort(p.updatedAt)}${uiFragment(" · 已复制 ",false,false,false)}${p.useCount}${uiFragment(" 次",false,false,false)}`;
    }
  }
  async function toggleFavorite(id) {
    const p=findEntry(id);if(!p)return;
    p.favorite=!p.favorite;p.updatedAt=new Date().toISOString();
    if(await persist()){render();toast(p.favorite?tr('已加入收藏'):tr('已取消收藏'));}
  }
  function requestDelete() {
    if(!state.editingId) return;
    state.pendingDeleteId=state.editingId;
    document.getElementById('confirmOverlay').hidden=false;
    document.querySelector('#confirmOverlay [data-action="cancel-delete"]').focus();
  }
  function closeConfirm() {state.pendingDeleteId=null;document.getElementById('confirmOverlay').hidden=true;}
  async function confirmDelete() {
    const id=state.pendingDeleteId;if(!id)return;
    state.entries=state.entries.filter(p=>p.id!==id);
    closeConfirm();if(await persist()){closeModal(true);render();toast(tr('提示词已删除'));}
  }
  function resetFilters() {
    state.search='';state.scope='all';state.category=null;state.tag=null;
    state.visibleLimit=60;document.getElementById('searchInput').value='';render();
  }
  function downloadItems(items, filename) {
    const payload={app:'PromptDock',formatVersion:2,exportedAt:new Date().toISOString(),categories:items===state.entries?[...state.categoryNames]:[...new Set(items.map(p=>p.category))],prompts:items};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download=filename;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    toast(`${uiFragment("已导出 ",false,false,false)}${items.length}${uiFragment(" 条提示词",false,false,false)}`);
  }
  function downloadBackup() { downloadItems(state.entries, `${uiFragment("PromptDock-备份-",false,false,false)}${new Date().toISOString().slice(0,10)}.json`); }
  function shareEntry(id) {
    const p=findEntry(id);if(!p)return;
    const name=p.title.replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').slice(0,42).trim()||'prompt';
    downloadItems([p],`${uiFragment("PromptDock-分享-",false,false,false)}${name}.json`);
  }
  async function duplicateEntry(id) {
    if(saving)return;
    const p=findEntry(id);if(!p)return;
    const now=new Date().toISOString();
    const duplicate=normalize({...p,id:uid(),title:`${p.title}${uiFragment(" · 副本",false,false,false)}`.slice(0,150),favorite:false,createdAt:now,updatedAt:now,usedAt:null,useCount:0});
    state.entries.unshift(duplicate);if(await persist()){render();closeDetail();openModal(duplicate.id);toast(tr('已创建副本，可继续编辑'));}
  }
  async function importBackup(file) {
    if(saving){toast(tr('正在保存，请稍后导入'));return;}
    if(!file)return;
    if(file.size>3*1024*1024) {toast(tr('文件过大，请导入小于 3 MB 的 JSON'),true);return;}
    try {
      const obj=JSON.parse(await file.text());
      const list=Array.isArray(obj)?obj:(Array.isArray(obj?.prompts)?obj.prompts:null);
      if(!list) throw Error(tr('JSON 结构不正确'));
      if(list.length>5000) throw Error(tr('单次导入超过 5000 条'));
      const existing=new Set(state.entries.map(p=>`${p.title.toLowerCase()}\u0000${p.content.toLowerCase()}`));
      const ids=new Set(state.entries.map(p=>p.id));
      let added=0,ignored=0;
      for(const item of list) {
        const p=normalize(item);
        if(!p){ignored++;continue;}
        const sig=`${p.title.toLowerCase()}\u0000${p.content.toLowerCase()}`;
        if(existing.has(sig)){ignored++;continue;}
        if(ids.has(p.id))p.id=uid();
        if(!state.categoryNames.includes(p.category))state.categoryNames.push(categoryLabel(p.category));
        state.entries.push(p);existing.add(sig);ids.add(p.id);added++;
      }
      const importedCats=Array.isArray(obj?.categories)?obj.categories.filter(n=>typeof n==='string'&&n.trim()&&n.trim().length<=28).map(n=>n.trim()):[];
      for(const name of importedCats)if(!state.categoryNames.includes(name))state.categoryNames.push(name);
      if((added||PromptDockStore.categoryDiff(categoryBaseline,state.categoryNames).length) && !await persist())return;
      render();toast(`${uiFragment("成功导入 ",false,false,false)}${added}${uiFragment(" 条",false,false,false)}${ignored?`${uiFragment("，跳过 ",false,false,false)}${ignored}${uiFragment(" 条重复/无效内容",false,false,false)}`:''}`);
    } catch(error) {console.warn(error);toast(tr('导入失败：请检查 JSON 文件格式'),true);}
    document.getElementById('importInput').value='';
  }
  function renderCategoryManager() {
    document.getElementById('categoryManagerList').innerHTML=categories().map(([name,count])=>`<div class="category-manage-row"><div><strong>${h(categoryLabel(name))}</strong><span>${count}${uiFragment(" 条提示词</span></div><div class=\"category-row-actions\">",true,false,false)}${name==='通用'?uiHTML('<span class="category-default">默认归档</span>'):`<button type="button" class="btn btn-sm" data-action="rename-category" data-name="${h(name)}${uiFragment("\">重命名</button><button type=\"button\" class=\"btn btn-icon\" data-action=\"delete-category\" data-name=\"",true,true,false)}${h(name)}${uiFragment("\" aria-label=\"删除分类 ",true,true,false)}${h(name)}">${icon('trash')}</button>`}</div></div>`).join('');
  }
  function resetCategoryForm() {categoryEditing=null;document.getElementById('categoryName').value='';document.getElementById('categoryNameLabel').textContent=tr('新建分类');document.getElementById('categorySubmit').textContent=tr('添加分类');document.getElementById('categoryCancel').hidden=true;document.getElementById('categoryError').textContent='';}
  function openCategoryManager() {lastFocused=document.activeElement;resetCategoryForm();renderCategoryManager();document.getElementById('categoryManagerOverlay').hidden=false;document.body.style.overflow='hidden';document.getElementById('categoryName').focus();}
  function closeCategoryManager() {if(saving)return;document.getElementById('categoryManagerOverlay').hidden=true;document.body.style.overflow='';lastFocused?.focus();}
  function startCategoryRename(name) {categoryEditing=name;document.getElementById('categoryName').value=name;document.getElementById('categoryNameLabel').textContent=tr('重命名分类');document.getElementById('categorySubmit').textContent=tr('保存名称');document.getElementById('categoryCancel').hidden=false;document.getElementById('categoryError').textContent='';document.getElementById('categoryName').focus();}
  async function saveCategory(event) {
    event.preventDefault();if(saving)return;
    const name=document.getElementById('categoryName').value.trim(),old=categoryEditing;
    if(!name||name.length>28){document.getElementById('categoryError').textContent=tr('请输入 1–28 个字符的分类名称');return;}
    if(name!==old&&state.categoryNames.includes(name)){document.getElementById('categoryError').textContent=tr('这个分类已经存在，请换一个名称');return;}
    if(old==='通用'){document.getElementById('categoryError').textContent=tr('默认归档分类不能重命名');return;}
    if(old){state.categoryNames=state.categoryNames.map(n=>n===old?name:n);state.entries=state.entries.map(p=>p.category===old?{...p,category:name,updatedAt:new Date().toISOString()}:p);}
    else state.categoryNames.push(name);
    document.getElementById('categorySubmit').disabled=true;
    const ok=await persist();document.getElementById('categorySubmit').disabled=false;
    if(!ok){document.getElementById('categoryError').textContent=tr(lastSaveError);return;}
    if(state.category===old)state.category=name;
    resetCategoryForm();render();renderCategoryManager();toast(memoryOnly?tr('分类已暂存，关闭前请导出备份'):old?tr('分类已重命名'):tr('分类已新建'));
  }
  function requestCategoryDelete(name) {if(name==='通用'||saving)return;pendingCategoryDelete=name;const count=state.entries.filter(p=>p.category===name).length;document.getElementById('categoryDeleteMessage').textContent=`${uiFragment("删除「",false,false,false)}${name}${uiFragment("」后，",false,false,false)}${count}${uiFragment(" 条提示词将移到「通用」，内容不会被删除。",false,false,false)}`;document.getElementById('categoryDeleteOverlay').hidden=false;document.getElementById('categoryDeleteConfirm').focus();}
  function cancelCategoryDelete() {document.getElementById('categoryDeleteOverlay').hidden=true;pendingCategoryDelete=null;document.getElementById('categoryName').focus();}
  async function deleteCategory() {
    const name=pendingCategoryDelete;if(!name||name==='通用'||saving)return;
    state.categoryNames=state.categoryNames.filter(n=>n!==name);state.entries=state.entries.map(p=>p.category===name?{...p,category:'通用',updatedAt:new Date().toISOString()}:p);
    document.getElementById('categoryDeleteConfirm').disabled=true;const ok=await persist();document.getElementById('categoryDeleteConfirm').disabled=false;
    if(ok){if(state.category===name)state.category='通用';if(categoryEditing===name)resetCategoryForm();cancelCategoryDelete();render();renderCategoryManager();toast(tr('分类已删除，提示词已保留'));}
  }
  const LEGACY_PRESETS=[{"title":"电影级写实质感 · 全局风格","category":"通用","tags":["写实","电影质感","光影"],"description":"统一影像质感，适合作为任何影视生成提示词的风格前缀。","content":"电影摄影级写实画面，物理摄影机拍摄质感，真实镜头光学特征，细微胶片颗粒。自然光与场景实际光源塑造明暗，主体位于阴影侧，柔和逆光与空气透视。真实材质、细微磨损与非对称细节，人物皮肤自然纹理。严格遵守重力、惯性、接触阴影与运动连续性。保持人物、服装、道具和场景一致。不出现文字、字幕、水印或品牌标志。","favorite":true},{"title":"角色设定三视图","category":"角色设定","tags":["三视图","角色资产","一致性"],"description":"为 AI 短剧角色制作统一的正面、侧面、背面参考。","content":"为【角色名称】制作专业角色设定三视图。\n角色：年龄【年龄】，外形【外貌】，服装【服装】，发型【发型】。\n同一人物，同一套服饰，同一比例，同一配饰，完整展示正面、左侧面、背面。全身入镜，站姿自然，四肢无遮挡。纯白背景，均匀柔光，清晰材质细节。三个视角身份和造型完全统一。画面无文字、无标注、无水印。","favorite":false},{"title":"电影感场景概念图","category":"文生图","tags":["场景","构图","气氛"],"description":"快速搭建富有叙事意味的环境概念画面。","content":"场景：【场景地点】。时间：【时段】。天气：【天气】。\n画面主视觉：【核心建筑或场景元素】，前景【前景遮挡】，中景【人物或主体】，背景【环境信息】。\n色彩以【主色】为主，少量【点缀色】制造视觉重心。光源来自【光源位置】，形成【光线气氛】。写实电影摄影构图，明确前中后景，透视严谨，空间结构合理，视觉引导清晰。无文字、无水印。","favorite":false},{"title":"15 秒连续动作分镜","category":"图生视频","tags":["动作","分镜","连续性"],"description":"适合短时长多镜头视频，强调动作衔接与场面调度。","content":"生成一段不超过 15 秒的电影感连续动作视频，最多 5 个镜头。\n角色：【角色及服装】。场景：【地点与空间锚点】。\n镜头 1（【时长】秒）：【景别／机位】，角色【起始动作】。\n镜头 2（【时长】秒）：【景别／机位】，角色【承接动作】。\n镜头 3（【时长】秒）：【景别／机位】，角色【关键动作】。\n镜头 4（【时长】秒）：【景别／机位】，角色【结果反应】。\n全过程人物身份、服装、道具、布光、左右空间方向严格一致，动作符合真实物理规律，不越轴、不瞬移、不增加额外人物、台词、字幕、音乐或标志。","favorite":true},{"title":"镜头语言 · 情绪特写","category":"镜头语言","tags":["特写","表演","情绪"],"description":"突出微表情与潜台词，让人物表演更有张力。","content":"人物：【角色】。正在经历的冲突：【冲突】。\n镜头为人物面部近景至特写，采用【侧前方三分之二角度】，镜头缓慢向前推进。面部微表情先出现【情绪 A】的细微迹象，随后眼神和嘴角短暂泄露【情绪 B】，最后重新克制。强调眼球微移、呼吸、短暂停顿与面部肌肉细节；表演内敛，不夸张。背景浅景深虚化，场景实际光源照明，镜头连贯稳定，无字幕、无多余台词。","favorite":false},{"title":"短剧悬念场景构思","category":"剧本创作","tags":["悬念","反转","故事"],"description":"用视觉动作而非解释台词构建可拍摄的冲突。","content":"请围绕【主题／矛盾】构思一段 60–90 秒的可视化短剧。\n必须包含：1）人物具有明确的即时目标；2）画面中出现可被观众理解的障碍；3）通过一个具体动作或道具让事态升级；4）在结尾以新的视觉信息完成反转。\n限制：角色不超过【人数】个，场景不超过【数量】处，主要依靠行为、构图和细节叙事，避免大段说明对白。输出人物目标、剧情节拍和关键视觉镜头。","favorite":false},{"title":"诡异反派视觉设定","category":"角色设定","tags":["反派","水墨","概念设计"],"description":"创造有压迫感但辨识度清晰的艺术化反派。","content":"设计一个名为【名称】的诡异反派。主视觉轮廓：【剪影特征】；标志性器物：【器物】；独特行动方式：【动作】。气质古老、沉静、极具压迫感，细节不堆砌，以轮廓和姿态塑造辨识度。整体色彩使用雾灰青、黛石黑、旧木褐等低饱和冷色，少量暗朱砂点缀。风格为写意水墨与可制作的 2.5D 角色设计融合。无文字与水印。","favorite":false},{"title":"场景空间一致性锁定","category":"场景设计","tags":["空间","轴线","连续性"],"description":"避免跨镜头门窗错位、家具漂移和人物跳轴。","content":"场景：【场所】。建立以下固定空间锚点：入口门位于【位置】；窗位于【位置】；核心道具【道具】位于【位置】；主要人物起始站位【位置】。\n将空间定义为唯一稳定的三维布局。所有镜头使用同一坐标关系，同一家具摆放、建筑结构、光源方向和道具位置。运动时保证左右方向、视线关系、轴线与相对距离连续；镜头改变仅改变观察位置，不改变空间本身。","favorite":false}];
  function simplifyPresets() {
    // Only untouched and never-used shipped examples qualify; keep user edits.
    const removed=state.entries.filter(p=>p.createdAt===p.updatedAt&&!p.usedAt&&p.useCount===0&&LEGACY_PRESETS.some(sample=>Object.keys(sample).every(k=>JSON.stringify(p[k])===JSON.stringify(sample[k]))));
    if(!removed.length)return false;
    const ids=new Set(removed.map(p=>p.id));state.entries=state.entries.filter(p=>!ids.has(p.id));
    if(!state.entries.some(p=>p.title==='示例：电影感场景模板'))state.entries.push(...seeds());
    const oldCategories=new Set(LEGACY_PRESETS.map(p=>p.category).concat(['网页摘录','其他']));
    state.categoryNames=state.categoryNames.filter(name=>name==='通用'||!oldCategories.has(name)||state.entries.some(p=>p.category===name));
    return true;
  }
  function renderTutorial() {
    document.getElementById('tutorialBody').innerHTML=`${uiFragment("<p class=\"variable-intro\">变量就是提示词里<strong>每次要替换的部分</strong>。保存一份模板，换个内容就能再次使用。</p><div class=\"variable-example\"><span>保存的模板</span><code>为{{主体}}创作电影感画面。场景：{{场景}}。</code><span>填好后复制的内容</span><p>为一位撑伞的旅人创作电影感画面。场景：雨后的老街。</p></div><ol><li><strong>写：</strong>在正文中把变化的内容写成 <code>{{主体}}</code>、<code>{{场景}}</code>。</li><li><strong>填：</strong>打开提示词，点击「填写变量并复制」，输入本次需要的内容。</li><li><strong>用：</strong>点击「复制填写后的内容」，粘贴到 AI 网站。</li></ol><p class=\"variable-note\">也支持 【主体】 写法。填写只影响本次复制，原模板会保留；留空的变量保持原样。</p>",true,false,false)}`;
  }
  function openTutorial() {tutorialFocus=document.activeElement;renderTutorial();document.getElementById('tutorialOverlay').hidden=false;document.body.style.overflow='hidden';document.getElementById('tutorialClose').focus();}
  function closeTutorial() {document.getElementById('tutorialOverlay').hidden=true;document.body.style.overflow='';if(tutorialFocus?.isConnected)tutorialFocus.focus();}
  function practiceTutorial() {
    if(saving){toast(tr('正在保存，请稍候'));return;}
    const sample=state.entries.find(p=>p.title==='示例：电影感场景模板')||state.entries.find(p=>variableNames(p.content).length);
    if(!sample){toast(tr('先在提示词正文中写 {{变量名}}，保存后即可填写。'));return;}
    closeTutorial();openVariables(sample.id);
  }
  async function openExtensionSurface(surface) {
    if(!HAS_EXTENSION_STORAGE)return;
    if(saving||!document.getElementById('editorOverlay').hidden){toast(tr('请先保存或关闭当前编辑，再切换窗口'));return;}
    try {
      if(surface==='sidepanel'){
        if(extensionWindowId===null||!chrome.sidePanel?.open)throw Error(tr('暂时无法打开侧边栏，请使用独立小窗，或按 Ctrl+Shift+Y 重试。'));
        // Window ID was loaded before the click: retain the user gesture for open().
        await chrome.sidePanel.open({windowId:extensionWindowId});
      }else {
        const result=await chrome.runtime.sendMessage({type:'promptdock.open-window',browserWindowId:extensionWindowId});
        if(!result?.ok)throw Error(result?.error||tr('小窗打开失败，请重新加载扩展'));
      }
      if(surface==='sidepanel'&&SURFACE==='window'){await chrome.windows.update(extensionWindowId,{focused:true});floatingController?.close();window.close();}
    }catch(error){toast(error.message||tr('窗口打开失败，请重试'),true);}
  }
  async function togglePinnedWindow() {
    if(SURFACE!=='window'||!HAS_EXTENSION_STORAGE)return;
    if(saving){toast(tr('正在保存，请稍候'));return;}
    if(floatingController?.pending)return;
    if(!floatingController)floatingController=PromptDockFloating.create({sourceWindow:window,root:document.getElementById('app'),translate:tr,onChange:next=>{
      if(keyHandler)document.removeEventListener('keydown',keyHandler);
      document=next.document;window=next.window;navigator=window.navigator;
      PromptDockUI.apply(document,preferences);
      if(keyHandler)document.addEventListener('keydown',keyHandler);
      const button=document.getElementById('pinWindow');button.textContent=next.pinned?tr('取消置顶'):tr('置顶');button.setAttribute('aria-pressed',String(next.pinned));
      document.getElementById('pinNote').textContent=next.pinned?tr('已置顶。请保留来源小窗；关闭浮窗后会返回。'):tr('可以拖动和调整大小；点击「置顶」在其他窗口上方取用。');
    }});
    try {await floatingController.toggle();}
    catch(error){toast(error.name==='NotAllowedError'?tr('浏览器未允许置顶浮窗，请直接点击「置顶」重试。'):error.message||tr('置顶失败，请重试'),true);}
  }
  function applyPreferences(value) {
    preferences=PromptDockUI.normalize(value);
    PromptDockUI.apply(globalThis.document,preferences);
    if(document!==globalThis.document)PromptDockUI.apply(document,preferences);
    floatingController?.refresh?.();
    for(const id of ['editorTitle','categoryNameLabel','categorySubmit','storageStatus','formError','categoryError','pinWindow','pinNote']){
      const node=document.getElementById(id);if(node)node.textContent=tr(node.textContent);
    }
    for(const node of document.querySelectorAll('#fieldCategory option')){if(node.value==='通用')node.textContent=categoryLabel(node.value);else if(node.value==='')node.textContent=tr('＋ 新建分类');}
    const variablePrompt=findEntry(state.templateId);
    for(const node of document.querySelectorAll('#variableFields input[data-varname]')){const name=node.dataset.varname,v=variablePrompt?.variables?.find(v=>v.name===name);node.placeholder=v?.example?tr('例如：')+v.example:tr('输入')+name+tr('（留空保留占位符）');}
    const formError=document.getElementById('formError');if(formError?.dataset.saveError==='true')formError.textContent=tr(lastSaveError)+uiFragment('。输入内容仍保留。',false,false,false);
    if(state.initialized){render();if(!document.getElementById('categoryManagerOverlay').hidden)renderCategoryManager();if(!document.getElementById('tutorialOverlay').hidden)renderTutorial();}
    const detail=findEntry(state.detailId),meta=document.querySelector('#detailBody .detail-metadata');
    const detailDescription=document.querySelector('#detailBody .detail-desc');if(detail&&!detail.description&&detailDescription)detailDescription.textContent=tr('这个提示词暂时没有说明。');
    if(detail&&meta)meta.textContent=`${uiFragment("创建于 ",false,false,false)}${dateShort(detail.createdAt)}${uiFragment(" · 更新于 ",false,false,false)}${dateShort(detail.updatedAt)}${uiFragment(" · 已复制 ",false,false,false)}${detail.useCount}${uiFragment(" 次",false,false,false)}`;
    if(pendingCategoryDelete){const count=state.entries.filter(p=>p.category===pendingCategoryDelete).length;document.getElementById('categoryDeleteMessage').textContent=`${uiFragment("删除「",false,false,false)}${pendingCategoryDelete}${uiFragment("」后，",false,false,false)}${count}${uiFragment(" 条提示词将移到「通用」，内容不会被删除。",false,false,false)}`;}
    document.getElementById('pinWindow')?.setAttribute('aria-pressed',String(Boolean(floatingController?.pinned)));
  }
  async function changePreferences(patch) {
    const next=PromptDockUI.normalize({...preferences,...patch});applyPreferences(next);preferenceWrites++;
    const task=preferenceQueue.catch(()=>{}).then(()=>PromptDockUI.save(next,{extension:HAS_EXTENSION_STORAGE}));preferenceQueue=task;
    try{await task;}catch{toast(tr('界面设置暂存，关闭前可能不会保留'),true);}finally{preferenceWrites--;}
  }
  function bind() {
    if(HAS_EXTENSION_STORAGE){
      if(SURFACE==='window')chrome.storage.session.get(WINDOW_TARGET_KEY).then(data=>{extensionWindowId=Number.isInteger(data[WINDOW_TARGET_KEY])?data[WINDOW_TARGET_KEY]:null;}).catch(()=>{});
      else chrome.windows.getCurrent().then(win=>{extensionWindowId=win.id;}).catch(()=>{});
    }
    document.getElementById('app').addEventListener('click', async e=>{
      const el=e.target.closest('[data-action]');if(!el)return;
      const a=el.dataset.action,id=el.dataset.id;
      if(a==='toggle-theme'){await changePreferences({theme:preferences.theme==='dark'?'light':'dark'});return;}
      if(a==='pin-window'){await togglePinnedWindow();return;}
      if(saving && ['new','edit','favorite','delete','confirm-delete','copy','variables','manage-categories','rename-category','delete-category','confirm-category-delete','close-category-manager'].includes(a)){toast(tr('正在保存，请稍候'));return;}
      if(a==='tutorial'){openTutorial();return;}
      if(a==='close-tutorial'){closeTutorial();return;}
      if(a==='tutorial-practice'){practiceTutorial();return;}
      if(a==='sidepanel'||a==='floating'){await openExtensionSurface(a);return;}
      if(a==='manage-categories'){openCategoryManager();return;}
      if(a==='close-category-manager'){closeCategoryManager();return;}
      if(a==='cancel-category-rename'){resetCategoryForm();return;}
      if(a==='rename-category'){startCategoryRename(el.dataset.name);return;}
      if(a==='delete-category'){requestCategoryDelete(el.dataset.name);return;}
      if(a==='cancel-category-delete'){cancelCategoryDelete();return;}
      if(a==='confirm-category-delete'){await deleteCategory();return;}
      if(a==='custom-category'){beginCustomCategory();return;}
      if(a==='keep-editing'){document.getElementById('discardOverlay').hidden=true;document.getElementById('fieldCategory').focus();return;}
      if(a==='discard-edit'){closeModal(true);return;}
      if(a==='variables'){openVariables(id);return;}
      if(a==='layout'){viewMode=el.dataset.layout;document.querySelectorAll('[data-action="layout"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===viewMode)));renderCards();return;}
      if(a==='fullpage'){if(HAS_EXTENSION_STORAGE)chrome.tabs.create({url:chrome.runtime.getURL('library.html')});else{resetFilters();document.getElementById('searchInput').focus();}return;}
      if(a==='new')openModal();
      else if(a==='edit')openModal(id);
      else if(a==='view')viewDetail(id);
      else if(a==='copy')await copyEntry(id);
      else if(a==='favorite')toggleFavorite(id);
      else if(a==='scope'){state.scope=el.dataset.scope;state.category=null;state.tag=null;state.visibleLimit=60;render();}
      else if(a==='category'){const c=el.dataset.category;state.category=state.category===c?null:c;state.scope='all';state.tag=null;state.visibleLimit=60;render();}
      else if(a==='tag'){state.tag=el.dataset.tag||null;state.visibleLimit=60;render();}
      else if(a==='reset')resetFilters();
      else if(a==='more'){state.visibleLimit+=60;renderCards();}
      else if(a==='close-variables')closeVariables();
      else if(a==='close-editor')closeModal();
      else if(a==='close-detail')closeDetail();
      else if(a==='delete')requestDelete();
      else if(a==='cancel-delete')closeConfirm();
      else if(a==='confirm-delete')confirmDelete();
    });
    document.getElementById('categoryForm').addEventListener('submit',saveCategory);
    document.getElementById('uiLanguage').addEventListener('change',event=>changePreferences({language:event.target.value}));
    document.getElementById('categorySubmit').addEventListener('click',saveCategory);
    document.getElementById('editorForm').addEventListener('submit',onSave);
    document.getElementById('saveEntry').addEventListener('click',onSave);
    document.getElementById('fieldCategory').addEventListener('change',updateCategoryInput);
    document.getElementById('fieldContent').addEventListener('input',e=>{document.getElementById('contentCount').textContent=`${e.target.value.length.toLocaleString()} / 30,000`;});
    document.getElementById('searchInput').addEventListener('input',e=>{state.search=e.target.value;state.visibleLimit=60;renderCards();});
    document.getElementById('sortSelect').addEventListener('change',e=>{state.sort=e.target.value;state.visibleLimit=60;renderCards();});
    document.getElementById('clearFilters').addEventListener('click',resetFilters);
    for(const id of ['sidebarExport','topExport'])document.getElementById(id).addEventListener('click',downloadBackup);
    document.getElementById('sidebarImport').addEventListener('click',()=>document.getElementById('importInput').click());
    document.getElementById('importInput').addEventListener('change',e=>importBackup(e.target.files?.[0]));
    document.getElementById('detailEdit').addEventListener('click',()=>{const id=state.detailId;closeDetail();openModal(id);});
    document.getElementById('detailCopy').addEventListener('click',()=>copyEntry(state.detailId));
    document.getElementById('detailDuplicate').addEventListener('click',()=>duplicateEntry(state.detailId));
    document.getElementById('detailShare').addEventListener('click',()=>shareEntry(state.detailId));
    document.getElementById('detailBody').addEventListener('click',e=>{if(e.target.closest('#detailVars'))openVariables(state.detailId);});
    document.getElementById('variableCopy').addEventListener('click',copyVariables);
    document.getElementById('variableFields').addEventListener('input',e=>{
      if(!e.target.matches('input[data-varname]'))return;
      state.templateFields[e.target.dataset.varname]=e.target.value;renderVariablePreview();
    });
    for(const id of ['tutorialOverlay','editorOverlay','detailOverlay','variablesOverlay','confirmOverlay','discardOverlay','categoryManagerOverlay','categoryDeleteOverlay']) {
      document.getElementById(id).addEventListener('click',e=>{
        if(e.target!==e.currentTarget)return;
        if(id==='tutorialOverlay')closeTutorial();
        if(id==='categoryManagerOverlay')closeCategoryManager();
        if(id==='categoryDeleteOverlay')cancelCategoryDelete();
        if(id==='discardOverlay'){document.getElementById('discardOverlay').hidden=true;document.getElementById('fieldCategory').focus();}
        if(id==='editorOverlay')closeModal();
        if(id==='detailOverlay')closeDetail();
        if(id==='confirmOverlay')closeConfirm();
        if(id==='variablesOverlay')closeVariables();
      });
    }
    keyHandler=e=>{
      const tutorialOpen=!document.getElementById('tutorialOverlay').hidden;
      const categoryDeleteOpen=!document.getElementById('categoryDeleteOverlay').hidden;
      const categoryManagerOpen=!document.getElementById('categoryManagerOverlay').hidden;
      const discardOpen=!document.getElementById('discardOverlay').hidden;
      const editorOpen=!document.getElementById('editorOverlay').hidden;
      const detailOpen=!document.getElementById('detailOverlay').hidden;
      const confirmOpen=!document.getElementById('confirmOverlay').hidden;
      const variablesOpen=!document.getElementById('variablesOverlay').hidden;
      if(e.key==='Tab') {
        const top=['tutorialOverlay','categoryDeleteOverlay','discardOverlay','categoryManagerOverlay','confirmOverlay','variablesOverlay','editorOverlay','detailOverlay'].map(id=>document.getElementById(id)).find(el=>!el.hidden);
        if(top){const focusable=[...top.querySelectorAll('button,input,textarea,select,[tabindex="0"]')].filter(el=>!el.disabled&&!el.hidden&&!el.closest('[hidden]'));
          const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
      }
      if(e.key==='Escape') {
        if(tutorialOpen)closeTutorial();else if(categoryDeleteOpen)cancelCategoryDelete();else if(categoryManagerOpen)closeCategoryManager();else if(discardOpen){document.getElementById('discardOverlay').hidden=true;document.getElementById('fieldCategory').focus();}else if(confirmOpen)closeConfirm();else if(variablesOpen)closeVariables();else if(editorOpen)closeModal();else if(detailOpen)closeDetail();
      }
      if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&editorOpen&&!discardOpen&&!confirmOpen) {e.preventDefault();onSave(e);}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!editorOpen&&!detailOpen&&!confirmOpen&&!variablesOpen&&!categoryManagerOpen&&!categoryDeleteOpen&&!tutorialOpen) {e.preventDefault();document.getElementById('searchInput').focus();}
    };
    document.addEventListener('keydown',keyHandler);
    async function refreshStored() {
      if(saving)return;
      try{const data=await store.get();if(data){baseline=clone(data.entries);categoryBaseline=[...data.categories];state.entries=data.entries.map(normalize).filter(Boolean);state.categoryNames=[...data.categories];if(state.category&&!state.categoryNames.includes(state.category))state.category=null;render();if(!document.getElementById('categoryManagerOverlay').hidden)renderCategoryManager();}}
      catch(error){storageStatus(tr('存储读取失败'),true);}
    }
    if(HAS_EXTENSION_STORAGE)chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[LIBRARY_KEY])refreshStored();if(SURFACE==='window'&&area==='session'&&changes[WINDOW_TARGET_KEY])extensionWindowId=changes[WINDOW_TARGET_KEY].newValue??null;if(area==='local'&&changes[PromptDockUI.KEY]&&!preferenceWrites)applyPreferences(changes[PromptDockUI.KEY].newValue);});
    else globalThis.window.addEventListener('storage',event=>{if(event.key===LIBRARY_KEY)refreshStored();if(event.key===PromptDockUI.KEY&&!preferenceWrites){try{applyPreferences(JSON.parse(event.newValue||'null'));}catch{}}});
  }
  async function init() {
    preferences=await PromptDockUI.load({extension:HAS_EXTENSION_STORAGE});
    PromptDockUI.apply(document,preferences);markup();bind();applyPreferences(preferences);
    const cleared=await PromptDockPrivacy.clearLegacySettings({extension:HAS_EXTENSION_STORAGE});
    document.getElementById('legacyCleanupNotice').hidden=cleared;
    try {
      const stored=await store.get();
      if(stored && (stored.entries.some(p=>!normalize(p)) || new Set(stored.entries.map(p=>p.id)).size!==stored.entries.length))throw Error(tr('存储记录损坏，原始数据未覆盖'));
      if(stored){baseline=clone(stored.entries);categoryBaseline=[...stored.categories];state.entries=stored.entries.map(normalize).filter(Boolean);state.categoryNames=[...stored.categories];storageStatus(memoryOnly?tr('当前预览暂存 · 请导出备份'):tr('已保存到本机'),memoryOnly);if(simplifyPresets())await persist();}
      else {state.entries=seeds();await persist(true);}
      document.getElementById('sessionNotice').hidden=!memoryOnly;
    } catch(err) {
      console.error(err);storageHealthy=false;state.entries=seeds();
      storageStatus(tr('存储不可用 · 可导出备份'),true);toast(tr('本地存储读取失败，原始数据未覆盖。请检查权限或备份。'),true);
    }
    state.initialized=true;render();
  }
  init().catch(error=>{console.error(error);document.getElementById('app').textContent=tr('PromptDock 启动失败，请重新加载页面。');});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
