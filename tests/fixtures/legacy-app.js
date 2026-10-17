
/* PromptDock 1.1 — offline-first prompt library. No remote services required. */
(() => {
  'use strict';
  const KEY = 'promptdock.entries.v1';
  const MODE = document.body.dataset.mode;
  const HAS_EXTENSION_STORAGE = location.protocol === 'chrome-extension:' && typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  const DAYS = 24 * 60 * 60 * 1000;
  const FIXED_CATEGORIES = ['通用', '文生图', '图生视频', '角色设定', '场景设计', '镜头语言', '剧本创作', '网页摘录', '其他'];
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
  const dateShort = (iso) => { const d = new Date(iso); return isNaN(d) ? '刚刚' : `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`; };
  const normalize = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    const title = String(obj.title||'').trim().slice(0,150);
    const content = String(obj.content||'').trim().slice(0,30000);
    if (!title || !content) return null;
    const createdAt = !isNaN(Date.parse(obj.createdAt)) ? obj.createdAt : new Date().toISOString();
    return {
      id: String(obj.id||uid()).slice(0,100), title,
      description:String(obj.description||'').trim().slice(0,750), content,
      category:String(obj.category||'其他').trim().slice(0,28) || '其他', tags:cleanTags(obj.tags),
      favorite:obj.favorite === true, createdAt,
      updatedAt:!isNaN(Date.parse(obj.updatedAt)) ? obj.updatedAt : createdAt,
      usedAt:obj.usedAt && !isNaN(Date.parse(obj.usedAt)) ? obj.usedAt : null,
      useCount:Number.isFinite(Number(obj.useCount)) ? Math.max(0, Math.min(999999,Math.trunc(Number(obj.useCount)))) : 0
    };
  };

  function seeds() {
    const samples = [
      {title:'电影级写实质感 · 全局风格', category:'通用', tags:['写实','电影质感','光影'], description:'统一影像质感，适合作为任何影视生成提示词的风格前缀。', content:'电影摄影级写实画面，物理摄影机拍摄质感，真实镜头光学特征，细微胶片颗粒。自然光与场景实际光源塑造明暗，主体位于阴影侧，柔和逆光与空气透视。真实材质、细微磨损与非对称细节，人物皮肤自然纹理。严格遵守重力、惯性、接触阴影与运动连续性。保持人物、服装、道具和场景一致。不出现文字、字幕、水印或品牌标志。'},
      {title:'角色设定三视图', category:'角色设定', tags:['三视图','角色资产','一致性'], description:'为 AI 短剧角色制作统一的正面、侧面、背面参考。', content:'为【角色名称】制作专业角色设定三视图。\n角色：年龄【年龄】，外形【外貌】，服装【服装】，发型【发型】。\n同一人物，同一套服饰，同一比例，同一配饰，完整展示正面、左侧面、背面。全身入镜，站姿自然，四肢无遮挡。纯白背景，均匀柔光，清晰材质细节。三个视角身份和造型完全统一。画面无文字、无标注、无水印。'},
      {title:'电影感场景概念图', category:'文生图', tags:['场景','构图','气氛'], description:'快速搭建富有叙事意味的环境概念画面。', content:'场景：【场景地点】。时间：【时段】。天气：【天气】。\n画面主视觉：【核心建筑或场景元素】，前景【前景遮挡】，中景【人物或主体】，背景【环境信息】。\n色彩以【主色】为主，少量【点缀色】制造视觉重心。光源来自【光源位置】，形成【光线气氛】。写实电影摄影构图，明确前中后景，透视严谨，空间结构合理，视觉引导清晰。无文字、无水印。'},
      {title:'15 秒连续动作分镜', category:'图生视频', tags:['动作','分镜','连续性'], description:'适合短时长多镜头视频，强调动作衔接与场面调度。', content:'生成一段不超过 15 秒的电影感连续动作视频，最多 5 个镜头。\n角色：【角色及服装】。场景：【地点与空间锚点】。\n镜头 1（【时长】秒）：【景别／机位】，角色【起始动作】。\n镜头 2（【时长】秒）：【景别／机位】，角色【承接动作】。\n镜头 3（【时长】秒）：【景别／机位】，角色【关键动作】。\n镜头 4（【时长】秒）：【景别／机位】，角色【结果反应】。\n全过程人物身份、服装、道具、布光、左右空间方向严格一致，动作符合真实物理规律，不越轴、不瞬移、不增加额外人物、台词、字幕、音乐或标志。'},
      {title:'镜头语言 · 情绪特写', category:'镜头语言', tags:['特写','表演','情绪'], description:'突出微表情与潜台词，让人物表演更有张力。', content:'人物：【角色】。正在经历的冲突：【冲突】。\n镜头为人物面部近景至特写，采用【侧前方三分之二角度】，镜头缓慢向前推进。面部微表情先出现【情绪 A】的细微迹象，随后眼神和嘴角短暂泄露【情绪 B】，最后重新克制。强调眼球微移、呼吸、短暂停顿与面部肌肉细节；表演内敛，不夸张。背景浅景深虚化，场景实际光源照明，镜头连贯稳定，无字幕、无多余台词。'},
      {title:'短剧悬念场景构思', category:'剧本创作', tags:['悬念','反转','故事'], description:'用视觉动作而非解释台词构建可拍摄的冲突。', content:'请围绕【主题／矛盾】构思一段 60–90 秒的可视化短剧。\n必须包含：1）人物具有明确的即时目标；2）画面中出现可被观众理解的障碍；3）通过一个具体动作或道具让事态升级；4）在结尾以新的视觉信息完成反转。\n限制：角色不超过【人数】个，场景不超过【数量】处，主要依靠行为、构图和细节叙事，避免大段说明对白。输出人物目标、剧情节拍和关键视觉镜头。'},
      {title:'诡异反派视觉设定', category:'角色设定', tags:['反派','水墨','概念设计'], description:'创造有压迫感但辨识度清晰的艺术化反派。', content:'设计一个名为【名称】的诡异反派。主视觉轮廓：【剪影特征】；标志性器物：【器物】；独特行动方式：【动作】。气质古老、沉静、极具压迫感，细节不堆砌，以轮廓和姿态塑造辨识度。整体色彩使用雾灰青、黛石黑、旧木褐等低饱和冷色，少量暗朱砂点缀。风格为写意水墨与可制作的 2.5D 角色设计融合。无文字与水印。'},
      {title:'场景空间一致性锁定', category:'场景设计', tags:['空间','轴线','连续性'], description:'避免跨镜头门窗错位、家具漂移和人物跳轴。', content:'场景：【场所】。建立以下固定空间锚点：入口门位于【位置】；窗位于【位置】；核心道具【道具】位于【位置】；主要人物起始站位【位置】。\n将空间定义为唯一稳定的三维布局。所有镜头使用同一坐标关系，同一家具摆放、建筑结构、光源方向和道具位置。运动时保证左右方向、视线关系、轴线与相对距离连续；镜头改变仅改变观察位置，不改变空间本身。'}
    ];
    return samples.map((x,i) => normalize({...x,id:uid(), favorite:i===0 || i===3,createdAt:new Date(Date.now()-(8-i)*DAYS).toISOString(),updatedAt:new Date(Date.now()-(8-i)*DAYS).toISOString()}));
  }

  const state = {entries:[],search:'',scope:'all',category:null,tag:null,sort:'updated',editingId:null,detailId:null,pendingDeleteId:null,templateId:null,templateFields:{},editorInitial:null,visibleLimit:60,initialized:false};
  let toastTimer;
  let writeQueue = Promise.resolve();
  let lastFocused = null;

  const store = {
    async get() {
      if (HAS_EXTENSION_STORAGE) return (await chrome.storage.local.get(KEY))[KEY];
      const raw = localStorage.getItem(KEY);
      try { return raw === null ? undefined : JSON.parse(raw); } catch { return undefined; }
    },
    async set(value) {
      if (HAS_EXTENSION_STORAGE) return chrome.storage.local.set({[KEY]:value});
      localStorage.setItem(KEY,JSON.stringify(value));
    }
  };
  function persist() {
    const snapshot = state.entries.map(p => ({...p,tags:[...p.tags]}));
    writeQueue = writeQueue.catch(()=>{}).then(() => store.set(snapshot)).catch(err => { console.error(err); toast('保存失败，请检查浏览器可用存储空间',true); });
    return writeQueue;
  }
  function toast(message, error=false) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.innerHTML = `${icon(error?'info':'check')}<span>${h(message)}</span>`;
    el.classList.add('shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('shown'), 2800);
  }
  function findEntry(id) { return state.entries.find(p=>p.id===id); }

  function markup() {
    document.getElementById('app').innerHTML = `
      <div class="app-shell">
        <header class="topbar">
          <div class="brand"><div class="brand-mark" aria-hidden="true">✳</div><div><div class="brand-name">prompt<span>dock.</span></div><div class="brand-caption">YOUR PROMPT LIBRARY</div></div></div>
          <div class="top-actions">
            <button class="btn export-top" id="topExport" type="button">${icon('download')} 导出备份</button>
            <button class="btn btn-primary" data-action="new" type="button">${icon('plus')} 新建提示词</button>
          </div>
        </header>
        <section class="hero">
          <div><p class="eyebrow">MAKE IDEAS REUSABLE · 让灵感随时待命</p><h1>好灵感，随手可取<span class="spark">✳</span></h1><p class="desc">存起来、找得到、用得快。给每个好提示词一个固定的家。</p></div>
          <div class="hero-stats"><div class="stat"><strong class="stat-value" id="statTotal">0</strong><span class="stat-label">已收录提示词</span></div><div class="stat"><strong class="stat-value" id="statFaves">0</strong><span class="stat-label">常用收藏</span></div><div class="stat"><strong class="stat-value" id="statCopies">0</strong><span class="stat-label">累计复制次数</span></div></div>
        </section>
        ${MODE==='preview' ? '<div class="page-notice">当前为独立网页预览：数据保存在此网页的浏览器本地空间中；安装扩展后，扩展拥有独立的提示词库，可用「导出 / 导入」迁移。</div>' : ''}
        <div class="workspace">
          <aside class="sidebar" aria-label="提示词导航">
            <div class="nav-heading">WORKSPACE · 工作台</div>
            <div class="nav-main">
              <button type="button" class="nav-button active" data-action="scope" data-scope="all">${icon('all')} 全部提示词 <span class="count" id="navAll">0</span></button>
              <button type="button" class="nav-button" data-action="scope" data-scope="favorite">${icon('star')} 我的收藏 <span class="count" id="navFavorites">0</span></button>
            </div>
            <div class="nav-divider"></div><div class="nav-heading category-heading">CATEGORIES · 分类</div>
            <div id="categoryNav"></div>
            <div class="nav-foot">
              <button id="sidebarImport" type="button">${icon('upload')} 导入提示词</button>
              <button id="sidebarExport" type="button">${icon('download')} 导出 JSON 备份</button>
              <p class="nav-hint">${MODE === 'extension' ? '仅保存在本机浏览器 · 不上传云端' : '浏览器本地保存 · 预览版不与扩展共享数据'}</p>
            </div>
          </aside>
          <main class="content">
            <div class="toolbar"><label class="search-wrap" aria-label="搜索提示词">${icon('search')}<input type="search" id="searchInput" placeholder="搜索标题、内容、标签..." autocomplete="off"/><kbd>Ctrl K</kbd></label>
              <select class="sort-select" id="sortSelect" aria-label="排序方式"><option value="updated">最近更新</option><option value="used">最近使用</option><option value="created">最近创建</option><option value="title">标题 A–Z</option><option value="popular">复制最多</option></select>
            </div>
            <div class="filter-header"><div class="results-title" id="resultsTitle">全部提示词 <span>0 条结果</span></div><button class="clear-filter" id="clearFilters" type="button">清除筛选</button></div>
            <div class="tag-row" id="tagRow"></div><div class="prompt-grid" id="cards"></div><div class="show-more" id="showMoreWrap" hidden><button type="button" class="btn" data-action="more">加载更多提示词 <span id="showMoreCount"></span></button></div>
            <footer class="footer"><span>把创作时间留给灵感，把重复工作交给 PromptDock。</span><span class="footer-mark">PROMPTDOCK / 1.1</span></footer>
          </main>
        </div>
      </div>
      <div class="overlay" id="editorOverlay" hidden>
        <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="editorTitle">
          <div class="dialog-head"><div><p class="overline">CURATE YOUR LIBRARY</p><h2 id="editorTitle">新建提示词</h2></div><button type="button" class="btn btn-icon" data-action="close-editor" aria-label="关闭编辑弹窗">${icon('close')}</button></div>
          <form id="editorForm" class="dialog-body" autocomplete="off">
            <div class="form-grid">
              <div class="field full"><label for="fieldTitle">提示词名称 <span class="required">*</span></label><input maxlength="150" id="fieldTitle" placeholder="例如：电影感特写镜头" required /></div>
              <div class="field"><label for="fieldCategory">所属分类</label><input id="fieldCategory" maxlength="28" list="categoryOptions" placeholder="例如：镜头语言"/><datalist id="categoryOptions"></datalist></div>
              <div class="field"><label for="fieldTags">标签</label><input id="fieldTags" placeholder="用逗号分隔，如：写实, 特写" maxlength="350"/></div>
              <div class="field full"><label for="fieldDescription">简短说明（可选）</label><input id="fieldDescription" maxlength="750" placeholder="这个提示词适合什么场景？"/></div>
              <div class="field full"><label for="fieldContent">提示词内容 <span class="required">*</span></label><textarea id="fieldContent" maxlength="30000" placeholder="粘贴或输入你的提示词..." required></textarea><div class="field-hint">支持任意文本，可使用【角色】【场景】等占位符方便日后修改。</div></div>
            </div><div class="form-error" id="formError" role="alert"></div>
          </form>
          <div class="dialog-footer"><button class="btn btn-danger btn-sm" type="button" id="deleteEntry" data-action="delete" hidden>${icon('trash')} 删除</button><div class="end"><button class="btn" type="button" data-action="close-editor">取消</button><button class="btn btn-primary" type="submit" form="editorForm" id="saveEntry">${icon('check')} 保存提示词</button></div></div>
        </section>
      </div>
      <div class="overlay" id="detailOverlay" hidden><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="detailTitle"><div class="dialog-head"><div><p class="overline">PROMPT DETAIL</p><h2 id="detailTitle"></h2></div><button class="btn btn-icon" type="button" data-action="close-detail" aria-label="关闭详情">${icon('close')}</button></div><div class="dialog-body" id="detailBody"></div><div class="dialog-footer detail-footer"><div class="end"><button type="button" class="btn" id="detailDuplicate">${icon('layers')} 创建副本</button><button type="button" class="btn" id="detailShare">${icon('share')} 分享 JSON</button></div><div class="end"><button type="button" class="btn" id="detailEdit">${icon('edit')} 编辑</button><button type="button" class="btn btn-primary" id="detailCopy">${icon('copy')} 复制全文</button></div></div></section></div>
      <div class="overlay" id="variablesOverlay" hidden><section class="dialog variable-dialog" role="dialog" aria-modal="true" aria-labelledby="variablesTitle"><div class="dialog-head"><div><p class="overline">PROMPT VARIABLES</p><h2 id="variablesTitle">填写变量，快速复用</h2></div><button type="button" class="btn btn-icon" data-action="close-variables" aria-label="关闭变量填写">${icon('close')}</button></div><div class="dialog-body"><p class="variable-hint">只替换本次复制的内容，不会修改原提示词。</p><div class="variable-fields" id="variableFields"></div><label class="preview-title" for="variablePreview">实时预览</label><div class="content-block variable-preview" id="variablePreview" role="textbox" aria-readonly="true" tabindex="0"></div></div><div class="dialog-footer"><button class="btn" type="button" data-action="close-variables">返回</button><button class="btn btn-primary" type="button" id="variableCopy">${icon('copy')} 复制填写后的内容</button></div></section></div>
      <div class="overlay" id="confirmOverlay" hidden><section class="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle"><h3 id="confirmTitle">确定删除这个提示词？</h3><p>删除后无法撤销。建议定期导出备份，以免重要内容丢失。</p><div class="confirm-actions"><button type="button" class="btn" data-action="cancel-delete">取消</button><button type="button" class="btn btn-danger" data-action="confirm-delete">${icon('trash')} 确认删除</button></div></section></div>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>
      <input type="file" id="importInput" accept="application/json,.json" hidden />`;
  }

  function categories() {
    const freq = new Map();
    for(const item of state.entries) freq.set(item.category,(freq.get(item.category)||0)+1);
    return [...freq.entries()].sort((a,b)=>{
      const ia = FIXED_CATEGORIES.indexOf(a[0]); const ib = FIXED_CATEGORIES.indexOf(b[0]);
      return (ia===-1?1000:ia)-(ib===-1?1000:ib) || a[0].localeCompare(b[0],'zh-CN');
    });
  }
  function renderCategories() {
    document.getElementById('navAll').textContent = state.entries.length;
    document.getElementById('navFavorites').textContent = state.entries.filter(p=>p.favorite).length;
    document.querySelectorAll('[data-action="scope"]').forEach(el=>el.classList.toggle('active',state.scope===el.dataset.scope && !state.category));
    document.getElementById('categoryNav').innerHTML = categories().map(([name,count]) =>
      `<button class="nav-button ${state.category===name?'active':''}" data-action="category" data-category="${h(name)}" type="button">${icon('folder')} <span>${h(name)}</span><span class="count">${count}</span></button>`).join('');
  }
  function renderTags() {
    const counts = new Map();
    const eligible = state.entries.filter(p=> (!state.category||p.category===state.category) && (state.scope!=='favorite'||p.favorite));
    for(const p of eligible) for(const tag of p.tags) counts.set(tag,(counts.get(tag)||0)+1);
    const top = [...counts.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'zh-CN')).slice(0,18);
    if(state.tag && !counts.has(state.tag)) state.tag = null;
    const chips = [`<button type="button" class="tag-chip ${state.tag===null?'selected':''}" data-action="tag" data-tag="">全部标签</button>`];
    for (const [tag] of top) chips.push(`<button type="button" class="tag-chip ${state.tag===tag?'selected':''}" data-action="tag" data-tag="${h(tag)}"># ${h(tag)}</button>`);
    if(state.tag && !top.some(([tag])=>tag===state.tag)) chips.push(`<button type="button" class="tag-chip selected" data-action="tag" data-tag="${h(state.tag)}"># ${h(state.tag)}</button>`);
    document.getElementById('tagRow').innerHTML=chips.join('');
  }
  function filtered() {
    const terms=state.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const list=state.entries.filter(p => (!state.category || p.category===state.category)
      && (state.scope!=='favorite'||p.favorite)
      && (!state.tag||p.tags.includes(state.tag))
      && (!terms.length || terms.every(term => [p.title,p.description,p.content,p.category,...p.tags].join('\n').toLocaleLowerCase().includes(term))));
    const descTime=(k)=>(a,b)=>new Date(b[k]||0)-new Date(a[k]||0) || a.title.localeCompare(b.title,'zh-CN');
    if(state.sort==='used') list.sort(descTime('usedAt'));
    else if(state.sort==='created') list.sort(descTime('createdAt'));
    else if(state.sort==='title') list.sort((a,b)=>a.title.localeCompare(b.title,'zh-CN'));
    else if(state.sort==='popular') list.sort((a,b)=>b.useCount-a.useCount || new Date(b.updatedAt)-new Date(a.updatedAt));
    else list.sort(descTime('updatedAt'));
    return list;
  }
  function renderCards() {
    const matches = filtered();
    const data = matches.slice(0,state.visibleLimit);
    const sectionName = state.category || (state.scope==='favorite'?'我的收藏':'全部提示词');
    document.getElementById('resultsTitle').innerHTML = `${h(sectionName)} <span>${matches.length} 条结果</span>`;
    document.getElementById('statTotal').textContent=state.entries.length;
    document.getElementById('statFaves').textContent=state.entries.filter(p=>p.favorite).length;
    document.getElementById('statCopies').textContent=state.entries.reduce((n,p)=>n+p.useCount,0);
    const active = !!(state.category||state.scope!=='all'||state.tag||state.search);
    document.getElementById('showMoreWrap').hidden = matches.length <= state.visibleLimit;
    document.getElementById('showMoreCount').textContent = `（还有 ${Math.max(0,matches.length-state.visibleLimit)} 条）`;
    document.getElementById('clearFilters').hidden=!active;
    if(!data.length) {
      const fresh = !state.entries.length;
      document.getElementById('cards').innerHTML = `<div class="empty"><div class="empty-icon">${icon(fresh?'spark':'search')}</div><h3>${fresh?'你的提示词库准备好了':'没有找到匹配的提示词'}</h3><p>${fresh?'添加第一条提示词，把创作经验变成可反复调用的灵感资产。':'试试其他关键词，或者清除标签及分类筛选。'}</p><button type="button" class="btn btn-primary" data-action="${fresh?'new':'reset'}">${icon(fresh?'plus':'arrow')} ${fresh?'新建第一条':'查看全部提示词'}</button></div>`;
      return;
    }
    document.getElementById('cards').innerHTML = data.map(p => `
      <article class="prompt-card" data-id="${h(p.id)}">
        <div class="card-top"><span class="cat-pill"><i class="cat-dot" aria-hidden="true"></i>${h(p.category)}</span><button type="button" class="favorite-btn ${p.favorite?'is-favorite':''}" aria-label="${p.favorite?'取消收藏':'加入收藏'}" title="${p.favorite?'取消收藏':'加入收藏'}" data-action="favorite" data-id="${h(p.id)}">${icon('star')}</button></div>
        <button class="card-title-link" type="button" data-action="view" data-id="${h(p.id)}"><h3 class="card-title">${h(p.title)}</h3></button>
        <p class="card-description">${h(p.description || '未添加说明。点击标题查看完整内容。')}</p>
        <div class="card-preview">${h(p.content)}</div>
        <div class="card-tags">${p.tags.slice(0,3).map(t=>`<span class="mini-tag"># ${h(t)}</span>`).join('')}${p.tags.length>3?`<span class="mini-tag">+${p.tags.length-3}</span>`:''}</div>
        <div class="card-bottom"><span class="meta">${dateShort(p.updatedAt)}${p.useCount?` · 已用 ${p.useCount} 次`:''}</span><div class="card-actions"><button class="btn btn-icon btn-sm" type="button" data-action="edit" data-id="${h(p.id)}" title="编辑" aria-label="编辑 ${h(p.title)}">${icon('edit')}</button><button class="copy-btn" type="button" data-action="copy" data-id="${h(p.id)}">${icon('copy')} 复制</button></div></div>
      </article>`).join('');
  }
  function render() { renderCategories(); renderTags(); renderCards(); }
  function openModal(id=null) {
    const p=id?findEntry(id):null;
    if(id&&!p) return;
    state.editingId=p?.id||null;
    lastFocused=document.activeElement;
    document.getElementById('editorTitle').textContent = p?'编辑提示词':'新建提示词';
    document.getElementById('fieldTitle').value=p?.title||'';
    document.getElementById('fieldCategory').value=p?.category||'通用';
    document.getElementById('fieldTags').value=p?.tags.join(', ')||'';
    document.getElementById('fieldDescription').value=p?.description||'';
    document.getElementById('fieldContent').value=p?.content||'';
    state.editorInitial=editorSignature();
    document.getElementById('formError').textContent='';
    document.getElementById('deleteEntry').hidden=!p;
    const categoriesList=[...new Set([...FIXED_CATEGORIES,...state.entries.map(e=>e.category)])];
    document.getElementById('categoryOptions').innerHTML=categoriesList.map(x=>`<option value="${h(x)}"></option>`).join('');
    document.getElementById('editorOverlay').hidden=false;
    document.body.style.overflow='hidden';
    document.getElementById('fieldTitle').focus();
  }
  function editorSignature() {
    return ['fieldTitle','fieldCategory','fieldTags','fieldDescription','fieldContent'].map(id=>document.getElementById(id).value).join('\u0000');
  }
  function closeModal(force=false) {
    if(!force && state.editorInitial!==null && editorSignature()!==state.editorInitial && !window.confirm('存在尚未保存的更改，确定放弃吗？')) return;
    document.getElementById('editorOverlay').hidden=true;
    document.body.style.overflow='';state.editingId=null;state.editorInitial=null;
    if(lastFocused?.isConnected) lastFocused.focus();
  }
  function viewDetail(id) {
    const p=findEntry(id); if(!p) return;
    state.detailId=id;lastFocused=document.activeElement;
    document.getElementById('detailTitle').textContent=p.title;
    document.getElementById('detailBody').innerHTML = `
      <p class="detail-desc">${h(p.description||'这个提示词暂时没有说明。')}</p>
      <div class="detail-info"><span class="cat-pill"><i class="cat-dot"></i>${h(p.category)}</span>${p.tags.map(t=>`<span class="mini-tag"># ${h(t)}</span>`).join('')}</div>
      ${variableNames(p.content).length?`<button type="button" class="btn btn-template" id="detailVars">${icon('variables')} 填写变量并复制 · ${variableNames(p.content).length} 项</button>`:''}
      <div class="content-block" id="detailContent"></div>
      <div class="detail-metadata">创建于 ${dateShort(p.createdAt)} · 更新于 ${dateShort(p.updatedAt)} · 已复制 ${p.useCount} 次</div>`;
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
      return value?.trim() ? value : whole;
    });
  }
  function renderVariablePreview() {
    const p=findEntry(state.templateId);
    if(p)document.getElementById('variablePreview').textContent=filledContent(p);
  }
  function openVariables(id) {
    const p=findEntry(id);if(!p)return;
    const names=variableNames(p.content);if(!names.length){toast('该提示词没有【变量】或 {{变量}} 占位符',true);return;}
    state.templateId=id;state.templateFields={};
    document.getElementById('variableFields').innerHTML=names.map((name,i)=>`<div class="field"><label for="var${i}">${h(name)}</label><input type="text" maxlength="1200" id="var${i}" data-varname="${h(name)}" placeholder="输入${h(name)}（留空则保留占位符）"></div>`).join('');
    document.getElementById('variablesOverlay').hidden=false;document.body.style.overflow='hidden';
    renderVariablePreview();document.querySelector('#variableFields input')?.focus();
  }
  function closeVariables() {
    document.getElementById('variablesOverlay').hidden=true;
    state.templateId=null;state.templateFields={};
    if(document.getElementById('detailOverlay').hidden)document.body.style.overflow='';
    else document.getElementById('detailVars').focus();
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
      const success=document.execCommand('copy');temp.remove();
      return success;
    }
  }
  async function copyVariables() {
    const p=findEntry(state.templateId);if(!p)return;
    const success=await copyText(filledContent(p));
    if(!success){toast('复制失败，请手动选择预览文本',true);return;}
    p.useCount++;p.usedAt=new Date().toISOString();persist();renderCards();
    closeVariables();
    const meta=document.querySelector('#detailBody .detail-metadata');
    if(meta)meta.textContent=`创建于 ${dateShort(p.createdAt)} · 更新于 ${dateShort(p.updatedAt)} · 已复制 ${p.useCount} 次`;
    toast('已复制填写后的提示词');
  }
  function onSave(evt) {
    evt.preventDefault();
    const title=document.getElementById('fieldTitle').value.trim();
    const content=document.getElementById('fieldContent').value.trim();
    if(!title||!content) {document.getElementById('formError').textContent='名称和内容不能为空';return;}
    const now=new Date().toISOString();
    const prev=state.editingId?findEntry(state.editingId):null;
    const data=normalize({
      id:prev?.id||uid(),title,content,description:document.getElementById('fieldDescription').value,
      category:document.getElementById('fieldCategory').value||'其他',
      tags:document.getElementById('fieldTags').value,favorite:prev?.favorite||false,
      createdAt:prev?.createdAt||now,updatedAt:now,usedAt:prev?.usedAt||null,useCount:prev?.useCount||0
    });
    if(!data) return;
    if(prev) state.entries=state.entries.map(p=>p.id===prev.id?data:p);
    else state.entries.unshift(data);
    persist();closeModal(true);render();toast(prev?'提示词已更新':'已保存到提示词库');
  }
  async function copyEntry(id) {
    const p=findEntry(id);if(!p)return;
    const success=await copyText(p.content);
    if(!success){toast('复制失败，请在详情中手动复制',true);return;}
    p.useCount+=1;p.usedAt=new Date().toISOString();
    persist();renderCards();toast('已复制到剪贴板');
    if(state.detailId===id) {
      const el=document.querySelector('#detailBody .detail-metadata');
      if(el)el.textContent=`创建于 ${dateShort(p.createdAt)} · 更新于 ${dateShort(p.updatedAt)} · 已复制 ${p.useCount} 次`;
    }
  }
  function toggleFavorite(id) {
    const p=findEntry(id);if(!p)return;
    p.favorite=!p.favorite;p.updatedAt=new Date().toISOString();
    persist();render();toast(p.favorite?'已加入收藏':'已取消收藏');
  }
  function requestDelete() {
    if(!state.editingId) return;
    state.pendingDeleteId=state.editingId;
    document.getElementById('confirmOverlay').hidden=false;
    document.querySelector('#confirmOverlay [data-action="cancel-delete"]').focus();
  }
  function closeConfirm() {state.pendingDeleteId=null;document.getElementById('confirmOverlay').hidden=true;}
  function confirmDelete() {
    const id=state.pendingDeleteId;if(!id)return;
    state.entries=state.entries.filter(p=>p.id!==id);
    closeConfirm();closeModal(true);persist();render();toast('提示词已删除');
  }
  function resetFilters() {
    state.search='';state.scope='all';state.category=null;state.tag=null;
    state.visibleLimit=60;document.getElementById('searchInput').value='';render();
  }
  function downloadItems(items, filename) {
    const payload={app:'PromptDock',formatVersion:1,exportedAt:new Date().toISOString(),prompts:items};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download=filename;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    toast(`已导出 ${items.length} 条提示词`);
  }
  function downloadBackup() { downloadItems(state.entries, `PromptDock-备份-${new Date().toISOString().slice(0,10)}.json`); }
  function shareEntry(id) {
    const p=findEntry(id);if(!p)return;
    const name=p.title.replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').slice(0,42).trim()||'prompt';
    downloadItems([p],`PromptDock-分享-${name}.json`);
  }
  function duplicateEntry(id) {
    const p=findEntry(id);if(!p)return;
    const now=new Date().toISOString();
    const duplicate=normalize({...p,id:uid(),title:`${p.title} · 副本`.slice(0,150),favorite:false,createdAt:now,updatedAt:now,usedAt:null,useCount:0});
    state.entries.unshift(duplicate);persist();render();closeDetail();openModal(duplicate.id);toast('已创建副本，可继续编辑');
  }
  async function importBackup(file) {
    if(!file)return;
    if(file.size>3*1024*1024) {toast('文件过大，请导入小于 3 MB 的 JSON',true);return;}
    try {
      const obj=JSON.parse(await file.text());
      const list=Array.isArray(obj)?obj:(Array.isArray(obj?.prompts)?obj.prompts:null);
      if(!list) throw Error('JSON 结构不正确');
      if(list.length>5000) throw Error('单次导入超过 5000 条');
      const existing=new Set(state.entries.map(p=>`${p.title.toLowerCase()}\u0000${p.content.toLowerCase()}`));
      const ids=new Set(state.entries.map(p=>p.id));
      let added=0,ignored=0;
      for(const item of list) {
        const p=normalize(item);
        if(!p){ignored++;continue;}
        const sig=`${p.title.toLowerCase()}\u0000${p.content.toLowerCase()}`;
        if(existing.has(sig)){ignored++;continue;}
        if(ids.has(p.id))p.id=uid();
        state.entries.push(p);existing.add(sig);ids.add(p.id);added++;
      }
      if(added)await persist();
      render();toast(`成功导入 ${added} 条${ignored?`，跳过 ${ignored} 条重复/无效内容`:''}`);
    } catch(error) {console.warn(error);toast('导入失败：请检查 JSON 文件格式',true);}
    document.getElementById('importInput').value='';
  }
  function bind() {
    document.body.addEventListener('click', async e=>{
      const el=e.target.closest('[data-action]');if(!el)return;
      const a=el.dataset.action,id=el.dataset.id;
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
    document.getElementById('editorForm').addEventListener('submit',onSave);
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
    for(const id of ['editorOverlay','detailOverlay','variablesOverlay','confirmOverlay']) {
      document.getElementById(id).addEventListener('click',e=>{
        if(e.target!==e.currentTarget)return;
        if(id==='editorOverlay')closeModal();
        if(id==='detailOverlay')closeDetail();
        if(id==='confirmOverlay')closeConfirm();
        if(id==='variablesOverlay')closeVariables();
      });
    }
    document.addEventListener('keydown',e=>{
      const editorOpen=!document.getElementById('editorOverlay').hidden;
      const detailOpen=!document.getElementById('detailOverlay').hidden;
      const confirmOpen=!document.getElementById('confirmOverlay').hidden;
      const variablesOpen=!document.getElementById('variablesOverlay').hidden;
      if(e.key==='Escape') {
        if(confirmOpen)closeConfirm();else if(variablesOpen)closeVariables();else if(editorOpen)closeModal();else if(detailOpen)closeDetail();
      }
      if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&editorOpen) {e.preventDefault();document.getElementById('editorForm').requestSubmit();}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!editorOpen&&!detailOpen&&!confirmOpen&&!variablesOpen) {e.preventDefault();document.getElementById('searchInput').focus();}
    });
    if(HAS_EXTENSION_STORAGE) {
      chrome.storage.onChanged.addListener((changes,area)=>{
        if(area!=='local'||!changes[KEY])return;
        const list=changes[KEY].newValue;
        if(!Array.isArray(list))return;
        state.entries=list.map(normalize).filter(Boolean);
        render();
      });
    } else {
      window.addEventListener('storage',(evt)=>{
        if(evt.key!==KEY)return;
        try {const data=JSON.parse(evt.newValue);if(Array.isArray(data)){state.entries=data.map(normalize).filter(Boolean);render();}} catch {}
      });
    }
  }
  async function init() {
    markup();bind();
    try {
      const stored=await store.get();
      if(Array.isArray(stored)) state.entries=stored.map(normalize).filter(Boolean);
      else {state.entries=seeds();await persist();}
    } catch(err) {
      console.error(err);state.entries=seeds();toast('本地存储不可用，本次数据可能无法保存',true);
    }
    state.initialized=true;render();
  }
  init();
})();

