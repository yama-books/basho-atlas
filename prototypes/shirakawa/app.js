"use strict";

const FIXTURE_URL="./shirakawa.draft.json";
const state={data:null,view:"compare",word:"秋風",map:null};

const id=name=>document.getElementById(name);
function add(parent,tag,value,className){
  const element=document.createElement(tag);
  if(className)element.className=className;
  element.textContent=value==null?"":String(value);
  parent.appendChild(element);
  return element;
}
function safeSourceUrl(value){
  try{
    const parsed=new URL(value);
    return parsed.protocol==="https:"?parsed.toString():null;
  }catch{return null;}
}
function markWords(parent,value,keyword){
  const str=String(value||"");
  const needle=String(keyword||"");
  if(!needle){parent.textContent=str;return;}
  let from=0;
  while(from<str.length){
    const position=str.indexOf(needle,from);
    if(position<0){parent.appendChild(document.createTextNode(str.slice(from)));break;}
    parent.appendChild(document.createTextNode(str.slice(from,position)));
    add(parent,"mark",needle);
    from=position+needle.length;
  }
}
function validateFixture(data){
  if(!data||data.schema_version!=="0.1.0"||data.human_review!=="pending_human"||
      data.public_use!=="draft_only"||!Array.isArray(data.before)||data.before.length!==2||
      !data.place||!Array.isArray(data.sources))throw new Error("Unexpected review fixture");
  const identifiers=new Set(data.sources.map(x=>x.id));
  for(const section of [...data.before,data.basho,data.today]){
    if(section.human_review!=="pending_human"||section.public_use!=="draft_only")
      throw new Error("Unreviewed preview requires draft status");
    for(const sourceId of section.source_ids||[]){
      if(!identifiers.has(sourceId))throw new Error("Source not found: "+sourceId);
    }
  }
  const reference=data.place.dlm_reference_point;
  if(!reference||!Array.isArray(reference.coordinates)||reference.coordinates.length!==2||
      !reference.coordinates.every(Number.isFinite)||
      Math.abs(reference.coordinates[0])>180||Math.abs(reference.coordinates[1])>90)
    throw new Error("Invalid DLM reference point");
}
function updateSelection(){
  for(const button of document.querySelectorAll("[data-view]")){
    const selected=button.dataset.view===state.view;
    button.setAttribute("aria-pressed",String(selected));
  }
  const grid=id("layer-grid");
  grid.classList.toggle("single-layer",state.view!=="compare");
  for(const node of document.querySelectorAll("[data-layer]")){
    node.hidden=state.view!=="compare"&&state.view!==node.dataset.layer;
    node.classList.toggle("layer-alone",state.view===node.dataset.layer);
  }
  if(state.map&&!id("layer-today").hidden){
    requestAnimationFrame(()=>state.map.invalidateSize());
  }
}
function explanationFor(word){
  switch(word){
    case "秋風":
      return "能因の歌では、都を出て関に至ったところに秋風が吹きます。芭蕉の「秋風を耳に残し」は、古歌を知る人にその旅と季節の隔たりを思い起こさせる表現と説明されています。";
    case "紅葉":
      return "源頼政の歌は、都の青葉と関の紅葉を対比します。芭蕉も「紅葉を俤にして」と書き、眼前にない季節の景色を文学の記憶として重ねています。";
    case "青葉":
      return "芭蕉の眼前にある「青葉」と、能因の秋風・頼政の紅葉には季節のずれがあります。実景と先行文学の景色が重なるところが、この段の読みどころです。";
    default:return "";
  }
}
function updateWord(){
  for(const button of document.querySelectorAll("[data-word]"))
    button.setAttribute("aria-pressed",String(button.dataset.word===state.word));
  id("word-explanation").textContent=explanationFor(state.word);
  if(state.data){renderBefore();renderBasho();}
}
function renderBefore(){
  const target=id("before-content");
  target.replaceChildren();
  const grid=add(target,"div",null,"poem-items");
  for(const poem of state.data.before){
    const article=add(grid,"section",null,"poem-item");
    add(article,"p",poem.poet+"　｜　"+poem.work+" "+poem.catalogue_number+"番","poet");
    const poetry=add(article,"p",null,"poem-text");
    const segments=poem.text_segments;
    for(let i=0;i<segments.length;i++){
      markWords(poetry,segments[i],state.word);
      if(i<segments.length-1)poetry.appendChild(document.createTextNode("\n"));
    }
    add(article,"p","表記：DLM掲載データ・底本校合前","reference");
    add(article,"p",poem.note,"poem-note");
    add(article,"p",poem.relation_to_basho,"text-note");
  }
}
function renderBasho(){
  const target=id("basho-content");
  target.replaceChildren();
  add(target,"p",state.data.basho.work,"quote-label");
  const passage=add(target,"blockquote",null,"passsage");
  markWords(passage,state.data.basho.passage,state.word);
  add(target,"p",state.data.basho.passage_note,"text-note");
  const sora=add(target,"section",null,"sora-card");
  add(sora,"p","本文に掲げられた句","quote-label");
  add(sora,"p",state.data.basho.poet_included.verse,"sora-poem");
  add(sora,"p","作者表示："+state.data.basho.poet_included.name,"sora-byline");
  add(sora,"p",state.data.basho.poet_included.note,"text-note");
}
function renderToday(){
  const target=id("today-content");
  target.replaceChildren();
  add(target,"h3",state.data.today.title,"modern-title");
  add(target,"p",state.data.today.summary,"modern-note");
  const list=add(target,"ul",null,"fact-list");
  add(list,"li","指定：国史跡　1966年9月12日");
  add(list,"li","所在地：福島県白河市旗宿関ノ森ほか");
  add(list,"li","松平定信が1800年に現在地を比定");
  add(target,"p",state.data.today.caution,"text-note");
}
function renderSources(){
  const target=id("sources-list");
  target.replaceChildren();
  for(const source of state.data.sources){
    const url=safeSourceUrl(source.url);
    if(!url)continue;
    const link=add(target,"a",source.name+" ↗");
    link.href=url;
    link.target="_blank";
    link.rel="noopener noreferrer";
  }
  id("credit").textContent=state.data.source_attribution;
}
function renderQuestion(){
  id("learning-question").textContent=state.data.learning.prompt;
  const wrapper=id("learning-prompts");wrapper.replaceChildren();
  for(const text of state.data.learning.evidence_prompts)add(wrapper,"p","・"+text);
}
function renderPlace(){
  id("place-title").textContent=state.data.place.title;
  id("province").textContent=state.data.place.province_at_1689+"（1689年の参考表示）";
  id("municipality").textContent=state.data.place.modern_municipality;
  renderBefore();renderBasho();renderToday();renderSources();renderQuestion();
  updateSelection();updateWord();
}
function renderMap(){
  const fallback=id("map-fallback");
  if(!window.L){fallback.hidden=false;return;}
  const [longitude,latitude]=state.data.place.dlm_reference_point.coordinates;
  try{
    state.map=L.map("map",{scrollWheelZoom:false});
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      maxZoom:18
    }).addTo(state.map);
    state.map.setView([latitude,longitude],11);
    const point=L.circleMarker([latitude,longitude],{
      radius:9,weight:2,color:"#fff",fillColor:"#64836a",fillOpacity:1
    }).addTo(state.map);
    const popup=document.createElement("div");
    add(popup,"strong","DLM「白河の関」参照点");
    add(popup,"p","史跡指定域や芭蕉の実際の位置ではありません。");
    point.bindPopup(popup);
  }catch(error){
    fallback.hidden=false;
    console.warn("Map failed; the literary card remains available.",error);
  }
}
function showLoadError(error){
  const notice=document.querySelector(".notice");
  if(notice)add(notice,"strong","地点の資料が読み込めません。HTTPサーバーから試作を開いてください。");
  for(const target of ["before-content","basho-content","today-content"])
    id(target).textContent="資料を読み込めません。";
  id("learning-question").textContent="資料を確認できません。";
  id("map-fallback").hidden=false;
  console.error(error);
}
async function start(){
  for(const button of document.querySelectorAll("[data-view]")){
    button.addEventListener("click",()=>{state.view=button.dataset.view;updateSelection();});
  }
  for(const button of document.querySelectorAll("[data-word]")){
    button.addEventListener("click",()=>{state.word=button.dataset.word;updateWord();});
  }
  try{
    const response=await fetch(FIXTURE_URL);
    if(!response.ok)throw new Error("Data status "+response.status);
    const data=await response.json();
    validateFixture(data);
    state.data=data;
    renderPlace();
    renderMap();
  }catch(error){showLoadError(error);}
}
start();
