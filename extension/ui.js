/* Local presentation settings and static UI translations; never translates library data. */
(() => {
  'use strict';
  const KEY='promptdock.ui.v1';
  const dictionary={
    '中文':'中文','语言':'Language','提示词仓':'Prompt library','夜间模式':'Dark mode','日间模式':'Light mode','界面设置暂存，关闭前可能不会保留':'Display settings are temporary and may not survive closing this window.',
    '通用':'General','刚刚':'Just now','插件后台未响应，请重新加载扩展':'The extension did not respond. Reload it and try again.','另一个窗口正在保存，请稍后重试':'Another window is saving. Please try again shortly.',
    '原始存储数据无法读取，请先导出备份':'The original library cannot be read. Export a backup first.','正在保存…':'Saving…','当前预览暂存 · 请导出备份':'Temporary preview · Export a backup','已保存到本机':'Saved locally','保存失败':'Save failed','保存失败 · 请重试':'Save failed · Try again','保存失败，请导出备份':'Save failed. Please export a backup.',
    '网页与插件各自本地保存 · 使用 JSON 导入 / 导出迁移你的提示词。':'The web preview and extension store data separately. Transfer prompts with JSON export and import.',
    '侧边栏':'Sidebar','独立小窗':'Floating window','置顶':'Pin on top','取消置顶':'Unpin','直接记录和取用；需要一直显示时点击「置顶」。':'Record and reuse prompts here. Choose “Pin on top” to keep them visible.',
    '选中文字 → 右键保存；取用时复制后粘贴到网页。':'Select text and right-click to save it. Copy prompts to use them on a website.',
    '本地保存 · 不连接模型接口':'Stored locally · No AI connection','浏览器本地保存 · 预览版不与扩展共享数据':'Stored in this browser · Separate from extension data',
    '本地提示词库':'Local prompt library','打开完整工作台':'Open full library','导出备份':'Export backup','新建提示词':'New prompt','MAKE IDEAS REUSABLE · 让灵感随时待命':'MAKE IDEAS REUSABLE',
    '好灵感，随手可取':'Great ideas, always handy','存起来、找得到、用得快。给每个好提示词一个固定的家。':'Save, find and reuse your best prompts. Give every good idea a home.',
    '已收录提示词':'Saved prompts','常用收藏':'Favorites','累计复制次数':'Total copies','旧版 API 配置暂未清理完成。本版不会使用或发送这些配置，重新打开后会再次尝试清理。':'Old API settings could not be cleared yet. This version does not use or transmit them and will retry next time.',
    '一个模板，反复使用':'One template, many uses','用 {{变量}} 替换每次要改的内容。':'Use {{variables}} for the parts that change.','了解变量':'About variables','窗口方式':'Window mode','提示词导航':'Prompt navigation','WORKSPACE · 工作台':'WORKSPACE','CATEGORIES · 分类':'CATEGORIES',
    '全部提示词':'All prompts','我的收藏':'Favorites','最近使用':'Recently used','管理':'Manage','变量说明':'Variable guide','导入提示词':'Import prompts','导出 JSON 备份':'Export JSON backup',
    '此预览环境限制了浏览器存储。内容可在当前页面暂存，关闭或刷新前请导出 JSON 备份；下载后用 Edge 打开可使用本地保存。':'Browser storage is restricted in this preview. Export a JSON backup before closing or refreshing. Download this HTML and open it in Edge for local storage.',
    '搜索提示词':'Search prompts','搜索标题、内容、标签...':'Search titles, content, tags…','排序方式':'Sort order','最近更新':'Recently updated','最近创建':'Recently created','标题 A–Z':'Title A–Z','复制最多':'Most copied','清除筛选':'Clear filters','显示方式':'View mode','卡片视图':'Card view','列表视图':'List view','加载更多提示词':'Load more prompts',
    '把创作时间留给灵感，把重复工作交给 PromptDock。':'Spend your time creating. Let PromptDock handle repetition.','变量是什么？':'What are variables?','关闭变量说明':'Close variable guide','知道了':'Got it','用示例试一下':'Try the example','关闭编辑弹窗':'Close editor',
    '提示词名称':'Prompt title','例如：电影感特写镜头':'e.g. Cinematic close-up','所属分类':'Category','＋ 自定义分类':'+ Custom category','新分类名称':'New category name','例如：我的短剧、产品广告、水墨项目':'e.g. Short films, ads, ink art','随这条提示词一起保存，之后可直接选择此分类。':'Saved with this prompt and available for future prompts.',
    '标签':'Tags','用逗号分隔，如：写实, 特写':'Separate with commas, e.g. realistic, close-up','简短说明（可选）':'Description (optional)','这个提示词适合什么场景？':'What is this prompt useful for?','提示词内容':'Prompt content','粘贴或输入你的提示词...':'Paste or write your prompt…',
    ' · 用 {{角色}} 或【场景】建立可填写模板。Ctrl + Enter 保存。':' · Use {{character}} or 【scene】 for variables. Ctrl + Enter to save.',
    '删除':'Delete','取消':'Cancel','保存提示词':'Save prompt','关闭详情':'Close details','创建副本':'Duplicate','分享 JSON':'Share JSON','编辑':'Edit','复制全文':'Copy full prompt','填写变量，快速复用':'Fill variables and reuse','关闭变量填写':'Close variables',
    '只替换本次复制的内容，不会修改原提示词。':'Only this copy is changed. The original template stays intact.','实时预览':'Live preview','返回':'Back','复制填写后的内容':'Copy filled prompt','确定删除这个提示词？':'Delete this prompt?','删除后无法撤销。建议定期导出备份，以免重要内容丢失。':'This cannot be undone. Export backups regularly to protect important content.','确认删除':'Delete prompt',
    '保留刚才的修改？':'Keep your changes?','提示词尚未保存。你可以继续编辑，或放弃本次修改。':'This prompt has unsaved changes. Continue editing or discard them.','继续编辑':'Keep editing','放弃修改':'Discard changes','分类管理':'Manage categories','关闭分类管理':'Close category manager','新建分类':'New category','＋ 新建分类':'+ New category','添加分类':'Add category','例如：水墨短片、广告项目':'e.g. Ink films, advertising',
    '分类可以单独保存。重命名会更新其中的提示词；删除只移除分类，提示词归入「通用」。':'Categories can be saved independently. Renaming updates their prompts. Deleting moves prompts to General.','删除分类？':'Delete category?','删除分类':'Delete category','全部标签':'All tags',' 条结果':' results','（还有 ':'(', ' 条）':' more)',' · 已用 ':' · Used ',' 次':' times','填写模板变量':'Fill template variables','复制':'Copy','编辑提示词':'Edit prompt',
    '你的提示词库准备好了':'Your prompt library is ready','没有找到匹配的提示词':'No matching prompts','添加第一条提示词，把创作经验变成可反复调用的灵感资产。':'Add your first prompt and turn creative experience into reusable ideas.','试试其他关键词，或者清除标签及分类筛选。':'Try different keywords or clear the tag and category filters.','新建第一条':'Add first prompt','查看全部提示词':'View all prompts','取消收藏':'Remove favorite','加入收藏':'Add favorite','未添加说明。点击标题查看完整内容。':'No description. Open the title to view the full prompt.','这个提示词暂时没有说明。':'No description for this prompt yet.',
    '填写变量并复制 · ':'Fill variables and copy · ',' 项':' fields','创建于 ':'Created ',' · 更新于 ':' · Updated ',' · 已复制 ':' · Copied ','该提示词没有【变量】或 {{变量}} 占位符':'This prompt has no 【variable】 or {{variable}} placeholders.','例如：':'e.g. ','输入':'Enter ','（留空保留占位符）':' (leave blank to keep the placeholder)',
    '复制失败，请手动选择预览文本':'Copy failed. Select the preview text manually.','已复制填写后的提示词':'Filled prompt copied','请输入自定义分类名称':'Enter a custom category name','名称和内容不能为空':'Title and content are required','。输入内容仍保留。':'. Your draft is preserved.','已暂存到当前预览，关闭前请导出备份':'Saved temporarily. Export a backup before closing.','提示词已更新':'Prompt updated','已保存到提示词库':'Prompt saved','复制失败，请在详情中手动复制':'Copy failed. Copy manually from the details.','已复制到剪贴板':'Copied to clipboard','已加入收藏':'Added to favorites','已取消收藏':'Removed from favorites','提示词已删除':'Prompt deleted','已创建副本，可继续编辑':'Duplicate created. You can edit it now.',
    '已导出 ':'Exported ',' 条提示词':' prompts','PromptDock-备份-':'PromptDock-backup-','PromptDock-分享-':'PromptDock-share-',' · 副本':' · Copy','正在保存，请稍后导入':'Saving. Please import after it finishes.','文件过大，请导入小于 3 MB 的 JSON':'Import a JSON file smaller than 3 MB.','JSON 结构不正确':'Invalid JSON structure','单次导入超过 5000 条':'Import no more than 5,000 prompts at a time.','成功导入 ':'Imported ',' 条':' prompts','，跳过 ':'; skipped ',' 条重复/无效内容':' duplicate or invalid entries','导入失败：请检查 JSON 文件格式':'Import failed. Check the JSON format.',
    '默认归档':'Default category','重命名':'Rename','重命名分类':'Rename category','保存名称':'Save name','请输入 1–28 个字符的分类名称':'Use 1–28 characters for the category name.','这个分类已经存在，请换一个名称':'This category already exists. Choose another name.','默认归档分类不能重命名':'The default category cannot be renamed.','分类已暂存，关闭前请导出备份':'Category saved temporarily. Export a backup before closing.','分类已重命名':'Category renamed','分类已新建':'Category created','分类已删除，提示词已保留':'Category deleted. Prompts were kept.',
    '删除「':'Delete “','」后，':'”? ',' 条提示词将移到「通用」，内容不会被删除。':' prompts will move to General. Their content will be kept.',
    '变量就是提示词里':'Variables are the parts of a prompt that ','每次要替换的部分':'change each time','。保存一份模板，换个内容就能再次使用。':'. Save one template and reuse it with different values.','保存的模板':'Saved template','为{{主体}}创作电影感画面。场景：{{场景}}。':'Create a cinematic image of {{subject}}. Setting: {{scene}}.','填好后复制的内容':'Filled copy','为一位撑伞的旅人创作电影感画面。场景：雨后的老街。':'Create a cinematic image of a traveler with an umbrella. Setting: an old street after rain.',
    '写：':'Write:','在正文中把变化的内容写成 ':'Use placeholders in the prompt, such as ','{{主体}}':'{{subject}}','{{场景}}':'{{scene}}','、':' and ','。':'.','填：':'Fill:','打开提示词，点击「填写变量并复制」，输入本次需要的内容。':'Open a prompt, choose “Fill variables and copy”, and enter the values you need.','用：':'Use:','点击「复制填写后的内容」，粘贴到 AI 网站。':'Choose “Copy filled prompt” and paste it into your AI website.','也支持 【主体】 写法。填写只影响本次复制，原模板会保留；留空的变量保持原样。':'The 【subject】 format also works. Filling variables changes only this copy. Blank fields keep their placeholders.',
    '正在保存，请稍候':'Saving. Please wait.','先在提示词正文中写 {{变量名}}，保存后即可填写。':'Add {{variable}} placeholders to a prompt, save it, then fill them in.','请先保存或关闭当前编辑，再切换窗口':'Save or close the editor before switching windows.','暂时无法打开侧边栏，请使用独立小窗，或按 Ctrl+Shift+Y 重试。':'Cannot open the sidebar yet. Use the floating window or try Ctrl+Shift+Y.','小窗打开失败，请重新加载扩展':'Cannot open the floating window. Reload the extension.','窗口打开失败，请重试':'Cannot open the window. Please try again.',
    '已置顶。请保留来源小窗；关闭浮窗后会返回。':'Pinned. Keep the source window open. Closing this window returns to it.','可以拖动和调整大小；点击「置顶」在其他窗口上方取用。':'Move or resize this window. Choose “Pin on top” to keep it visible.','浏览器未允许置顶浮窗，请直接点击「置顶」重试。':'The browser did not allow pinning. Click “Pin on top” again.','置顶失败，请重试':'Pinning failed. Please try again.','当前 Edge 不支持置顶浮窗。Windows 可用 PowerToys 的 Win+Ctrl+T 置顶普通小窗。':'This browser does not support pinned windows. On Windows, PowerToys can pin the normal window with Win+Ctrl+T.','置顶浮窗已关闭，请重试':'The pinned window closed. Please try again.','置顶浮窗已开启':'Pinned window is open','请保留这个来源小窗。关闭浮窗后，提示词界面会返回这里。关闭来源小窗也会关闭浮窗。':'Keep this source window open. Closing the pinned window returns the app here. Closing the source window also closes the pinned window.','返回普通小窗':'Return to normal window','PromptDock · 置顶浮窗':'PromptDock · Pinned window',
    '存储读取失败':'Cannot read storage','存储记录损坏，原始数据未覆盖':'Stored records are invalid. Original data was not overwritten.','存储不可用 · 可导出备份':'Storage unavailable · Export a backup','本地存储读取失败，原始数据未覆盖。请检查权限或备份。':'Cannot read local storage. Original data was kept. Check permissions or export a backup.','PromptDock 启动失败，请重新加载页面。':'PromptDock could not start. Reload this page.',
    '这条提示词已在其他窗口更新，请重新打开后再修改':'This prompt changed in another window. Reopen it before editing.','无效的保存请求':'Invalid save request','无效的记录':'Invalid record','记录格式或长度不正确':'Invalid record format or length','原始提示词存储损坏，未覆盖':'Original prompt storage is invalid and was not overwritten.','提示词库格式损坏，未覆盖':'Invalid library format. Original data was kept.','无效分类请求':'Invalid category request','无效分类名称':'Invalid category name','通用是默认归档分类，不能删除或重命名':'General is the default category and cannot be deleted or renamed.','分类已在其他窗口修改，请重新打开分类管理':'Categories changed in another window. Reopen category management.','分类仍包含其他窗口新增的提示词，请刷新后重试':'Another window added prompts to this category. Refresh and try again.','保存选中文本到 PromptDock':'Save selection to PromptDock','PromptDock · 打开独立小窗':'PromptDock · Open floating window','小窗打开失败，请重新加载扩展后重试':'Cannot open the floating window. Reload the extension and try again.','保存失败，请打开提示词仓检查存储并重试':'Save failed. Open PromptDock to check storage and try again.'
  };
  const reverse=new Map(Object.entries(dictionary).map(([key,value])=>[value,key]));
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=value=>({language:value?.language==='en'?'en':'zh',theme:value?.theme==='dark'?'dark':'light'});
  const translate=(text,language='zh')=>{const key=Object.hasOwn(dictionary,text)?text:reverse.get(text);return key?(language==='en'?dictionary[key]:key):text;};
  const phrases=Object.keys(dictionary).sort((a,b)=>b.length-a.length);
  function textFragment(text,language,markup=false) {
    let out='';
    for(let i=0;i<text.length;){const key=phrases.find(k=>text.startsWith(k,i));if(key){const value=translate(key,language);out+=markup?`<span data-i18n="${escape(key)}">${escape(value)}</span>`:value;i+=key.length;}else out+=text[i++];}
    return out;
  }
  function fragment(raw,{language='zh',html=false,inTag=false,inOption=false}={}) {
    if(!html)return textFragment(raw,language);
    let out='',index=0,option=inOption,tag=inTag;
    while(index<raw.length){
      if(tag||raw[index]==='<'){
        const end=raw.indexOf('>',index),chunk=raw.slice(index,end<0?raw.length:end+1);
        if(/^<option\b/i.test(chunk))option=true;if(/^<\/option\b/i.test(chunk))option=false;
        if(end<0){out+=textFragment(chunk,language);break;}
        out+=chunk.replace(/\b(placeholder|title|aria-label)="([^"]*)"/g,(match,attr,value)=>Object.hasOwn(dictionary,value)?`data-i18n-${attr}="${escape(value)}" ${attr}="${escape(translate(value,language))}"`:match);
        index=end+1;tag=false;
      }else{const end=raw.indexOf('<',index),chunk=raw.slice(index,end<0?raw.length:end);out+=textFragment(chunk,language,!option);index=end<0?raw.length:end;}
    }
    return out;
  }
  function apply(document,settings) {
    if(!document?.documentElement)return;
    document.documentElement.lang=settings.language==='en'?'en':'zh-CN';document.documentElement.dataset.theme=settings.theme;document.documentElement.style.colorScheme=settings.theme;
    document.title=document.body?.dataset.pinned==='true'?translate('PromptDock · 置顶浮窗',settings.language):'PromptDock 1.4.1 · '+translate('提示词仓',settings.language);
    for(const node of document.querySelectorAll('[data-i18n]'))node.textContent=translate(node.getAttribute('data-i18n'),settings.language);
    for(const attr of ['placeholder','title','aria-label'])for(const node of document.querySelectorAll(`[data-i18n-${attr}]`))node.setAttribute(attr,translate(node.getAttribute(`data-i18n-${attr}`),settings.language));
    for(const node of document.querySelectorAll('#sortSelect option'))node.textContent=translate(node.textContent,settings.language);
    const language=document.getElementById('uiLanguage');if(language)language.value=settings.language;
    const theme=document.getElementById('uiTheme');if(theme){theme.textContent=translate(settings.theme==='dark'?'日间模式':'夜间模式',settings.language);theme.setAttribute('aria-pressed',String(settings.theme==='dark'));}
  }
  async function load({extension=false}={}) {try {return normalize(extension?(await chrome.storage.local.get(KEY))[KEY]:JSON.parse(localStorage.getItem(KEY)||'null'));}catch{return normalize();}}
  async function save(value,{extension=false}={}) {const settings=normalize(value);if(extension)await chrome.storage.local.set({[KEY]:settings});else localStorage.setItem(KEY,JSON.stringify(settings));return settings;}
  globalThis.PromptDockUI={KEY,dictionary,normalize,translate,fragment,apply,load,save};
})();
