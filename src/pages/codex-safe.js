/* LORGUS codex — local and searchable for every character origin. */
(() => {
 const remoteBase="https://raw.githubusercontent.com/Sup4ezz/Friend-s-RPG/main/";
 const vault="Obsidian Vault/Obsidian Vault/Публичный Лор/";
 const docs=[
  ["Справочник мира","00 — Справочник мира.md","Королевства и земли"],
  ["Боевая система и школы меча","01 — Боевая система и школы меча.md","Дуэли, ступени и мастера"],
  ["Магия и магические школы","02 — Магия и магические школы.md","Мана и магические искусства"],
  ["Церкви и духовные ордена","03 — Церкви и духовные ордена.md","Вера и духовная власть"],
  ["Армии и военная служба","04 — Армии и военная служба.md","Звания и традиции"],
  ["Графства и владения","05 — Графства и владения.md","Земли и управление"],
  ["Известные люди Лоргуса","06 — Известные люди Лоргуса.md","Люди, изменившие мир"]
 ];
 const sections=[
 {id:"atlas",title:"Атлас мира",icon:"✦",desc:"Королевства, границы и земли",entries:[
  ["Атэрон","Королевство","Земля знаний и древних тайн","Королевство исследований, старых руин и учёных традиций. Здесь ценят знания, историю и сохранение наследия.","Аркейн · Примум · Эдмунд IV"],
  ["Каэлор","Королевство","Камень, металл и мастерство","Горные земли кузниц и шахт. Династия Фалькрейн правит под знаменем Хелиона; Севериан I известен как «Несущий Свет».","Фалькрейн · Хелион · Севериан I"],
  ["Ксандр","Королевство","Торговля, долги и договоры","Могущество Ксандра держится на торговых путях, банках и обязательствах. Его правитель носит титул Главы Воздаяния.","Гринвельд · банки · торговля"],
  ["Лирэн","Королевство","Зелёные земли и древняя природа","Край лесов, плодородия и природных традиций. Название Кальери встречается в записях о местной династии.","Кальери · леса · природа"],
  ["Морвейн","Королевство","Туман, память и паломничество","Край туманных долин и паломнических дорог. Путники говорят о нём как о месте, где прошлое ощущается особенно остро.","Долины · паломничество"],
  ["Святые Земли","Нейтральная территория","Место переговоров","Зона встреч монархов и глав церквей. Ни один престол не должен считать её обычным продолжением собственных владений.","Нейтралитет · дипломатия"],
  ["Спорные Земли","Независимые земли","Поселения между границами","Территории вне прямой власти пяти королевств: вольные поселения, пограничные договоры и интересы соседей.","Поселения · границы"],
  ["Геена","Закрытый континент","За пределами обычных путей","Опасный отдельный континент. Посещение игроками закрыто; это не обычная доступная локация и не стартовая родина персонажа.","Опасность · закрытая территория"]
 ]},
 {id:"glossary",title:"Глоссарий",icon:"⌘",desc:"Термины, титулы и понятия",entries:[
  ["Мана","Магия","Энергия позвоночника","Энергия, концентрируемая в позвоночнике. Она может течь по артериям подобно крови и служит основой магических проявлений.","Позвоночник · артерии"],
  ["Ступени мечника","Воинское искусство","Путь от ученика до мастера","Ученик → Подмастерье → Младший боец → Королевская ступень → Наставник → Божественная ступень. Это ступени мастерства, а не игровая шкала опыта.","Школы · мастерство"],
  ["Святые Земли","Политика","Нейтральная переговорная зона","Территория для переговоров между монархами и главами церквей.","Дипломатия · нейтралитет"],
  ["Воздаяние","Титул","Власть Ксандра","Глава Воздаяния — король Ксандра. Этот титул нельзя подменять понятием выгоды или торговой прибыли.","Ксандр · король"],
  ["Нечто и Ничто","Богословие","Два образа в тайне единого существа","В истинном устройстве мира это одна божественная сущность. Смертные церкви не располагают общим знанием об этом и толкуют веру по-разному.","Боги · Нечтисты"],
  ["Аэрарис","Богословие","Неизвестное имя","В глубинном каноне Аэрарис — истинный создатель, неизвестный и не почитаемый смертными. Это тайна мира, а не общепринятая храмовая доктрина.","Тайна · создатель"],
  ["Реинкарнация","Происхождение","Новая жизнь в Лоргусе","Персонаж может быть рождён в Лоргусе или прийти через реинкарнацию. Происхождение влияет на личную биографию, но не ограничивает доступ к общим знаниям мира.","Прошлая жизнь · биография"],
  ["Дороги и морские пути","Путешествия","Связи между краями","Перемещение между регионами подчиняется установленным сухопутным и морским путям. Свободная телепортация не является правилом по умолчанию.","Переходы · путешествие"]
 ]},
 {id:"bestiary",title:"Бестиарий",icon:"♜",desc:"Полевые записи о существах",entries:[
  ["Туманник","Неизвестное существо","Силуэт в молочной мгле","Вытянутая фигура, заметная лишь на границе видимости. Опаснее всего потерять дорогу, пытаясь проследить за ней.","Место: туманные долины · Опасность: высокая"],
  ["Глухой волк","Хищник","Охотник без предупреждения","Крупный серошёрстный зверь, почти не издающий звуков во время охоты. Обычно держится стаями и отрезает добычу от безопасного пути.","Место: лесные окраины · Опасность: средняя"],
  ["Костяная моль","Паразит","Враг старых архивов","Бледное насекомое, селится в сырых хранилищах и повреждает переплёты. Его выдают белая пыль и хрупкие следы на бумаге.","Место: подвалы и архивы · Опасность: низкая"],
  ["Болотный огонёк","Загадочное явление","Огонь, ведущий в сторону","Светящийся огонёк над влажной землёй. Путники спорят, живое ли это существо; следовать за ним в темноте неразумно.","Место: болота · Опасность: средняя"],
  ["Скальный гриф","Крупная птица","Хозяин отвесных уступов","Мощная хищная птица, избегающая людей, но опасная рядом с гнездом и добычей.","Место: горы · Опасность: средняя"],
  ["Пепельный олень","Редкий зверь","Следы на тёмной земле","Редкое животное с тёмной шерстью и светлыми отметинами, напоминающими золу. Отличается исключительной осторожностью.","Место: редколесье · Опасность: низкая"]
 ]},
 {id:"chronicle",title:"Летопись",icon:"⌛",desc:"Эпохи, события и память мира",entries:[
  ["Времена до общих хроник","Эпоха","Память, не собранная в одну книгу","Самые ранние предания разнятся от края к краю. У каждого народа есть собственное объяснение начала мира; единой признанной версии среди смертных нет.","Эпоха: древность"],
  ["Возникновение храмовых традиций","Религиозная история","Каждая вера хранит свою истину","Церкви выстроили собственные учения и обряды. Каждая считает своего бога создателем мира и отрицает божественность богов других вер.","Эпоха: ранние церкви"],
  ["Становление пяти королевств","Политическая эпоха","Границы и короны","Пять королевств закрепили собственные престолы, обычаи и интересы. Торговля, вера, военная сила и наследование определяют отношения между ними.","Эпоха: становление держав"],
  ["Святые Земли — место переговоров","Дипломатия","Общая площадка разных престолов","Нейтральная территория служит местом встреч монархов и глав церквей. Её значение возрастает, когда соседям нужен договор вместо войны.","Эпоха: дипломатические соглашения"],
  ["Путь мастеров меча","Военная история","Искусство, передаваемое поколениями","Школы закрепили собственные методы обучения и ступени мастерства — от Ученика до Божественной ступени. Имена наставников хранятся в отдельных записях.","Эпоха: развитие школ"],
  ["Нынешний век","Современность","Мир, который ещё пишется","Королевства продолжают соперничать, торговать и заключать договоры. Не все земли подчинены престолам, а многие тайны прошлого остаются предметом споров.","Эпоха: настоящее"]
 ]},
 {id:"faith",title:"Боги и церкви",icon:"☼",desc:"Вероучения и духовная власть",entries:[
  ["Нечто","Божество","Светлый образ без ног","В церковных изображениях Нечто предстаёт светлой верхней половиной фигуры, словно исходящей из спины или позвоночника.","Образ: свет"],
  ["Ничто","Божество","Тёмный юноша в полный рост","Ничто изображают как тёмную молодую фигуру с ногами. Его культ не является открытой верой в Геене.","Образ: тьма"],
  ["Солар","Божество","Вечное Пламя","Связан с церковью Вечного Пламени. В человеческом облике его представляют мускулистым воином с рукоятью огненного меча.","Сфера: пламя"],
  ["Лилит","Божество","Плодородие","Божество плодородия, которому посвящены обряды роста, продолжения жизни и урожая.","Сфера: плодородие"],
  ["Вехаиэль","Божество","Последний Путь","Связан с последним путём и обрядами ухода. В человеческом облике его представляют пожилым служителем веры.","Сфера: последний путь"],
  ["Малкхор","Божество","Воздаяние","Связан с воздаянием и расплатой. В политическом устройстве Ксандра титул Главы Воздаяния принадлежит королю.","Сфера: воздаяние"],
  ["Нечтисты","Церковь","Папа Аурелий I «Беглец»","Первый глас Нечто и писание «В начале было ничто» относятся к традиции Нечтистов. Церковь возглавляет Папа Аурелий I, прозванный «Беглец».","Текст: «В начале было ничто»"],
  ["Закон веры","Богословие","Церкви не согласны друг с другом","Каждая церковь утверждает, что её бог создал мир, и отрицает богов других вер. Смертные никогда не видели богов в истинном облике.","Тема: догматы"]
 ]},
 {id:"arts",title:"Магия и школы",icon:"⚝",desc:"Мана, обучение и мастерство",entries:[
  ["Мана и позвоночник","Основы магии","Энергия, текущая по телу","Мана концентрируется в позвоночнике и способна течь по артериям подобно крови. Управление ею требует дисциплины и понимания собственного тела.","Понятие: мана"],
  ["Клинок Севера","Школа меча · Атэрон","Иветта Ренн","Школа Атэрона, связанная с именем Иветты Ренн. Название и наставник закреплены в реестре мастеров меча.","Наставник: Иветта Ренн"],
  ["Школа Каэлора","Школа меча · Каэлор","Броган Каш","Каэлорская школа связана с Броганом Кашем. Официальное название школы в реестре пока не закреплено.","Наставник: Броган Каш"],
  ["Школа Ксандра","Школа меча · Ксандр","Дорн Крорк","Школа мастеров меча, связанная с Дорном Крорком.","Наставник: Дорн Крорк"],
  ["Школа Лирэна","Школа меча · Лирэн","Савен Роуд","Школа мастеров меча, связанная с Савеном Роудом.","Наставник: Савен Роуд"],
  ["Школа Морвейна","Школа меча · Морвейн","Мерети Вети","Школа мастеров меча, связанная с Мерети Вети.","Наставник: Мерети Вети"],
  ["Шесть ступеней","Обучение","От Ученика до Божественной ступени","Ученик, Подмастерье, Младший боец, Королевская ступень, Наставник и Божественная ступень — последовательность признанного мастерства.","Тема: ступени"]
 ]},
 {id:"archive",title:"Архив летописца",icon:"▤",desc:"Исходные документы мира",remote:true,entries:[]}
 ];
 const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const norm=s=>String(s||"").toLocaleLowerCase("ru-RU").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 const encodePath=s=>s.split("/").map(encodeURIComponent).join("/");
 function renderMarkdown(parent,source){
  parent.replaceChildren();let p=[],list=null;
  const fp=()=>{if(p.length){parent.append(make("p","",p.join(" ")));p=[];}};
  const fl=()=>{if(list){parent.append(list);list=null;}};
  for(const raw of String(source||"").replace(/\r/g,"").split("\n")){
   const s=raw.trim();if(!s){fp();fl();continue;}
   const h=s.match(/^(#{1,4})\s+(.+)$/);
   if(h){fp();fl();parent.append(make("h"+Math.min(h[1].length+1,5),"",h[2]));continue;}
   if(/^---+$/.test(s)){fp();fl();parent.append(document.createElement("hr"));continue;}
   if(/^>\s?/.test(s)){fp();fl();parent.append(make("blockquote","",s.replace(/^>\s?/,"")));continue;}
   if(/^[-*+]\s+/.test(s)){fp();if(!list)list=document.createElement("ul");list.append(make("li","",s.replace(/^[-*+]\s+/,"")));continue;}
   fl();p.push(s);
  }fp();fl();
 }
 async function render(startId){
  const root=document.getElementById("cabinet-content");if(!root)return;
  root.className="lorgus-codex-page";root.replaceChildren();
  const hero=make("header","lorgus-codex-hero");
  hero.append(make("div","lorgus-codex-eyebrow","ЛОРГУС · АРХИВ ЗНАНИЙ"),make("h1","","Лорбук"),make("p","","Собрание знаний о землях, верованиях, существах и событиях. Некоторые тайны ждут своего часа — но сам архив открыт каждому путнику."));
  hero.append(make("div","lorgus-codex-seal","✦"));
  const toolbar=make("div","lorgus-codex-toolbar"),searchLabel=make("label","lorgus-codex-search");
  searchLabel.append(make("span","","⌕"));const search=make("input");search.type="search";search.placeholder="Найти имя, понятие или место…";search.setAttribute("aria-label","Поиск по лорбуку");searchLabel.append(search);
  const count=make("span","lorgus-codex-count","АРХИВ МИРА");toolbar.append(searchLabel,count);
  const layout=make("div","lorgus-codex-layout"),nav=make("nav","lorgus-codex-nav"),main=make("main","lorgus-codex-main");
  nav.setAttribute("aria-label","Разделы лорбука");nav.append(make("div","lorgus-codex-nav-heading","СОДЕРЖАНИЕ"));
  const heading=make("h2",""),description=make("p",""),results=make("div","lorgus-codex-results");
  main.append(make("header","lorgus-codex-section-header"));main.firstChild.append(heading,description);main.append(results);layout.append(nav,main);root.append(hero,toolbar,layout);
  const back=make("button","lorgus-codex-back","← Вернуться к карте");back.type="button";back.addEventListener("click",()=>window.lorgusNavigate?window.lorgusNavigate("/map"):window.renderLorgusWorldMapCurrent?.());root.append(back);
  let activeId=startId||"atlas",requestId=0;const buttons=[];
  function openEntry(entry,sectionTitle){
   const overlay=make("div","lorgus-codex-overlay");overlay.setAttribute("role","presentation");
   const panel=make("section","lorgus-codex-dialog");panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label",entry[0]);
   const close=make("button","lorgus-codex-dialog-close","×");close.type="button";close.setAttribute("aria-label","Закрыть запись");
   const top=make("div","lorgus-codex-dialog-kicker",sectionTitle+"  /  "+entry[1]);panel.append(close,top,make("h2","",entry[0]),make("p","lorgus-codex-dialog-subtitle",entry[2]),make("div","lorgus-codex-dialog-rule","✦"));
   panel.append(make("p","lorgus-codex-dialog-body",entry[3]));
   if(entry[4])panel.append(make("div","lorgus-codex-dialog-meta",entry[4]));
   const foot=make("div","lorgus-codex-dialog-footer","ЛОРГУС · АРХИВ ЗНАНИЙ");panel.append(foot);overlay.append(panel);root.append(overlay);
   const shut=()=>{overlay.remove();document.removeEventListener("keydown",keyClose);};
   const keyClose=ev=>{if(ev.key==="Escape")shut();};close.addEventListener("click",shut);overlay.addEventListener("click",ev=>{if(ev.target===overlay)shut();});document.addEventListener("keydown",keyClose);close.focus();
  }
  function draw(section,query){
   const q=norm(query),items=section.entries.filter(e=>!q||norm(e.join(" ")).includes(q));results.replaceChildren();
   if(!items.length)results.append(make("div","lorgus-codex-empty","Записей по этому запросу не найдено. Попробуй другое слово."));
   else {const grid=make("div","lorgus-codex-entry-grid");items.forEach((e,i)=>{
    const card=make("article","lorgus-codex-entry");card.tabIndex=0;card.setAttribute("role","button");card.setAttribute("aria-label","Открыть запись: "+e[0]);
    const top=make("div","lorgus-codex-entry-top"),sigil=make("span","lorgus-codex-entry-sigil","✦");
    top.append(sigil,make("span","lorgus-codex-entry-type",e[1]),make("span","lorgus-codex-entry-number",String(i+1).padStart(2,"0")));
    card.append(top,make("h3","",e[0]),make("p","lorgus-codex-entry-subtitle",e[2]),make("p","lorgus-codex-entry-text",e[3]));
    if(e[4])card.append(make("div","lorgus-codex-entry-meta",e[4]));
    const open=make("span","lorgus-codex-open","Читать запись");open.append(make("span","","↗"));card.append(open);
    const show=()=>openEntry(e,section.title);
    card.addEventListener("click",show);card.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();show();}});
    grid.append(card);
   });results.append(grid);}
   count.textContent="ЗАПИСЕЙ: "+items.length;
  }
  async function open(id){
   const section=sections.find(s=>s.id===id)||sections[0];activeId=section.id;buttons.forEach((b,i)=>b.classList.toggle("active",sections[i].id===activeId));heading.textContent=section.title;description.textContent=section.desc;search.value="";
   if(!section.remote){draw(section,"");return;}
   const token=++requestId;results.replaceChildren();const list=make("div","lorgus-codex-remote-list");
   docs.forEach((doc,i)=>{const b=make("button","lorgus-codex-remote-item");b.type="button";b.append(make("span","lorgus-codex-remote-mark","▤"),make("span","",doc[0]),make("small","",doc[2]),make("b","","↗"));b.addEventListener("click",()=>loadDoc(i));list.append(b);});results.append(list);count.textContent="ДОКУМЕНТОВ: "+docs.length;
   async function loadDoc(i){
    const doc=docs[i],my=++requestId;results.replaceChildren(make("div","lorgus-codex-loading","Разворачиваем архивную запись…"));
    try{const response=await fetch(remoteBase+encodePath(vault+doc[1]),{cache:"no-cache"});if(!response.ok)throw new Error("HTTP "+response.status);const source=await response.text();if(/^\s*<!doctype html/i.test(source))throw new Error("Получен HTML вместо текста");if(my!==requestId)return;
     const article=make("article","lorgus-codex-remote-article"),b=make("button","lorgus-codex-inline-back","← К архивным документам");b.type="button";b.addEventListener("click",()=>open("archive"));article.append(b,make("h3","",doc[0]));const body=make("div","lorgus-codex-markdown");renderMarkdown(body,source);article.append(body);results.replaceChildren(article);count.textContent="АРХИВНАЯ ЗАПИСЬ";
    }catch(error){console.error("[LORGUS] Ошибка архива:",error);if(my!==requestId)return;const issue=make("div","lorgus-codex-empty");issue.append(make("h3","","Запись временно недоступна"),make("p","","Основные разделы лорбука работают независимо от внешнего архива."));const retry=make("button","lorgus-codex-inline-back","Попробовать снова");retry.type="button";retry.addEventListener("click",()=>loadDoc(i));issue.append(retry);results.replaceChildren(issue);}
   }
  }
  sections.forEach(section=>{const b=make("button","lorgus-codex-topic");b.type="button";b.append(make("span","lorgus-codex-topic-icon",section.icon),make("span","lorgus-codex-topic-copy",section.title),make("small","",section.desc));b.addEventListener("click",()=>open(section.id));nav.append(b);buttons.push(b);});
  search.addEventListener("input",()=>{
   const q=search.value.trim();
   if(!q){open(activeId);return;}
   const needle=norm(q),all=[];
   sections.filter(s=>!s.remote).forEach(s=>s.entries.forEach(entry=>{if(norm(entry.join(" ")).includes(needle))all.push([entry[0],s.title+" · "+entry[1],entry[2],entry[3],entry[4]]);}));
   docs.forEach(doc=>{if(norm(doc.join(" ")).includes(needle))all.push([doc[0],"Архивный документ",doc[2],"Документ из исходного архива. Открой раздел «Архив летописца», чтобы прочитать его полностью.",doc[1]]);});
   heading.textContent="Результаты поиска";description.textContent="Совпадения во всех открытых разделах лорбука.";buttons.forEach(b=>b.classList.remove("active"));
   draw({entries:all},needle);
  });
  await open(activeId);
 }
 window.renderLorgusCodex=render;window.LORGUS_PAGES=window.LORGUS_PAGES||{};window.LORGUS_PAGES.codex={render:()=>render("atlas")};
})();