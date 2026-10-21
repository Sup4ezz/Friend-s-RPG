/* LORGUS — interactive constellation codex */
(() => {
 const $=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const norm=s=>String(s||"").toLocaleLowerCase("ru-RU").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 const royalLore={
  "дом аркейн":"Дом Аркейн (Атэрон)/Дом Аркейн.md",
  "дом фалькрейн":"Дом Фалькрейн (Каэлор)/Дом Фалькрейн (Каэлор).md",
  "дом гринвельд":"Дом Гринвельд (Лирэн)/Дом Гринвельд.md",
  "дом кальери":"Дом Кальери (Ксандр)/Дом Кальери.md",
  "дом вальмонт":"Дом Вальмонт (Морвейн)/Дом Вальмонт (Морвейн).md",
  "эдмунд iv":"Дом Аркейн (Атэрон)/Эдмунд Аркейн IV.md",
  "королева лиандра":"Дом Аркейн (Атэрон)/Лиандра Аркейн.md",
  "кассиан":"Дом Аркейн (Атэрон)/Кассиан Аркейн.md",
  "адриан":"Дом Аркейн (Атэрон)/Адриан Аркейн.md",
  "селена":"Дом Аркейн (Атэрон)/Селена Аркейн.md",
  "леонард i фалькрейн":"Дом Фалькрейн (Каэлор)/Леонард I Фалькрейн.md",
  "изольда фалькрейн":"Дом Фалькрейн (Каэлор)/Изольда Фалькрейн.md",
  "рейнар фалькрейн":"Дом Фалькрейн (Каэлор)/Рейнар Фалькрейн.md",
  "селестра i гринвельд":"Дом Гринвельд (Лирэн)/Селестра I Гринвельд.md",
  "эдгар гринвельд":"Дом Гринвельд (Лирэн)/Эдгар Гринвельд.md",
  "эвелина гринвельд":"Дом Гринвельд (Лирэн)/Эвелина Гринвельд.md",
  "кайрен гринвельд":"Дом Гринвельд (Лирэн)/Кайрен Гринвельд.md",
  "леон гринвельд":"Дом Гринвельд (Лирэн)/Леон Гринвельд.md",
  "лиара гринвельд":"Дом Гринвельд (Лирэн)/Лиара Гринвельд.md",
  "мариэль гринвельд":"Дом Гринвельд (Лирэн)/Мариэль Гринвельд.md",
  "элиан гринвельд":"Дом Гринвельд (Лирэн)/Элиан Гринвельд.md",
  "марцелл кальери i собиратель":"Дом Кальери (Ксандр)/Марцелл Кальери I «Собиратель».md",
  "лукреция кальери":"Дом Кальери (Ксандр)/Лукреция Кальери.md",
  "виолетта кальери":"Дом Кальери (Ксандр)/Виолетта Кальери.md",
  "дамиан кальери":"Дом Кальери (Ксандр)/Дамиан Кальери.md",
  "альдрен iv вальмонт":"Дом Вальмонт (Морвейн)/Альдрен IV Вальмонт.md",
  "элеонора вальмонт":"Дом Вальмонт (Морвейн)/Элеонора Вальмонт.md"
 };
 const royalKey=value=>norm(value).replace(/[«»"]/g,"").replace(/\s+/g," ").trim();
 async function appendRoyalLore(body,node){
  const file=royalLore[royalKey(node[0])];if(!file)return;
  const section=$("section","codex-royal-lore"),title=$("h3","","Полная летопись"),status=$("p","codex-royal-lore-status","Читаем запись из архива…");
  section.append(title,status);
  const footer=body.querySelector(".codex-detail-footer");body.insertBefore(section,footer||null);
  try{
   const path="Obsidian%20Vault/Obsidian%20Vault/%D0%9D%D0%9F%D0%A1/%D0%9A%D0%BE%D1%80%D0%BE%D0%BB%D0%B5%D0%B2%D1%81%D0%BA%D0%B8%D0%B5%20%D1%81%D0%B5%D0%BC%D1%8C%D0%B8/";
   const url="https://raw.githubusercontent.com/Sup4ezz/Friend-s-RPG/main/"+path+file.split("/").map(encodeURIComponent).join("/");
   const response=await fetch(url,{cache:"no-store"});if(!response.ok)throw new Error("HTTP "+response.status);
   let source=await response.text();if(/^\s*<!doctype html|^\s*<html[\s>]/i.test(source.slice(0,500)))throw new Error("Получен HTML вместо Markdown");
   if(!body.isConnected)return;
   source=source.replace(/^---[\s\S]*?---\s*/,"").replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g,"$2").replace(/\[\[([^\]]+)\]\]/g,"$1").replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1");
   const article=$("div","codex-royal-lore-content");let paragraph=[];
   const flush=()=>{if(paragraph.length){article.append($("p","",paragraph.join(" ")));paragraph=[];}};
   for(const raw of source.replace(/\r/g,"").split("\n")){
    const line=raw.trim();if(!line){flush();continue;}
    const heading=line.match(/^(#{1,4})\s+(.+)$/);if(heading){flush();article.append($(heading[1].length<=2?"h4":"h5","",heading[2]));continue;}
    if(/^[-*]\s+/.test(line)){flush();article.append($("p","codex-royal-lore-list", "• "+line.replace(/^[-*]\s+/,"")));continue;}
    paragraph.push(line);
   }
   flush();section.replaceChildren(title,article);
  }catch(error){console.warn("[LORGUS] Не удалось загрузить летопись:",error);if(body.isConnected)section.replaceChildren(title,$("p","codex-royal-lore-status","Полная летопись временно недоступна. Краткая запись сохранена."));}
 }
 function render(startId){
  const root=document.getElementById("cabinet-content"),sections=window.LORGUS_CODEX_SECTIONS||[],docs=window.LORGUS_CODEX_DOCS||[],remote=window.LORGUS_CODEX_REMOTE||{};
  if(!root)return;
  // The route must never silently render nothing if the lore data bundle has not initialized yet.
  if(!sections.length){
    const fallback=[{id:"atlas",title:"Атлас мира",icon:"✦",desc:"Королевства и земли",entries:[
      ["Атэрон","Королевство","Земля знаний","Королевство, где ценят учёность, историю и сохранение наследия.","Примум · дом Аркейн"],
      ["Каэлор","Королевство","Земля металла и мастерства","Горные земли кузниц и шахт; здесь особенно ценят ремесло.","Дом Фалькрейн"],
      ["Ксандр","Королевство","Торговля и договоры","Могущество королевства держится на торговых путях, банках и обязательствах.","Дом Гринвельд"],
      ["Лирэн","Королевство","Леса и плодородие","Земли лесов, садов и природных традиций.","Дом Кальери"],
      ["Морвейн","Королевство","Туманные долины","Северные земли, известные туманом и паломническими дорогами.","Паломничество"],
      ["Святые Земли","Нейтральная территория","Место переговоров","Здесь встречаются монархи и главы церквей.","Нейтралитет"],
      ["Спорные Земли","Независимые земли","Поселения между границами","Пограничные территории вне прямой власти королевств.","Вольные поселения"],
      ["Геена","Закрытый континент","За пределами обычных путей","Опасный отдельный континент, закрытый для обычного посещения.","Закрытая территория"]
    ]}];
    window.LORGUS_CODEX_SECTIONS=fallback;
  }
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
    const imageKey=String(node[0]||"").toLocaleLowerCase("ru-RU").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\.md$/i,"").replace(/[^\p{L}\p{N}]+/gu," ").trim();
    const imageUrl=node[6]||(typeof window.LORGUS_CODEX_FIND_IMAGE==="function"?window.LORGUS_CODEX_FIND_IMAGE(node[0]):(imageMap&&(imageMap.get(imageKey)||imageMap.get(imageKey.replace(/^(король|королева|профессор|архивариус|доктор|мастер|наставник|дом|граф|графиня|князь|княгиня)\s+/,"")))));
    if(imageUrl){const illustration=$("img","codex-detail-illustration");illustration.src=imageUrl;illustration.alt="Иллюстрация: "+node[0];illustration.style.setProperty("display","block","important");illustration.style.setProperty("width","100%","important");illustration.style.setProperty("max-width","100%","important");illustration.style.setProperty("height","clamp(280px,46vh,500px)","important");illustration.style.setProperty("max-height","none","important");illustration.style.setProperty("aspect-ratio","auto","important");illustration.style.setProperty("object-fit","contain","important");illustration.style.setProperty("border-radius","0","important");illustration.style.setProperty("clip-path","none","important");illustration.style.setProperty("-webkit-clip-path","none","important");illustration.style.setProperty("mask","none","important");illustration.style.setProperty("-webkit-mask","none","important");illustration.style.setProperty("margin","20px 0 28px","important");body.append(illustration);}
    body.append($("div","codex-detail-rule","✦"),$("p","codex-detail-text",node[3]||"Подробная запись пока не внесена в открытый архив."));
    if(node[4])body.append($("div","codex-detail-meta",node[4]));
    if(Array.isArray(node[5])&&node[5].length){body.append($("div","codex-detail-subhead","ВНУТРИ ЭТОЙ ЗАПИСИ · "+String(node[5].length).padStart(2,"0")));const list=$("div","codex-detail-children");node[5].forEach((child,i)=>{const b=$("button","codex-detail-child"),copy=$("span","codex-child-copy");b.type="button";copy.append($("strong","",child[0]),$("small","",child[2]||child[1]||""));b.append($("span","codex-child-number",String(i+1).padStart(2,"0")),copy,$("span","codex-child-arrow","↗"));b.onclick=()=>{trail.push(node);show(child);};list.append(b);});body.append(list);}
    if(trail.length){const b=$("button","codex-detail-back","← Назад");b.type="button";b.onclick=()=>show(trail.pop());body.append(b);}
    if(activeSection?.id==="chronicle"&&node[6]&&node[7]==="pending_review"){
     const controls=$("div","codex-chronicle-review"),label=$("p","codex-chronicle-review-note","Черновик не виден игрокам, пока администратор не подтвердит его.");
     const approve=$("button","codex-chronicle-approve","Внести в летопись"),reject=$("button","codex-chronicle-reject","Отклонить");
     approve.type="button";reject.type="button";
     const review=async status=>{const client=window.supabaseClient;if(!client){label.textContent="Нет подключения к Supabase.";return;}approve.disabled=true;reject.disabled=true;label.textContent="Сохраняем решение…";const {data:{user}}=await client.auth.getUser();const {error}=await client.from("lorgus_chronicle_entries").update({status,reviewed_by:user?.id||null,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",node[6]);if(error){label.textContent="Не удалось сохранить решение. Проверь права администратора и попробуй снова.";approve.disabled=false;reject.disabled=false;return;}openSection("chronicle");};
     approve.onclick=()=>void review("approved");reject.onclick=()=>void review("rejected");controls.append(label,approve,reject);body.append(controls);
    }
    body.append($("div","codex-detail-footer","ЛОРГУС · АРХИВ ЗНАНИЙ"));
    void appendRoyalLore(body,node);
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
  async function openSection(id){
   activeSection=sections.find(s=>s.id===id)||sections[0];mode="entries";stage.classList.remove("is-section-view","is-closed");stage.classList.add("is-open","is-entry-view");
   heading.querySelector("h1").textContent=activeSection.title;heading.querySelector("p").textContent=activeSection.desc;hint.textContent=id==="chronicle"?"ЛЕТОПИСЬ · ПОДТВЕРЖДЁННОЕ И ЧЕРНОВИКИ":"ВЫБЕРИ ЗАПИСЬ";back.hidden=false;setCore("НАЗАД","К РАЗДЕЛАМ");
   if(id!=="chronicle"){place(activeSection.entries,"entry");return;}
   place([["Загружаем летопись","Архив","Читаем записи…","Подожди мгновение."]],"entry");
   const client=window.supabaseClient;
   if(!client){activeSection.entries=[["Летопись недоступна","Ошибка подключения","", "Не удалось подключиться к архиву. Попробуй открыть раздел позже."]];place(activeSection.entries,"entry");return;}
   const {data,error}=await client.from("lorgus_chronicle_entries").select("id,title,subtitle,body,event_date,importance,status").in("status",["approved","pending_review"]).order("event_date",{ascending:false}).limit(80);
   if(activeSection?.id!=="chronicle")return;
   if(error){activeSection.entries=[["Летопись недоступна","Ошибка архива","", "Не удалось загрузить летопись. Попробуй позже."]];}
   else if(!data?.length){activeSection.entries=[["Пока тихо","Нет записей","", "Летописец пока не обнаружил событий, достойных хроники. Когда в игре произойдёт нечто значимое, здесь появится черновик для проверки."]];}
   else {activeSection.entries=data.map(row=>[row.title,row.status==="approved"?"Запись летописи":"Черновик · требует проверки",new Date(row.event_date).toLocaleDateString("ru-RU",{year:"numeric",month:"long",day:"numeric"}),row.body,(row.status==="approved"?"Опубликовано":"Только администрация")+" · важность "+row.importance,null,row.id,row.status]);}
   place(activeSection.entries,"entry");
  }
  function openArchive(){activeSection={title:"Архив летописца",desc:"Исходные документы мира",entries:[]};mode="entries";stage.classList.remove("is-section-view","is-closed");stage.classList.add("is-open","is-entry-view");heading.querySelector("h1").textContent=activeSection.title;heading.querySelector("p").textContent=activeSection.desc;hint.textContent="ВЫБЕРИ РУКОПИСЬ";back.hidden=false;setCore("НАЗАД","К РАЗДЕЛАМ");place(docs.map((d,i)=>[d[0],"Архивный документ",d[2],"",d[1],null]),"entry");field.querySelectorAll(".codex-orbit-entry").forEach((b,i)=>{b.onclick=()=>loadDoc(i);});}
  async function loadDoc(i){const d=docs[i];const fake=[d[0],"Архивный документ",d[2],"Загружаем исходную рукопись…",d[1]];detail(fake,"Архив летописца");const overlay=stage.querySelector(".codex-cosmos-detail-overlay"),body=overlay?.querySelector(".codex-detail-body");if(!body)return;try{const res=await fetch(remote.base+remote.vault+d[1].split("/").map(encodeURIComponent).join("/"),{cache:"no-cache"});if(!res.ok)throw Error("HTTP "+res.status);const text=await res.text();body.querySelector(".codex-detail-text").textContent=text.slice(0,24000);}catch(e){body.querySelector(".codex-detail-text").textContent="Рукопись временно недоступна. Попробуй открыть её позже.";}}
  core.onclick=()=>{if(mode==="closed"){openSections();return;}if(mode==="entries"){openSections();return;}mode="closed";stage.classList.remove("is-open","is-section-view","is-entry-view");stage.classList.add("is-closed");clear();setCore("ЛОРГУС","АРХИВ ЗНАНИЙ");hint.textContent="НАЖМИ НА СВЕЧЕНИЕ";};
  back.onclick=openSections;
  searchToggle.onclick=()=>{search.hidden=!search.hidden;if(!search.hidden)search.focus();else hits.hidden=true;};
  search.oninput=()=>{const q=norm(search.value.trim());hits.replaceChildren();if(!q){hits.hidden=true;return;}const found=[];const visit=(entries,title)=>entries.forEach(e=>{if(norm(e.slice(0,5).join(" ")).includes(q))found.push({entry:e,title});if(Array.isArray(e[5]))visit(e[5],title+" / "+e[0]);});sections.filter(s=>!s.remote).forEach(s=>visit(s.entries,s.title));docs.forEach((d,i)=>{if(norm(d.join(" ")).includes(q))found.push({doc:i,title:"Архив летописца"});});found.slice(0,20).forEach(hit=>{const b=$("button","codex-search-hit");b.type="button";b.append($("strong","",hit.entry?hit.entry[0]:docs[hit.doc][0]),$("small","",hit.title));b.onclick=()=>hit.entry?detail(hit.entry,hit.title):loadDoc(hit.doc);hits.append(b);});if(!found.length)hits.append($("p","codex-search-none","Ничего не найдено."));hits.hidden=false;};
  stage.classList.add("is-closed");
  if(startId&&startId!=="atlas"){
   openSections();
   if(sections.some(s=>s.id===startId)) openSection(startId);
   else {
    searchToggle.click();
    search.value=String(startId);
    search.dispatchEvent(new Event("input",{bubbles:true}));
   }
  }
 }
 window.renderLorgusCodex=render;window.LORGUS_PAGES=window.LORGUS_PAGES||{};window.LORGUS_PAGES.codex={render:()=>render("atlas")};
})();
