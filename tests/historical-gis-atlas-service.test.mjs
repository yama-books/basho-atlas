import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createProvinceAtlasService, parseTargetYear} from '../src/historical-gis/atlas-service.mjs';

const catalog=JSON.parse(readFileSync(new URL('../data/historical-gis/codh-province-index.json',import.meta.url),'utf8'));
const service=createProvinceAtlasService(catalog);
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('kyukoku/app.mjs');
const html=read('kyukoku/index.html');
const css=read('kyukoku/styles.css');

test('a single Core facade provides all 88 catalogue records without a second database',()=>{
  assert.equal(service.total,88);
  assert.equal(service.search().length,88);
  assert.equal(service.search({group:'meiji_split'}).length,18);
});
test('the Core facade finds old province and post-division country separately',()=>{
  assert.deepEqual(service.search({text:'陸奥'}).map(x=>x.id),['P002','P115']);
});
test('the facade follows the official CODH identifier, not a guessed polygon',()=>{
  const result=service.getProvince({id:'P010',year:1689});
  assert.equal(result.status,'found');
  assert.equal(result.record.name,'武蔵');
  assert.equal(result.yearResult.status,'index_correspondence_only');
  assert.equal(result.yearResult.geometry,null);
});
test('year parser allows normal valid years and full-width input',()=>{
  for(const [value,expected] of [['1185',1185],['１６８９',1689],[1868,1868],['0001',1]])
    assert.equal(parseTargetYear(value),expected);
});
test('year parser rejects empty, invalid, out of range or exponent years',()=>{
  for(const value of ['',null,undefined,'-1','0','10000','1e3','1.5',1689.5,NaN,'abc','2026-10-19'])
    assert.equal(parseTargetYear(value),null,String(value));
});
test('invalid year never falls back to the previous valid result',()=>{
  for(const value of ['', '1689.5', 0]){
    const result=service.getProvince({id:'P010',year:value});
    assert.equal(result.yearResult.status,'invalid_year');
    assert.equal(result.yearResult.province_id,null);
    assert.equal(result.yearResult.geometry,null);
  }
});
test('1785 unknown history remains unknown and 1868 Mutsu remains transition',()=>{
  assert.equal(service.getProvince({id:'P010',year:1785}).yearResult.status,'historical_validity_unreviewed');
  assert.equal(service.getProvince({id:'P002',year:1868}).yearResult.status,'transition_undetermined');
  assert.equal(service.getProvince({id:'P115',year:1689}).yearResult.status,'not_applicable_to_pre_reorganization');
});
test('unknown ID is an explicit not-found result rather than throwing or using a nearby province',()=>{
  const result=service.getProvince({id:'K31',year:1689});
  assert.equal(result.status,'not_found');
  assert.equal(result.record,null);
});
test('read-only queries do not mutate the shared historical name index',()=>{
  const original=JSON.stringify(catalog);
  service.search({text:'陸奥'});
  service.getProvince({id:'P002',year:'invalid'});
  service.getProvince({id:'P002',year:1868});
  assert.equal(JSON.stringify(catalog),original);
});
test('atlas responds to input events, including partial/invalid edits',()=>{
  assert(app.includes("addEventListener('input',e=>setYear(e.target.value))"));
  assert(app.includes('state.year=y; // invalid input must invalidate the previous result'));
  assert(app.includes('parseTargetYear(v)'));
  assert(html.includes('aria-describedby="year-error"'));
  assert(app.includes('invalid_year:'));
});
test('search result selection keeps native focus by updating aria-current in place',()=>{
  assert(app.includes("document.querySelectorAll('[data-province-id]')"));
  assert(!app.includes('state.selectedId=id;renderList()'));
});
test('tileerror warns but is not an atlas-wide failure',()=>{
  assert(app.includes("state.tileLayer.on('tileerror'"));
  assert(app.includes('state.tileLayer.redraw()'));
  assert(html.includes('id="tile-status"'));
  assert(html.includes('id="retry-tiles"'));
  assert(css.includes('.tile-warning[hidden]'));
});
test('mobile view puts the search panel before the map panel',()=>{
  assert(css.includes('.map-panel{order:1}.explore-panel{order:0'));
});
