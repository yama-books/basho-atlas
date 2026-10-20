import {lookupCodhProvinceId} from '../src/historical-gis/codh-province-ids.mjs';
import {createProvinceAtlasService,parseTargetYear} from '../src/historical-gis/atlas-service.mjs';

const $=id=>document.getElementById(id);
const LEAFLET_JS={src:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',integrity:'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='};
const JAPAN=[[36.5,137.6],5];
const narrow=()=>window.matchMedia('(max-width:860px)').matches;
const state={service:null,catalog:null,selectedId:null,year:1689,group:'all',query:'',map:null,tileLayer:null,leafletLayer:null,
  references:[],markers:new Map(),pointsVisible:true,tileWarned:false};
// Status labels are text, never colour alone. "tone" only adds a secondary visual cue.
const STATUS={
  index_correspondence_only:['ID対応のみ','note'],transition_undetermined:['境界年・保留','caution'],
  historical_validity_unreviewed:['史料未監査','caution'],not_applicable_to_pre_reorganization:['時代対象外','caution'],
  time_not_attested:['年月日未監査','caution'],invalid_year:['年入力エラー','error']
};
function el(tag,value=null,className=''){
  const n=document.createElement(tag);if(className)n.className=className;
  if(value!==null)n.textContent=String(value);return n;
}
let announceTimer=0,statusTimer=0;
// Debounced so typing "1689" or a search word is read out once, not per keystroke.
function announce(text){clearTimeout(announceTimer);announceTimer=setTimeout(()=>{$('announce').textContent=text;},600);}
function setResultStatus(text,immediate=false){
  clearTimeout(statusTimer);
  if(immediate)$('result-status').textContent=text;
  else statusTimer=setTimeout(()=>{$('result-status').textContent=text;},350);
}
function setYear(v){
  const y=parseTargetYear(v);
  $('year-error').hidden=y!==null;
  $('target-year').setAttribute('aria-invalid',String(y===null));
  state.year=y; // invalid input must invalidate the previous result, not retain it
  if(y!==null&&$('target-year').value!==String(y))$('target-year').value=y;
  document.querySelectorAll('[data-year]').forEach(b=>b.setAttribute('aria-pressed',String(y!==null&&Number(b.dataset.year)===y)));
  renderDetails();renderMapPoints();
}
function provinceTitle(p){
  const base=p.name+(['regional_designation','historical_polity_label'].includes(p.category)?'':'国');
  return p.registry_group==='meiji_split'?base+'（明治の分割後）':base;
}
function renderList(){
  if(!state.service)return;
  const list=$('province-results');list.replaceChildren();
  const rows=state.service.search({text:state.query,group:state.group});
  $('catalog-count').textContent=rows.length+' / '+state.service.total;
  setResultStatus(rows.length?rows.length+'件。国名を選択してください。':'一致する国名がありません（索引は読み込み済み）。');
  if(!rows.length){list.append(el('p','該当なし。別表記・読み（例：むさし）・P IDをお試しください。','list-hint'));return;}
  for(const p of rows){
    const btn=el('button',null,'province-choice');btn.type='button';btn.dataset.provinceId=p.id;
    btn.setAttribute('aria-current',String(state.selectedId===p.id));
    const left=el('span');left.append(el('span',p.name,'choice-name'));
    left.append(el('span',p.registry_group==='meiji_split'?'明治期分割後のID':'江戸期からの国・地域ID','choice-desc'));
    btn.append(left,el('span',p.id,'choice-id'));
    btn.addEventListener('click',()=>{
      selectProvince(p.id);
      // On phones the notes sit below the list: bring them into view, focus stays on the button.
      if(narrow())$('detail').scrollIntoView({block:'start'});
    });
    const listItem=el('div');listItem.setAttribute('role','listitem');listItem.append(btn);list.append(listItem);
  }
  revealSelectedInList();
}
function revealSelectedInList(){
  const list=$('province-results');
  const b=list.querySelector('[aria-current="true"]');if(!b)return;
  const top=b.offsetTop-list.offsetTop,bottom=top+b.offsetHeight;
  if(top<list.scrollTop||bottom>list.scrollTop+list.clientHeight)list.scrollTop=Math.max(0,top-8);
}
function selectProvince(id){
  state.selectedId=id;
  // Keep existing search buttons in the DOM to retain keyboard focus.
  document.querySelectorAll('[data-province-id]').forEach(button=>{
    button.setAttribute('aria-current',String(button.dataset.provinceId===id));
  });
  renderDetails();renderMapPoints();
}
function addRelation(container,record,prefix){
  if(!record)return;
  const b=el('button',prefix+record.name+' '+record.id);b.type='button';
  b.addEventListener('click',()=>{
    state.query='';state.group='all';$('search').value='';
    document.querySelector('input[name="index-group"][value="all"]').checked=true;
    state.selectedId=record.id;renderList();selectProvince(record.id);
  });
  container.append(b);
}
function matchingReferences(){
  return state.references.filter(x=>state.year===1689&&x.provinceId!==null&&x.provinceId===state.selectedId);
}
function setStatusBadge(text,tone){const s=$('detail-state');s.textContent=text;s.dataset.tone=tone;}
function renderDetails(){
  if(!state.service)return;
  const details=state.service.getProvince({id:state.selectedId,year:state.year});
  const box=$('selected-reference');box.replaceChildren(el('strong','地図に描けること'));
  if(details.status!=='found'){
    $('focus-reference').hidden=true;
    box.append(el('p','国名を選ぶと、現代地図で確認できる参照点の有無を示します。'));
    return;
  }
  const r=details.relations;
  const p=details.record;
  $('detail-heading').textContent=provinceTitle(p);
  $('detail-id').textContent=p.id+' ・ '+(p.registry_group==='meiji_split'?'明治期分割後の索引':'江戸期からの索引');
  const verdict=details.yearResult;
  const [label,tone]=STATUS[verdict.status]||['未確認','caution'];
  setStatusBadge(label,tone);
  const v=$('year-verdict');v.replaceChildren();
  v.append(el('strong',verdict.status==='invalid_year'?'年が無効：':state.year+'年：','verdict-year'),verdict.message);
  const related=$('related-ids');related.replaceChildren();
  if(r.parent)addRelation(related,r.parent,'分割前：');
  for(const c of r.children)addRelation(related,c,'分割後：');
  if(!r.parent&&!r.children.length)related.append(el('span','CODHの一覧に直接の分割関係はありません。'));
  const pts=matchingReferences();
  $('focus-reference').hidden=!state.map || !state.pointsVisible || !pts.length;
  if(state.year===null){
    box.append(el('p','年の入力が無効なため、国名と現代参照点の関連付けを停止しています。'));
  }else if(pts.length){
    box.append(el('p','この国名に索引上関連づく現代の施設・史跡の参照点です（当時の所属・位置は未監査）。'));
    const ul=el('ul');for(const point of pts)ul.append(el('li',point.name));box.append(ul);
    if(!state.pointsVisible)box.append(el('p','現在、地図の参照点は非表示です。「現代参照点」をオンにすると表示されます。'));
    else if(!state.map)box.append(el('p','地図が利用できないため、位置は表示できません。'));
  }else{
    box.append(el('p','この国・年代の国境形状や確認済みの歴史上の位置は収録していないため、地図には何も描きません。推測した国境線や代表点も描きません。'));
  }
  announce(provinceTitle(p)+'、'+(state.year===null?'年が無効':state.year+'年')+'：'+label);
}
function showMapFallback(text){
  $('map-fallback').hidden=false;$('map-fallback-text').textContent=text;
  $('reset-map').disabled=true;$('toggle-modern').disabled=true;
}
function initMap(){
  if(typeof window.L==='undefined'){
    showMapFallback('地図ライブラリ（Leaflet）を読み込めませんでした。国名索引と年代・出典の表示は継続できます。');
    return;
  }
  try{
    $('map-fallback').hidden=true;$('reset-map').disabled=false;$('toggle-modern').disabled=false;
    state.map=window.L.map('map',{zoomControl:true,scrollWheelZoom:false,worldCopyJump:false,minZoom:4,maxZoom:14}).setView(...JAPAN);
    state.tileLayer=window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',maxZoom:19
    });
    // Many tiles can fail at once: show a single warning per load attempt.
    state.tileLayer.on('tileerror',()=>{
      if(state.tileWarned)return;
      state.tileWarned=true;
      $('tile-status').hidden=false;
      $('retry-tiles').hidden=false;
    });
    state.tileLayer.addTo(state.map);
    state.leafletLayer=window.L.layerGroup().addTo(state.map);
  }catch(_e){
    state.map=null;
    showMapFallback('地図の初期化に失敗しました。地名索引は継続できます。');
  }
}
function retryLeaflet(){
  $('retry-map').disabled=true;$('map-fallback-text').textContent='地図ライブラリを再読込しています…';
  const s=document.createElement('script');
  s.src=LEAFLET_JS.src;s.integrity=LEAFLET_JS.integrity;s.crossOrigin='';
  s.onload=()=>{$('retry-map').disabled=false;initMap();renderMapPoints();renderDetails();};
  s.onerror=()=>{$('retry-map').disabled=false;s.remove();
    showMapFallback('地図ライブラリ（Leaflet）を再度読み込めませんでした。通信状態を確認してください。国名索引と年代・出典は利用できます。');};
  document.head.append(s);
}
function safeSourceLink(raw){
  try{const u=new URL(raw);return u.protocol==='https:'?u.href:null;}catch(_e){return null;}
}
function popupFor(point){
  const n=el('div');n.append(el('strong',point.name));
  n.append(el('p','現代の参照地点。歴史的な事件や旧国境の位置を示しません。'));
  const url=safeSourceLink(point.source);
  if(url){const a=el('a','参照元 ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';n.append(a);}
  return n;
}
function renderMapPoints(){
  if(!state.leafletLayer){
    if(state.referencesLoaded)$('reference-status').textContent='地図を表示できないため参照点は描画していません（'+state.references.length+'件）';
    return;
  }
  state.leafletLayer.clearLayers();state.markers.clear();
  if(!state.pointsVisible){$('reference-status').textContent='現代参照点を非表示';return;}
  for(const p of state.references){
    const selected=state.year===1689&&p.provinceId!==null&&p.provinceId===state.selectedId;
    const m=window.L.circleMarker([p.lat,p.lng],{
      radius:selected?11:7,weight:selected?3:2,color:selected?'#1d4a3b':'#60746d',
      fillColor:selected?'#3c8061':'#a0b4a2',fillOpacity:.87
    }).bindPopup(popupFor(p),{maxWidth:260}).addTo(state.leafletLayer);
    state.markers.set(p,m);
  }
  if(state.referenceError&&!state.references.length){$('reference-status').textContent=state.referenceError;return;}
  $('reference-status').textContent=(state.year===null?'年入力エラー：国との対応強調は停止。':'')+state.references.length+'件：現代の参照点のみ'+(state.referenceError?'（'+state.referenceError+'）':'');
}
async function getJson(path){
  const r=await fetch(new URL(path,import.meta.url),{cache:'default'});
  if(!r.ok)throw Error('HTTP '+r.status);
  return r.json();
}
async function loadReferences(){
  const [basho,yashima]=await Promise.allSettled([
    getJson('../data/prototype-locations.json'),
    getJson('../data/historical-gis/yashima-basho.sample.geojson')
  ]);
  if(basho.status==='fulfilled'){
    for(const p of basho.value.places||[]){
      const [lng,lat]=p.coordinates||[];if(!Number.isFinite(lng)||!Number.isFinite(lat))continue;
      const codh=lookupCodhProvinceId({name:p.old_province?.name,year:p.old_province?.basis_year??1689});
      state.references.push({name:p.name,lng,lat,
        provinceId:codh.status==='id_match_only'?codh.province_id:null,
        source:p.source_url});
    }
  }
  if(yashima.status==='fulfilled'){
    const f=yashima.value.features?.find(x=>x.id==='hgis:genpei:ys001-modern');
    const [lng,lat]=f?.geometry?.coordinates||[];
    if(Number.isFinite(lng)&&Number.isFinite(lat)){
      state.references.push({name:f.properties.name,lng,lat,provinceId:null,
        source:'https://heritagemap.nabunken.go.jp/statistic/36339-%E5%B1%8B%E5%B3%B6.html'});
    }
  }
  state.referencesLoaded=true;
  const failed=[basho,yashima].filter(x=>x.status==='rejected').length;
  state.referenceError=failed===2?'参照点データを取得できませんでした（国名・年代判定には影響しません）':failed?'一部の参照点データを取得できませんでした':'';
  renderMapPoints();renderDetails();
}
async function loadIndex(){
  $('retry-index').hidden=true;$('catalog-count').textContent='読込中';
  setResultStatus('索引を読み込んでいます。',true);
  try{
    state.catalog=await getJson('../data/historical-gis/codh-province-index.json');
    state.service=createProvinceAtlasService(state.catalog);
    $('search').disabled=false;
    const checked=state.catalog.source?.checked_on;
    if(checked)$('catalog-checked').textContent='（'+(state.catalog.source.title||'')+'・確認日 '+checked+'）';
    renderList();renderDetails();
  }catch(_error){
    // A failed fetch is not "0 results": say so and offer a retry.
    state.service=null;
    $('province-results').replaceChildren();
    setResultStatus('通信エラー：国名索引を読み込めませんでした。検索と年代判定はできません。再読込するか、HTTPサーバー経由で開いてください。',true);
    $('catalog-count').textContent='取得失敗';
    $('retry-index').hidden=false;
    $('detail-heading').textContent='国名索引を読み込めません';
    setStatusBadge('索引なし','error');
    $('year-verdict').textContent='索引が取得できないため年代判定はできません。典拠のリンクは利用できます。';
  }
}
function focusResult(step,from){
  const buttons=[...document.querySelectorAll('.province-choice')];if(!buttons.length)return;
  const i=from?buttons.indexOf(from):-1;
  buttons[Math.min(buttons.length-1,Math.max(0,i+step))].focus();
}
async function boot(){
  document.querySelectorAll('[data-year]').forEach(b=>b.addEventListener('click',()=>setYear(b.dataset.year)));
  $('target-year').addEventListener('input',e=>setYear(e.target.value));
  $('search').addEventListener('input',e=>{state.query=e.target.value;renderList();});
  $('search').addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'||(e.key==='Enter'&&!e.isComposing)){e.preventDefault();focusResult(1,null);}
  });
  $('province-results').addEventListener('keydown',e=>{
    if(!e.target.matches('.province-choice'))return;
    if(e.key==='ArrowDown'){e.preventDefault();focusResult(1,e.target);}
    else if(e.key==='ArrowUp'){e.preventDefault();
      const first=document.querySelector('.province-choice')===e.target;first?$('search').focus():focusResult(-1,e.target);}
  });
  document.querySelectorAll('input[name="index-group"]').forEach(b=>b.addEventListener('change',e=>{
    if(e.target.checked){state.group=e.target.value;renderList();}
  }));
  $('toggle-modern').addEventListener('change',e=>{state.pointsVisible=e.target.checked;renderMapPoints();renderDetails();});
  $('retry-tiles').addEventListener('click',()=>{
    if(!state.tileLayer)return;
    $('tile-status').hidden=true;$('retry-tiles').hidden=true;state.tileWarned=false;
    state.tileLayer.redraw();
  });
  $('retry-map').addEventListener('click',retryLeaflet);
  $('retry-index').addEventListener('click',loadIndex);
  $('reset-map').addEventListener('click',()=>{if(state.map){state.map.closePopup();state.map.setView(...JAPAN);}});
  $('focus-reference').addEventListener('click',()=>{
    if(!state.map)return;
    const matching=matchingReferences();
    if(!matching.length)return;
    if(matching.length===1){state.map.setView([matching[0].lat,matching[0].lng],11);state.markers.get(matching[0])?.openPopup();}
    else state.map.fitBounds(window.L.latLngBounds(matching.map(p=>[p.lat,p.lng])).pad(.25),{maxZoom:10});
    $('map').scrollIntoView({behavior:'auto',block:'nearest'});
  });
  $('back-to-search').addEventListener('click',()=>{
    $('catalogue').scrollIntoView({block:'start'});
    (document.querySelector('.province-choice[aria-current="true"]')||$('search')).focus({preventScroll:true});
  });
  initMap();
  await loadIndex();
  await loadReferences();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
