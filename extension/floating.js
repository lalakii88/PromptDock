/* One DOM tree and one application state, moved into a browser-managed PiP window. */
(() => {
  'use strict';
  function create({sourceWindow,root,onChange=()=>{},translate=text=>text}) {
    const sourceDocument=sourceWindow.document;
    let floatingWindow=null,placeholder=null,pending=false;
    function refresh() {
      if(!placeholder)return;
      const [title,note,button]=placeholder.children;
      title.textContent=translate('置顶浮窗已开启');note.textContent=translate('请保留这个来源小窗。关闭浮窗后，提示词界面会返回这里。关闭来源小窗也会关闭浮窗。');button.textContent=translate('返回普通小窗');
    }
    function restore() {
      if(!floatingWindow)return;
      const oldWindow=floatingWindow;floatingWindow=null;
      if(placeholder?.parentNode){placeholder.parentNode.insertBefore(root,placeholder);placeholder.remove();}
      else sourceDocument.body.appendChild(root);
      placeholder=null;
      onChange({window:sourceWindow,document:sourceDocument,pinned:false});
      return oldWindow;
    }
    function close() {
      const oldWindow=restore();
      if(oldWindow&&!oldWindow.closed)oldWindow.close();
    }
    async function toggle() {
      if(pending)return false;
      if(floatingWindow){close();sourceWindow.focus();return false;}
      const api=sourceWindow.documentPictureInPicture;
      if(typeof api?.requestWindow!=='function')throw Error('当前 Edge 不支持置顶浮窗。Windows 可用 PowerToys 的 Win+Ctrl+T 置顶普通小窗。');
      pending=true;
      let opened;
      try {
        // The browser request is made synchronously from the button click, before any await.
        opened=await api.requestWindow({width:440,height:720});
        if(opened.closed)throw Error('置顶浮窗已关闭，请重试');
        const target=opened.document;
        target.title=translate('PromptDock · 置顶浮窗');
        target.documentElement.lang=sourceDocument.documentElement.lang||'zh-CN';
        Object.assign(target.documentElement.dataset,sourceDocument.documentElement.dataset);
        Object.assign(target.body.dataset,sourceDocument.body.dataset,{pinned:'true'});
        target.body.style.overflow=sourceDocument.body.style.overflow;
        for(const node of sourceDocument.querySelectorAll('link[rel="stylesheet"],style,meta[http-equiv="Content-Security-Policy"]')) {
          const copy=node.cloneNode(true);
          if(node.tagName==='LINK')copy.href=node.href;
          target.head.appendChild(copy);
        }
        placeholder=sourceDocument.createElement('section');
        placeholder.className='pin-placeholder';
        const title=sourceDocument.createElement('h2');title.textContent='置顶浮窗已开启';
        const note=sourceDocument.createElement('p');note.textContent='请保留这个来源小窗。关闭浮窗后，提示词界面会返回这里。关闭来源小窗也会关闭浮窗。';
        const button=sourceDocument.createElement('button');button.className='btn btn-primary';button.type='button';button.textContent='返回普通小窗';button.addEventListener('click',close);
        placeholder.append(title,note,button);
        refresh();
        root.parentNode.insertBefore(placeholder,root);
        floatingWindow=opened;
        opened.addEventListener('pagehide',()=>{if(floatingWindow===opened)restore();},{once:true});
        target.body.appendChild(root);
        onChange({window:opened,document:target,pinned:true});
        return true;
      } catch(error) {
        if(floatingWindow===opened)restore();
        if(opened&&!opened.closed)opened.close();
        throw error;
      } finally {pending=false;}
    }
    return {toggle,close,refresh,get pinned(){return Boolean(floatingWindow);},get pending(){return pending;}};
  }
  globalThis.PromptDockFloating={create};
})();
