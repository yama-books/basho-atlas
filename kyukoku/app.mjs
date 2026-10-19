import {lookupCodhProvinceId} from '../src/historical-gis/codh-province-ids.mjs';
import {createProvinceAtlasService,parseTargetYear} from '../src/historical-gis/atlas-service.mjs';

const $=id=>document.getElementById(id);
const state={service:null,selectedId:'P010',year:1689,group:'all',query:'',map:null,tileLayer:null,leafletLayer:null,references:[],pointsVisible:true};
function el(tag,value=null,className=''){
  const n=document.createElement(tag);if(className)n.className=className;
  if(value!==null)n.textContent=String(value);return n;
}
function setYear(v){
  const y=parseTargetYear(v);
  $('year-error').hidden=y!==null;
  $('target-year').setAttribute('aria-invalid',String(y===null));
  state.year=y; // invalid input must invalidate the previous result, not retain it
  if(y!==null)$('target-year').value=y;
  document.querySelectorAll('[data-year]').forEach(b=>b.setAttribute('aria-pressed',String(y!==null&&Number(b.dataset.year)===y)));
  renderDetails();renderMapPoints();
}
function renderList(){
  if(!state.service)return;
  const list=$('province-results');list.replaceChildren();
  const rows=state.service.search({text:state.query,group:state.group});
  $('catalog-count').textContent=rows.length+' / '+state.service.total;
  $('result-status').textContent=rows.length?rows.length+'件。国名を選択してください。':'一致する国名がありません。';
  if(!rows.length){list.append(el('p','該当なし。別表記やP IDをお試しください。','list-hint'));return;}
  for(const p of rows){
    const btn=el('button',null,'province-choice');btn.type='button';btn.dataset.provinceId=p.id;
    btn.setAttribute('aria-current',String(state.selectedId===p.id));
    const left=el('span');left.append(el('span',p.name,'choice-name'));
    left.append(el('span',p.registry_group==='meiji_split'?'明治期分割後のID':'江戸期からの国・地域ID','choice-desc'));
    btn.append(left,el('span',p.id,'choice-id'));
    btn.addEventListener('click',()=>selectProvince(p.id));
    const listItem=el('div');listItem.setAttribute('role','listitem');listItem.append(btn);list.append(listItem);
  }
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
    renderList();selectProvince(record.id);
  });
  container.append(b);
}
function renderDetails(){
  if(!state.service)return;
  const details=state.service.getProvince({id:state.selectedId,year:state.year});
  if(details.status!=='found')return;
  const r=details.relations;
  const p=details.record;
  $('detail-heading').textContent=p.name+(['regional_designation','historical_polity_label'].includes(p.category)?'':'国');
  $('detail-id').textContent=p.id+' ・ '+(p.registry_group==='meiji_split'?'明治期分割後の索引':'江戸期からの索引');
  const verdict=details.yearResult;
  $('detail-state').textContent={
    index_correspondence_only:'ID対応のみ',transition_undetermined:'境界年・保留',
    historical_validity_unreviewed:'史料未監査',not_applicable_to_pre_reorganization:'時代対象外',
    time_not_attested:'年月日未監査',invalid_year:'年入力エラー'
  }[verdict.status]||'未確認';
  $('year-verdict').textContent=verdict.message;
  const related=$('related-ids');related.replaceChildren();
  if(r.parent)addRelation(related,r.parent,'分割前：');
  for(const c of r.children)addRelation(related,c,'分割後：');
  if(!r.parent&&!r.children.length)related.append(el('span','CODHの一覧に直接の分割関係はありません。'));
  const box=$('selected-reference');box.replaceChildren();box.hidden=false;
  $('focus-reference').hidden=!state.map || !state.pointsVisible || state.year!==1689 || !state.references.some(x=>x.provinceId===p.id);
  const pts=state.references.filter(x=>state.year===1689&&x.provinceId===p.id);
  if(pts.length){
    box.append(el('strong','関連する現代参照地点（当時の所属は未監査）'));
    for(const point of pts)box.append(el('p',point.name+'：現代施設・史跡の参照点です。'));
  }else{
    box.append(el('strong','国境形状・確認済み歴史位置は未収録'));
    box.append(el('p','未確認の領域を自動生成したり、現代座標を旧国の代表点として扱ったりしません。'));
  }
}
function initMap(){
  if(typeof window.L==='undefined'){
    $('map-fallback').hidden=false;
    $('map-fallback').textContent='Leafletを読み込めませんでした。地名索引と年代・出典の表示は継続できます。';
    return;
  }
  try{
    state.map=window.L.map('map',{zoomControl:true,scrollWheelZoom:false,worldCopyJump:false,minZoom:4,maxZoom:14}).setView([36.5,137.6],5);
    state.tileLayer=window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',maxZoom:19
    });
    state.tileLayer.on('tileerror',()=>{
      $('tile-status').hidden=false;
      $('retry-tiles').hidden=false;
    });
    state.tileLayer.addTo(state.map);
    state.leafletLayer=window.L.layerGroup().addTo(state.map);
  }catch(_e){
    $('map-fallback').hidden=false;
    $('map-fallback').textContent='地図の初期化に失敗しました。地名索引は継続できます。';
  }
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
  if(!state.leafletLayer)return;
  state.leafletLayer.clearLayers();
  if(!state.pointsVisible){$('reference-status').textContent='現代参照点を非表示';return;}
  for(const p of state.references){
    const selected=state.year===1689&&p.provinceId===state.selectedId;
    window.L.circleMarker([p.lat,p.lng],{
      radius:selected?10:7,weight:selected?3:2,color:selected?'#235747':'#60746d',
      fillColor:selected?'#3c8061':'#a0b4a2',fillOpacity:.87
    }).bindPopup(popupFor(p),{maxWidth:260}).addTo(state.leafletLayer);
  }
  $('reference-status').textContent=state.year===null?'年入力エラー：国との対応強調は停止':state.references.length+'件：現代の参照点のみ';
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
  if(!state.references.length)$('reference-status').textContent='参照点データ取得失敗';
  renderMapPoints();renderDetails();
}
async function boot(){
  document.querySelectorAll('[data-year]').forEach(b=>b.addEventListener('click',()=>setYear(b.dataset.year)));
  $('target-year').addEventListener('input',e=>setYear(e.target.value));
  $('search').addEventListener('input',e=>{state.query=e.target.value;renderList();});
  document.querySelectorAll('input[name="index-group"]').forEach(b=>b.addEventListener('change',e=>{
    if(e.target.checked){state.group=e.target.value;renderList();}
  }));
  $('toggle-modern').addEventListener('change',e=>{state.pointsVisible=e.target.checked;renderMapPoints();renderDetails();});
  $('retry-tiles').addEventListener('click',()=>{
    if(!state.tileLayer)return;
    $('tile-status').hidden=true;$('retry-tiles').hidden=true;
    state.tileLayer.redraw();
  });
  $('reset-map').addEventListener('click',()=>{if(state.map)state.map.setView([36.5,137.6],5);});
  $('focus-reference').addEventListener('click',()=>{
    if(!state.map)return;
    const matching=state.references.filter(p=>state.year===1689&&p.provinceId===state.selectedId);
    if(!matching.length)return;
    if(matching.length===1)state.map.setView([matching[0].lat,matching[0].lng],11);
    else state.map.fitBounds(window.L.latLngBounds(matching.map(p=>[p.lat,p.lng])).pad(.25),{maxZoom:10});
    $('map').scrollIntoView({behavior:'auto',block:'nearest'});
  });
  initMap();
  try{
    state.service=createProvinceAtlasService(await getJson('../data/historical-gis/codh-province-index.json'));
    renderList();renderDetails();
  }catch(_error){
    $('result-status').textContent='索引の読み込みに失敗しました。HTTPサーバー経由で開いてください。';
    $('catalog-count').textContent='取得失敗';
  }
  await loadReferences();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
