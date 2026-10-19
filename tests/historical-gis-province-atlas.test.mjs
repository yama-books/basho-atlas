import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProvinceIndex,searchProvinceIndex,explainProvinceYear,provinceRelations} from '../src/historical-gis/province-index.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const catalog=JSON.parse(read('data/historical-gis/codh-province-index.json'));
const validated=validateProvinceIndex(catalog);
const of=id=>validated.byId.get(id);
const html=read('kyukoku/index.html');
const app=read('kyukoku/app.mjs');
const css=read('kyukoku/styles.css');

test('CODH official catalogue has 70 inherited IDs and 18 split IDs',()=>{
  assert.equal(validated.inherited.length,70);
  assert.equal(validated.split.length,18);
  assert.equal(validated.byId.size,88);
});
test('every official sequential ID exists exactly once',()=>{
  for(let i=1;i<=70;i++)assert(validated.byId.has('P'+String(i).padStart(3,'0')));
  for(let i=100;i<=117;i++)assert(validated.byId.has('P'+String(i).padStart(3,'0')));
});
test('official verified table links 武蔵 to P010',()=>assert.equal(of('P010').name,'武蔵'));
test('official old 陸奥 / split 陸奥 stay separate',()=>{
  assert.equal(of('P002').name,'陸奥');
  assert.equal(of('P115').name,'陸奥');
  assert.equal(of('P115').parent_id,'P002');
  assert.notEqual(of('P002').id,of('P115').id);
});
test('all 18 split ids have a valid parent and reciprocal official relationship',()=>{
  for(const e of validated.split){
    assert(['P001','P002','P003'].includes(e.parent_id));
    assert(of(e.parent_id).linked_to.includes(e.id));
  }
});
test('P001 region and P070 Ryukyu are not forced into same province category',()=>{
  assert.equal(of('P001').category,'regional_designation');
  assert.equal(of('P070').category,'historical_polity_label');
});
test('Geoshape K ID must not be interpreted as CODH P ID',()=>{
  assert(!catalog.entries.some(x=>/^K/.test(x.id)));
  assert(!catalog.entries.some(x=>Object.hasOwn(x,'geometry')));
  assert(!catalog.entries.some(x=>Object.hasOwn(x,'coordinates')));
});
test('the catalogue does not claim historical borders or full year coverage',()=>{
  assert.equal(catalog.scope.geographic_membership_attested,false);
  assert.equal(catalog.scope.historical_validity_asserted,false);
  assert.equal(catalog.rights.contains_boundary_geometry,false);
  assert.equal(catalog.rights.redistribution_of_boundary_geometry,false);
});
test('source reference and rights review are explicit',()=>{
  assert.equal(catalog.source.url,'https://codh.rois.ac.jp/province/');
  assert.match(catalog.rights.review_status,/pending_human/);
  assert.match(catalog.source.page_policy,/codh.rois.ac.jp\/policy/);
});
test('search by Unicode name, province suffix, official ID, reading',()=>{
  assert.deepEqual(searchProvinceIndex(catalog,{query:'武蔵国'}).map(x=>x.id),['P010']);
  assert.deepEqual(searchProvinceIndex(catalog,{query:'Ｐ０１０'}).map(x=>x.id),['P010']);
  assert.deepEqual(searchProvinceIndex(catalog,{query:'むさし'}).map(x=>x.id),['P010']);
  assert.deepEqual(searchProvinceIndex(catalog,{query:'さぬき'}).map(x=>x.id),['P044']);
  assert.deepEqual(searchProvinceIndex(catalog,{query:'胆振'}).map(x=>x.id),['P101']);
});
test('ambiguous same name 陸奥 returns both records instead of deduplicating',()=>{
  assert.deepEqual(searchProvinceIndex(catalog,{query:'陸奥'}).map(x=>x.id),['P002','P115']);
});
test('filter by ID group keeps 70 and 18 separate',()=>{
  assert.equal(searchProvinceIndex(catalog,{group:'edo_inherited'}).length,70);
  assert.equal(searchProvinceIndex(catalog,{group:'meiji_split'}).length,18);
});
test('invalid search group is rejected',()=>{
  assert.throws(()=>searchProvinceIndex(catalog,{group:'invented'}),RangeError);
});
test('1689 武蔵 and 陸奥 are ID matches only, not verified geography',()=>{
  for(const id of ['P010','P002']){
    const r=explainProvinceYear(of(id),1689);
    assert.equal(r.status,'index_correspondence_only');
    assert.equal(r.province_id,id);
    assert.equal(r.geometry,null);
  }
});
test('1868 陸奥 split is explicitly indeterminate',()=>{
  const r=explainProvinceYear(of('P002'),1868);
  assert.equal(r.status,'transition_undetermined');
  assert.equal(r.province_id,null);
});
test('1868 post-split 陸奥 does not inherit 1689 ID status',()=>{
  assert.equal(explainProvinceYear(of('P115'),1689).status,'not_applicable_to_pre_reorganization');
  assert.equal(explainProvinceYear(of('P115'),1868).status,'time_not_attested');
});
test('1185 arbitrary IDs do not assert automatic historical membership',()=>{
  assert.equal(explainProvinceYear(of('P044'),1185).status,'historical_validity_unreviewed');
  assert.equal(explainProvinceYear(of('P010'),1185).status,'historical_validity_unreviewed');
});
test('year strings and fractional years cannot be used as time filters',()=>{
  assert.throws(()=>explainProvinceYear(of('P010'),'1689'),RangeError);
  assert.throws(()=>explainProvinceYear(of('P010'),1689.5),RangeError);
});
test('parent to children relationship is explicit and does not imply geography',()=>{
  const r=provinceRelations(catalog,'P002');
  assert.equal(r.parent,null);
  assert.deepEqual(r.children.map(x=>x.id),['P111','P112','P113','P114','P115']);
  assert.equal(provinceRelations(catalog,'P115').parent.id,'P002');
  assert.equal(provinceRelations(catalog,'missing'),null);
});
test('catalog validation rejects missing, duplicated and renamed official IDs',()=>{
  const broken=structuredClone(catalog);broken.entries[0].id='P010';
  assert.throws(()=>validateProvinceIndex(broken),/duplicate|malformed/);
  const absent=structuredClone(catalog);absent.entries[0].id='P000';
  assert.throws(()=>validateProvinceIndex(absent),/missing|duplicate|malformed/);
});
test('independent atlas loads common data without altering existing app',()=>{
  assert(html.includes('../docs/HISTORICAL_GIS_PROVINCE_ATLAS_20261019.md'));
  assert(html.includes('type="module" src="./app.mjs"'));
  assert(app.includes("getJson('../data/historical-gis/codh-province-index.json')"));
  assert(app.includes("getJson('../data/prototype-locations.json')"));
  assert(app.includes("getJson('../data/historical-gis/yashima-basho.sample.geojson')"));
});
test('all DOM references used by atlas JS are present in HTML',()=>{
  for(const [,id] of app.matchAll(/\$\('([\w-]+)'\)/g)){
    assert(html.includes('id="'+id+'"'),'missing '+id);
  }
});
test('atlas never draws a guessed historical country border',()=>{
  assert(!/L\.polygon\s*\(/.test(app));
  assert(!/L\.geoJSON\s*\(/.test(app));
  assert(!/L\.polyline\s*\(/.test(app));
  assert(app.includes("year===1689"));
  assert(app.includes("provinceId:null"));
});
test('atlas renders untrusted site names as text nodes, not innerHTML',()=>{
  assert(app.includes('textContent'));
  assert(!app.includes('innerHTML'));
  assert(app.includes('replaceChildren'));
});
test('map has a fallback, consent-friendly ref points toggle, keyboard inputs',()=>{
  for(const name of ['map-fallback','toggle-modern','search','target-year','year-verdict','reset-map','focus-reference'])assert(html.includes('id="'+name+'"'));
  assert(html.includes('aria-live="polite"'));
  assert(html.includes('class="skip-link"'));
  assert(css.includes('prefers-reduced-motion'));
});
test('map tiles use official OSM URL and attribution, with no offline prefetch',()=>{
  assert(app.includes('https://tile.openstreetmap.org/{z}/{x}/{y}.png'));
  assert(app.includes('OpenStreetMap'));
  assert(!/prefetch\s*\(/.test(app));
});
