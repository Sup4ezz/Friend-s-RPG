/* LORGUS admin lore editor: custom trees/entities + illustrations for any existing lore note. */
(() => {
  const BUCKET = "lorgus-lore-images";
  const $ = (tag, cls, value) => { const n = document.createElement(tag); if (cls) n.className = cls; if (value !== undefined) n.textContent = value; return n; };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  let activeRoot = null, nav = null, doc = null, toolbar = null, customEntries = [], selectedCustomId = null, selectedStaticFile = null;
  const client = () => window.supabaseClient;
  const imageUrl = path => path ? client()?.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl || "" : "";

  function setStatus(message, error = false) {
    const status = toolbar?.querySelector(".lorgus-lore-editor-status");
    if (status) { status.textContent = message; status.classList.toggle("is-error", error); }
  }
  function rowById(id) { return customEntries.find(row => row.id === id); }
  function childrenOf(id) { return customEntries.filter(row => (row.parent_id || null) === (id || null)).sort((a,b) => (a.sort_order||0)-(b.sort_order||0) || a.title.localeCompare(b.title,"ru")); }

  async function loadEntries() {
    const db = client();
    if (!db) { setStatus("Нет подключения к Supabase.", true); return; }
    const result = await db.from("lorgus_lore_custom_entries").select("*").order("sort_order").order("title");
    if (result.error) { setStatus("Не удалось загрузить пользовательский лор: " + result.error.message, true); return; }
    customEntries = result.data || [];
    renderCustomTree();
  }

  function makeCustomNode(row, depth = 0) {
    const children = childrenOf(row.id);
    const wrap = $("div", "lorgus-lore-node lorgus-lore-custom-node" + (children.length ? " has-children" : ""));
    wrap.dataset.customNodeId = row.id;
    wrap.dataset.depth = String(depth);
    const line = $("div", "lorgus-lore-custom-line");
    const button = $("button", "lorgus-lore-node-button " + (children.length ? "is-folder" : "is-file"), row.kind === "tree" ? "♜" : "✦");
    button.type = "button";
    if (children.length) { button.dataset.loreToggle = "1"; button.setAttribute("aria-expanded", "false"); }
    else button.dataset.loreCustomOpen = row.id;
    const label = $("span", "lorgus-lore-node-label", row.title);
    button.replaceChildren($("span", "lorgus-lore-node-icon", children.length ? "▸" : (row.kind === "tree" ? "♜" : "✦")), label);
    if (!row.is_published) button.classList.add("is-unpublished");
    line.append(button);
    if (children.length) line.append($("span", "lorgus-lore-node-count", String(children.length)));
    const edit = $("button", "lorgus-lore-custom-edit", "✎"); edit.type = "button"; edit.title = "Редактировать"; edit.dataset.loreCustomEdit = row.id;
    line.append(edit); wrap.append(line);
    if (children.length) {
      const childBox = $("div", "lorgus-lore-children"); childBox.hidden = true;
      children.forEach(child => childBox.append(makeCustomNode(child, depth + 1)));
      wrap.append(childBox);
    }
    return wrap;
  }

  function renderCustomTree() {
    if (!nav) return;
    nav.querySelectorAll(":scope > .lorgus-lore-custom-root").forEach(el => el.remove());
    const roots = customEntries.filter(row => row.kind === "tree" && !row.parent_id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||a.title.localeCompare(b.title,"ru"));
    roots.forEach(row => {
      const node = makeCustomNode(row);
      node.classList.add("lorgus-lore-custom-root");
      nav.append(node);
    });
  }

  function selectCustom(id) {
    selectedCustomId = id || null;
    selectedStaticFile = null;
    const add = toolbar?.querySelector('[data-action="add-entity"]');
    if (add) add.disabled = !selectedCustomId;
    const attach = toolbar?.querySelector('[data-action="attach-static"]');
    if (attach) attach.disabled = true;
    nav?.querySelectorAll(".lorgus-lore-custom-node .lorgus-lore-node-button.is-selected").forEach(b=>b.classList.remove("is-selected"));
    const row = id ? rowById(id) : null;
    const node = row && nav?.querySelector('[data-custom-node-id="' + CSS.escape(id) + '"]');
    node?.querySelector(":scope > .lorgus-lore-custom-line > .lorgus-lore-node-button")?.classList.add("is-selected");
  }

  function makeToolbar(container) {
    toolbar = $("div", "lorgus-lore-editor-toolbar");
    const addTree = $("button", "lorgus-lore-editor-action is-primary", "＋ Новое древо");
    addTree.type = "button"; addTree.dataset.action = "add-tree";
    const addEntity = $("button", "lorgus-lore-editor-action", "＋ Новая сущность");
    addEntity.type = "button"; addEntity.dataset.action = "add-entity"; addEntity.disabled = true;
    const attach = $("button", "lorgus-lore-editor-action", "▧ Прикрепить фото к записи");
    attach.type = "button"; attach.dataset.action = "attach-static"; attach.disabled = true;
    const status = $("small", "lorgus-lore-editor-status", "Новые древа и сущности сохраняются в базе и могут публиковаться в игровом лорбуке.");
    toolbar.append(addTree, addEntity, attach, status);
    const sidebar = container.querySelector(".lorgus-lore-tree-sidebar");
    const search = sidebar?.querySelector(".lorgus-lore-tree-search");
    if (search) search.insertAdjacentElement("afterend", toolbar);
    else sidebar?.append(toolbar);
    addTree.addEventListener("click", () => openEditor(null, "tree", null));
    addEntity.addEventListener("click", () => {
      const parent = rowById(selectedCustomId);
      if (!parent) { setStatus("Сначала выбери пользовательское древо или сущность слева.", true); return; }
      openEditor(null, "entity", parent.id);
    });
    attach.addEventListener("click", () => {
      if (!selectedStaticFile) { setStatus("Сначала открой запись из существующего лорбука.", true); return; }
      openStaticImagePicker(selectedStaticFile);
    });
  }

  function openEditor(entry, kind, parentId) {
    if (!doc) return;
    const row = entry || { id:null, kind, parent_id:parentId, title:"", subtitle:"", body:"", image_path:null, is_published:true, sort_order:0 };
    const title = $("h2", "", entry ? "Редактирование записи" : (kind === "tree" ? "Новое древо" : "Новая сущность"));
    const form = $("form", "lorgus-lore-editor-form"); form.autocomplete = "off";
    const field = (labelText, control) => { const label = $("label", "lorgus-lore-editor-field"); label.append($("span","",labelText),control); return label; };
    const name = $("input",""); name.type="text"; name.maxLength=120; name.required=true; name.value=row.title||""; name.placeholder="Например, Орден Серебряного Пера";
    const subtitle = $("input",""); subtitle.type="text"; subtitle.maxLength=240; subtitle.value=row.subtitle||""; subtitle.placeholder="Краткое описание";
    const body = $("textarea",""); body.rows=9; body.maxLength=30000; body.value=row.body||""; body.placeholder="Описание, история, связи, особенности… Можно писать обычным текстом или Markdown.";
    const publishedWrap = $("label","lorgus-lore-editor-publish"); const published=$("input",""); published.type="checkbox"; published.checked=row.is_published!==false; publishedWrap.append(published,$("span","","Показывать в игровом лорбуке"));
    const imageBox=$("div","lorgus-lore-editor-image");
    const preview=$("img",""); preview.alt="Иллюстрация записи"; preview.hidden=!row.image_path; if(row.image_path) preview.src=imageUrl(row.image_path);
    const imageMeta=$("small","",row.image_path?"Иллюстрация прикреплена":"Иллюстрация не добавлена");
    const fileLabel=$("label","lorgus-lore-editor-upload","Выбрать фото"); const file=$("input",""); file.type="file"; file.accept="image/png,image/jpeg,image/webp,image/avif"; file.hidden=true; fileLabel.append(file);
    imageBox.append(preview,$("div","lorgus-lore-editor-image-actions", ""),fileLabel,imageMeta);
    let newImagePath=row.image_path||null, pendingFile=null;
    file.addEventListener("change",()=>{pendingFile=file.files?.[0]||null;if(!pendingFile)return;if(!/^image\/(png|jpeg|webp|avif)$/.test(pendingFile.type)||pendingFile.size>8*1024*1024){imageMeta.textContent="Нужен PNG, JPG, WebP или AVIF до 8 МБ.";pendingFile=null;file.value="";return;}preview.src=URL.createObjectURL(pendingFile);preview.hidden=false;imageMeta.textContent="Новое фото выбрано — загрузится при сохранении.";});
    const actions=$("div","lorgus-lore-editor-actions");
    const save=$("button","lorgus-lore-editor-action is-primary","Сохранить"); save.type="submit";
    const cancel=$("button","lorgus-lore-editor-action","Отмена"); cancel.type="button"; cancel.addEventListener("click",()=>showEmpty());
    actions.append(save,cancel);
    form.append(field("НАЗВАНИЕ",name),field("ПОДЗАГОЛОВОК",subtitle),field("ОПИСАНИЕ",body),publishedWrap,imageBox,actions);
    const shell=$("section","lorgus-lore-editor-panel"); shell.append($("div","lorgus-lore-editor-kicker","ЛОРГУС · РЕДАКТОР ЛЕТОПИСЦА"),title,form);
    doc.replaceChildren(shell);
    form.addEventListener("submit",async event=>{
      event.preventDefault(); save.disabled=true; cancel.disabled=true; setStatus("Сохраняю запись…");
      try {
        const db=client(); if(!db)throw new Error("Supabase не подключён.");
        let id=row.id;
        if(!id) id=crypto.randomUUID();
        if(pendingFile){
          const ext=({ "image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif" })[pendingFile.type]||"png";
          const path="lore-custom/"+id+"/"+Date.now()+"-"+crypto.randomUUID()+"."+ext;
          const uploaded=await db.storage.from(BUCKET).upload(path,pendingFile,{upsert:false,cacheControl:"3600",contentType:pendingFile.type});
          if(uploaded.error)throw uploaded.error;
          newImagePath=path;
        }
        const auth=await db.auth.getUser(); if(auth.error)throw auth.error;
        const payload={id,kind:row.kind,parent_id:row.parent_id||null,title:name.value.trim(),subtitle:subtitle.value.trim(),body:body.value,is_published:published.checked,image_path:newImagePath,sort_order:Number(row.sort_order)||0,created_by:row.created_by||auth.data.user.id,updated_by:auth.data.user.id};
        const saved=await db.from("lorgus_lore_custom_entries").upsert(payload,{onConflict:"id"}).select("*").single();
        if(saved.error)throw saved.error;
        const index=customEntries.findIndex(x=>x.id===saved.data.id);
        if(index>=0)customEntries[index]=saved.data;else customEntries.push(saved.data);
        renderCustomTree(); selectCustom(saved.data.id); openEditor(saved.data,saved.data.kind,saved.data.parent_id);
        setStatus("Запись сохранена. " + (saved.data.is_published?"Она опубликована в игровом лорбуке.":"Она сохранена как черновик."));
      } catch(error) { console.error("LORGUS lore save:",error); imageMeta.textContent="Ошибка: "+(error.message||error); setStatus("Не удалось сохранить: "+(error.message||error),true); }
      finally { save.disabled=false;cancel.disabled=false; }
    });
    if(entry){
      const del=$("button","lorgus-lore-editor-action is-danger","Удалить запись");
      del.type="button"; del.addEventListener("click",async()=>{
        if(!window.confirm("Удалить «"+entry.title+"» и все вложенные сущности?"))return;
        del.disabled=true;
        try{const result=await client().from("lorgus_lore_custom_entries").delete().eq("id",entry.id);if(result.error)throw result.error;customEntries=customEntries.filter(x=>x.id!==entry.id&&!isDescendant(x.id,entry.id));renderCustomTree();showEmpty();selectCustom(null);setStatus("Запись удалена.");}
        catch(error){setStatus("Не удалось удалить запись: "+(error.message||error),true);del.disabled=false;}
      });
      actions.insertBefore(del,actions.firstChild);
    }
  }

  function isDescendant(id, parentId) { let row=rowById(id), guard=0; while(row?.parent_id&&guard++<100){if(row.parent_id===parentId)return true;row=rowById(row.parent_id);}return false; }
  function showEmpty() {
    if (!doc) return;
    doc.innerHTML='<div class="lorgus-lore-document-empty"><span>✧</span><h3>Выбери запись</h3><p>Древо и сущности можно добавлять кнопками слева.</p></div>';
  }

  async function openStaticImagePicker(notePath) {
    const db=client(); if(!db){setStatus("Supabase не подключён.",true);return;}
    const existing=await db.from("lorgus_lore_media").select("image_path").eq("note_path",notePath).maybeSingle();
    const current=existing.data?.image_path||null;
    const shell=$("section","lorgus-lore-editor-panel");
    shell.append($("div","lorgus-lore-editor-kicker","ЛОРГУС · ИЛЛЮСТРАЦИЯ"),$("h2","","Фото для существующей записи"),$("p","lorgus-lore-editor-help",notePath));
    const preview=$("img","lorgus-lore-static-preview"); preview.alt="Прикреплённое фото"; preview.hidden=!current;if(current)preview.src=imageUrl(current);
    const input=$("input","");input.type="file";input.accept="image/png,image/jpeg,image/webp,image/avif";
    const label=$("label","lorgus-lore-editor-upload","Выбрать новое фото");label.append(input);
    const status=$("small","lorgus-lore-editor-status",current?"Фото уже прикреплено. Выбор нового заменит его.":"Фото пока не прикреплено.");
    const save=$("button","lorgus-lore-editor-action is-primary","Загрузить и прикрепить");save.type="button";
    const cancel=$("button","lorgus-lore-editor-action","Отмена");cancel.type="button";cancel.onclick=()=>showEmpty();
    const actions=$("div","lorgus-lore-editor-actions");actions.append(save,cancel);shell.append(preview,label,status,actions);doc.replaceChildren(shell);
    save.onclick=async()=>{
      const f=input.files?.[0];if(!f){status.textContent="Сначала выбери изображение.";return;}
      if(!/^image\/(png|jpeg|webp|avif)$/.test(f.type)||f.size>8*1024*1024){status.textContent="Нужен PNG, JPG, WebP или AVIF до 8 МБ.";return;}
      save.disabled=true;status.textContent="Загружаю изображение…";
      try{
        const ext=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"})[f.type]||"png";
        const path="lore-custom/static-"+crypto.randomUUID()+"-"+Date.now()+"."+ext;
        const up=await db.storage.from(BUCKET).upload(path,f,{upsert:false,cacheControl:"3600",contentType:f.type});if(up.error)throw up.error;
        const auth=await db.auth.getUser();if(auth.error)throw auth.error;
        const saved=await db.from("lorgus_lore_media").upsert({note_path:notePath,image_path:path,updated_by:auth.data.user.id},{onConflict:"note_path"});if(saved.error)throw saved.error;
        status.textContent="Фото прикреплено. Оно появится при следующем открытии этой записи.";
        preview.src=imageUrl(path);preview.hidden=false;setStatus("Иллюстрация сохранена.");
        addImageToDocument(notePath,path);
      }catch(error){status.textContent="Не удалось сохранить фото: "+(error.message||error);setStatus(status.textContent,true);}
      finally{save.disabled=false;}
    };
  }

  function addImageToDocument(notePath,path) {
    if(!doc)return;
    const article=doc.querySelector(".lorgus-lore-document-body");
    if(!article){
      if(!doc.dataset.loreImageWait){
        doc.dataset.loreImageWait="1";
        const observer=new MutationObserver(()=>{
          if(doc.querySelector(".lorgus-lore-document-body")){
            observer.disconnect();delete doc.dataset.loreImageWait;addImageToDocument(notePath,path);
          }
        });
        observer.observe(doc,{childList:true,subtree:true});
        setTimeout(()=>{observer.disconnect();delete doc.dataset.loreImageWait;},8000);
      }
      return;
    }
    let panel=doc.querySelector(".lorgus-lore-attached-image");
    if(!panel){panel=$("figure","lorgus-lore-attached-image");article.insertAdjacentElement("beforebegin",panel);}
    panel.replaceChildren();const img=$("img","");img.src=imageUrl(path);img.alt="Иллюстрация к записи";panel.append(img,$("figcaption","",notePath.split("/").pop().replace(/\.md$/i,"")));
  }

  function init(container) {
    activeRoot=container;nav=container.querySelector(".lorgus-lore-tree-nav");doc=container.querySelector(".lorgus-lore-document");
    if(!nav||!doc||container.dataset.loreEditorReady==="1")return;
    container.dataset.loreEditorReady="1";
    makeToolbar(container);
    nav.addEventListener("click",event=>{
      const edit=event.target.closest("[data-lore-custom-edit]");
      if(edit){event.preventDefault();event.stopPropagation();const row=rowById(edit.dataset.loreCustomEdit);if(row)openEditor(row,row.kind,row.parent_id);return;}
      const custom=event.target.closest("[data-custom-node-id]");
      if(custom){
        const row=rowById(custom.dataset.customNodeId);if(!row)return;
        selectCustom(row.id);
        const open=event.target.closest("[data-lore-custom-open]");
        if(open){event.preventDefault();openEditor(row,row.kind,row.parent_id);}
        return;
      }
      const staticButton=event.target.closest("[data-lore-file]");
      if(staticButton){
        selectedStaticFile=staticButton.dataset.loreFile;selectedCustomId=null;
        const add=toolbar.querySelector('[data-action="add-entity"]');if(add)add.disabled=true;
        const attach=toolbar.querySelector('[data-action="attach-static"]');if(attach)attach.disabled=false;
        setStatus("Выбрана запись: "+selectedStaticFile);
        setTimeout(async()=>{
          try{const result=await client().from("lorgus_lore_media").select("image_path").eq("note_path",selectedStaticFile).maybeSingle();if(!result.error&&result.data?.image_path)addImageToDocument(selectedStaticFile,result.data.image_path);}catch(e){console.warn("Lore image lookup:",e);}
        },180);
      }
    });
    loadEntries().catch(error=>setStatus("Ошибка загрузки древ: "+(error.message||error),true));
  }

  const original=window.renderAdminLoreTree;
  if(typeof original==="function"){
    window.renderAdminLoreTree=function(container){const result=original(container);init(container);return result;};
  }
  document.addEventListener("DOMContentLoaded",()=>{
    const find=()=>{const container=document.getElementById("admin-lore-tree");if(container&&container.querySelector(".lorgus-lore-tree-nav"))init(container);};
    find();new MutationObserver(find).observe(document.body,{childList:true,subtree:true});
  });
})();
