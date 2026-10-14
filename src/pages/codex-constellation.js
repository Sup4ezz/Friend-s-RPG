/* LORGUS — interactive constellation codex */
(() => {
 const $=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const norm=s=>String(s||"").toLocaleLowerCase("ru-RU").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 function render(startId){
  const root=document.getElementById("cabinet-content"),sections=window.LORGUS_CODEX_SECTIONS||[],docs=window.LORGUS_CODEX_DOCS||[],remote=window.LORGUS_CODEX_REMOTE||{};
  if(!root||!sections.length)return;
  root.className="lorgus-codex-page lorgus-codex-constellation";root.replaceChildren();
  const stage=$("section","codex-cosmos");stage.setAttribute("aria-label","Интерактивный архив Лоргуса");
  const decor=$("div","codex-cosmos-dust");decor.setAttribute("aria-hidden","true");
  const halo=$("div","codex-cosmos-halo"),orbit1=$("div","codex-cosmos-orbit codex-cosmos-orbit-a"),orbit2=$("div","codex-cosmos-orbit codex-cosmos-orbit-b"),orbit3=$("div","codex-cosmos-orbit codex-cosmos-orbit-c");
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 1000 700");svg.setAttribute("class","codex-cosmos-lines");svg.setAttribute("aria-hidden","true");
  const lines=document.createElementNS("http://www.w3.org/2000/svg","g");svg.append(lines);
  const field=$("div","codex-cosmos-field"),core=$("button","codex-cosmos-core");core.type="button";core.setAttribute("aria-expanded","false");
  core.append($("span","codex-core-glow"),$("span","codex-core-point"),$("span","codex-core-label","ЛОРГУС"),$("span","codex-core-caption","АРХИВ ЗНАНИЙ"));
  const heading=$("header","codex-cosmos-heading");heading.append($("div","codex-cosmos-eyebrow","АРХИВ · ЛОРГУС"),$("h1","","Лорбук"),$("p","","Прикоснись к точке. Позволь знаниям раскрыться."));
  const hint=$("div","codex-cosmos-hint","НАЖМИ НА СВЕЧЕНИЕ");
  const back=$("button","codex-cosmos-back","← Ко всем разделам");back.type="button";back.hidden=true;
  const exit=$("button","codex-cosmos-exit","Вернуться в мир");exit.type="button";exit.onclick=()=>window.lorgusNavigate?window.lorgusNavigate("/map"):window.renderLorgusWorldMapCurrent?.();
  const searchToggle=$("button","codex-cosmos-search-toggle","⌕");searchToggle.type="button";searchToggle.setAttribute("aria-label","Поиск по лорбуку");
  const search=$("input","codex-cosmos-search");search.type="search";search.placeholder="Имя, место, понятие…";search.hidden=true;
  const hits=$("div","codex-cosmos-search-results");hits.hidden=true;
  stage.append(decor,halo,orbit1,orbit2,orbit3,svg,field,core,heading,hint,back,exit,searchToggle,search,hits);root.append(stage);stage.addEventListener("pointermove",e=>{const r=stage.getBoundingClientRect();stage.style.setProperty("--pointer-x",(e.clientX-r.left)+"px");stage.style.setProperty("--pointer-y",(e.clientY-r.top)+"px");});
  let mode="closed",activeSection=null;
  const detail=(entry,sectionTitle)=>{
   const overlay=$("div","codex-cosmos-detail-overlay"),panel=$("article","codex-cosmos-detail"),close=$("button","codex-detail-close","×"),body=$("div","codex-detail-body"),trail=[];
   close.type="button";close.setAttribute("aria-label","Закрыть запись");panel.append(close,body);overlay.append(panel);stage.append(overlay);
   const shut=()=>{overlay.remove();document.removeEventListener("keydown",key);};const key=e=>{if(e.key==="Escape")shut();};close.onclick=shut;overlay.onclick=e=>{if(e.target===overlay)shut();};document.addEventListener("keydown",key);
   function show(node){body.replaceChildren();body.append($("div","codex-detail-kicker",sectionTitle+"  /  "+trail.map(x=>x[0]).concat(node[0]).join("  /  ")),$("h2","",node[0]),$("p","codex-detail-subtitle",node[2]||node[1]||""));
    const imageMap=window.LORGUS_CODEX_IMAGE_BY_TITLE;
    const imageKey=String(node[0]||"").toLocaleLowerCase("ru-RU").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/\\.md$/i,"").replace(/[^\\p{L}\\p{N}]+/gu," ").trim();
    const imageUrl=node[6]||(typeof window.LORGUS_CODEX_FIND_IMAGE==="function"?window.LORGUS_CODEX_FIND_IMAGE(node[0]):(imageMap&&(imageMap.get(imageKey)||imageMap.get(imageKey.replace(/^(король|королева|профессор|архивариус|доктор|мастер|наставник|дом|граф|графиня|князь|княгиня)\\s+/,"")))));
    if(imageUrl){const illustration=$("img","codex-detail-illustration");illustration.src=imageUrl;illustration.alt="Иллюстрация: "+node[0];body.append(illustration);}
    body.append($("div","codex-detail-rule","✦"),$("p","codex-detail-text",node[3]||"Подробная запись пока не внесена в открытый архив."));
    if(node[4])body.append($("div","codex-detail-meta",node[4]));
    if(Array.isArray(node[5])&&node[5].length){body.append($("div","codex-detail-subhead","ВНУТРИ ЭТОЙ ЗАПИСИ · "+String(node[5].length).padStart(2,"0")));const list=$("div","codex-detail-children");node[5].forEach((child,i)=>{const b=$("button","codex-detail-child"),copy=$("span","codex-child-copy");b.type="button";copy.append($("strong","",child[0]),$("small","",child[2]||child[1]||""));b.append($("span","codex-child-number",String(i+1).padStart(2,"0")),copy,$("span","codex-child-arrow","↗"));b.onclick=()=>{trail.push(node);show(child);};list.append(b);});body.append(list);}
    if(trail.length){const b=$("button","codex-detail-back","← Назад");b.type="button";b.onclick=()=>show(trail.pop());body.append(b);}
    body.append($("div","codex-detail-footer","ЛОРГУС · АРХИВ ЗНАНИЙ"));
   }show(entry);
  };
  function clear(){field.replaceChildren();lines.replaceChildren();}
  function place(items,kind){
   clear();const n=items.length||1;
   items.forEach((item,i)=>{const a=-Math.PI/2+i/n*Math.PI*2,r=n>14?(i%2?.46:.36):n>8?.39:.34,x=50+Math.cos(a)*r*100,y=50+Math.sin(a)*r*100;
    const b=$("button","codex-orbit-node "+(kind==="section"?"codex-orbit-section":"codex-orbit-entry"));b.type="button";b.style.setProperty("--node-x",x+"%");b.style.setProperty("--node-y",y+"%");b.style.setProperty("--flight-x",((x-50)*stage.clientWidth/100)+"px");b.style.setProperty("--flight-y",((y-50)*stage.clientHeight/100)+"px");b.style.setProperty("--node-delay",i*48+"ms");b.style.left="50%";b.style.top="50%";
    const title=item.title||item[0],subtitle=item.desc||item[2]||item[1]||"";b.append($("span","codex-node-star",kind==="section"?(item.icon||"✦"):"✧"),$("span","codex-node-title",title),$("span","codex-node-subtitle",subtitle));b.setAttribute("aria-label",title);
    b.onclick=()=>kind==="section"?(item.id==="archive"?openArchive():openSection(item.id)):detail(item,activeSection.title);field.append(b);
    const line=document.createElementNS("http://www.w3.org/2000/svg","line");line.setAttribute("x1","500");line.setAttribute("y1","350");line.setAttribute("x2",x*10);line.setAttribute("y2",y*7);line.setAttribute("class","codex-cosmos-connector");line.style.animationDelay=i*45+"ms";lines.append(line);
   });
  }
  function setCore(title,caption){core.querySelector(".codex-core-label").textContent=title;core.querySelector(".codex-core-caption").textContent=caption;core.setAttribute("aria-expanded",String(mode!=="closed"));}
  function openSections(){mode="sections";activeSection=null;stage.classList.remove("is-closed","is-entry-view");stage.classList.add("is-open","is-section-view");heading.querySelector("h1").textContent="Лорбук";heading.querySelector("p").textContent="Выбери нить знания — и архив развернётся вокруг неё.";hint.textContent="ВЫБЕРИ РАЗДЕЛ";back.hidden=true;setCore("ЛОРГУС","АРХИВ ЗНАНИЙ");const items=sections.filter(s=>!s.remote).map(s=>({id:s.id,title:s.title,icon:s.icon,desc:s.desc}));items.push({id:"archive",title:"Архив летописца",icon:"▤",desc:"Исходные документы мира"});place(items,"section");}
  function openSection(id){activeSection=sections.find(s=>s.id===id)||sections[0];mode="entries";stage.classList.remove("is-section-view","is-closed");stage.classList.add("is-open","is-entry-view");heading.querySelector("h1").textContent=activeSection.title;heading.querySelector("p").textContent=activeSection.desc;hint.textContent="ВЫБЕРИ ЗАПИСЬ";back.hidden=false;setCore("НАЗАД","К РАЗДЕЛАМ");place(activeSection.entries,"entry");}
  function openArchive(){activeSection={title:"Архив летописца",desc:"Исходные документы мира",entries:[]};mode="entries";stage.classList.remove("is-section-view","is-closed");stage.classList.add("is-open","is-entry-view");heading.querySelector("h1").textContent=activeSection.title;heading.querySelector("p").textContent=activeSection.desc;hint.textContent="ВЫБЕРИ РУКОПИСЬ";back.hidden=false;setCore("НАЗАД","К РАЗДЕЛАМ");place(docs.map((d,i)=>[d[0],"Архивный документ",d[2],"",d[1],null]),"entry");field.querySelectorAll(".codex-orbit-entry").forEach((b,i)=>{b.onclick=()=>loadDoc(i);});}
  async function loadDoc(i){const d=docs[i];const fake=[d[0],"Архивный документ",d[2],"Загружаем исходную рукопись…",d[1]];detail(fake,"Архив летописца");const overlay=stage.querySelector(".codex-cosmos-detail-overlay"),body=overlay?.querySelector(".codex-detail-body");if(!body)return;try{const res=await fetch(remote.base+remote.vault+d[1].split("/").map(encodeURIComponent).join("/"),{cache:"no-cache"});if(!res.ok)throw Error("HTTP "+res.status);const text=await res.text();body.querySelector(".codex-detail-text").textContent=text.slice(0,24000);}catch(e){body.querySelector(".codex-detail-text").textContent="Рукопись временно недоступна. Попробуй открыть её позже.";}}
  core.onclick=()=>{if(mode==="closed"){openSections();return;}if(mode==="entries"){openSections();return;}mode="closed";stage.classList.remove("is-open","is-section-view","is-entry-view");stage.classList.add("is-closed");clear();setCore("ЛОРГУС","АРХИВ ЗНАНИЙ");hint.textContent="НАЖМИ НА СВЕЧЕНИЕ";};
  back.onclick=openSections;
  searchToggle.onclick=()=>{search.hidden=!search.hidden;if(!search.hidden)search.focus();else hits.hidden=true;};
  search.oninput=()=>{const q=norm(search.value.trim());hits.replaceChildren();if(!q){hits.hidden=true;return;}const found=[];const visit=(entries,title)=>entries.forEach(e=>{if(norm(e.slice(0,5).join(" ")).includes(q))found.push({entry:e,title});if(Array.isArray(e[5]))visit(e[5],title+" / "+e[0]);});sections.filter(s=>!s.remote).forEach(s=>visit(s.entries,s.title));docs.forEach((d,i)=>{if(norm(d.join(" ")).includes(q))found.push({doc:i,title:"Архив летописца"});});found.slice(0,20).forEach(hit=>{const b=$("button","codex-search-hit");b.type="button";b.append($("strong","",hit.entry?hit.entry[0]:docs[hit.doc][0]),$("small","",hit.title));b.onclick=()=>hit.entry?detail(hit.entry,hit.title):loadDoc(hit.doc);hits.append(b);});if(!found.length)hits.append($("p","codex-search-none","Ничего не найдено."));hits.hidden=false;};
  stage.classList.add("is-closed");if(startId&&startId!=="atlas"){openSections();if(sections.some(s=>s.id===startId))openSection(startId);}
 }
 window.renderLorgusCodex=render;window.LORGUS_PAGES=window.LORGUS_PAGES||{};window.LORGUS_PAGES.codex={render:()=>render("atlas")};
})();
