import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CODH_PROVINCE_ID_SOURCE, lookupCodhProvinceId } from '../src/historical-gis/codh-province-ids.mjs';
import { adaptBashoPrototype } from '../src/historical-gis/adapters.mjs';
import { resolveProvince, queryFeatures } from '../src/historical-gis/core.mjs';

const source=JSON.parse(readFileSync(new URL('../data/prototype-locations.json',import.meta.url),'utf8'));
const catalog=adaptBashoPrototype(source);

test('CODH crosswalk: 武蔵国 in 1689 indexes to P010, without polygon',()=>{
  const r=lookupCodhProvinceId({name:'武蔵国',year:1689});
  assert.equal(r.province_id,'P010');assert.equal(r.status,'id_match_only');assert.equal(r.geometry,null);
});
test('CODH crosswalk: 陸奥国 in 1689 indexes to P002, not P115',()=>{
  const r=lookupCodhProvinceId({name:'陸奥国',year:1689});
  assert.equal(r.province_id,'P002');assert.notEqual(r.province_id,'P115');
});
test('pre-modern shorthand names use only audited name normalization',()=>{
  assert.equal(lookupCodhProvinceId({name:' 武蔵 ',year:1689}).province_id,'P010');
  assert.equal(lookupCodhProvinceId({name:'陸奥',year:1689}).province_id,'P002');
});
test('1689 unsupported province ID is unknown, not derived from coordinate or name similarity',()=>{
  const r=lookupCodhProvinceId({name:'讃岐国',year:1689});
  assert.equal(r.province_id,null);assert.equal(r.status,'no_verified_crosswalk');
});
test('1868 陸奥 never receives an automatic before/after partition ID',()=>{
  const r=lookupCodhProvinceId({name:'陸奥国',year:1868});
  assert.equal(r.province_id,null);assert.equal(r.status,'transition_undetermined');
});
test('1869 陸奥 is not blindly assigned post-split P115 by name alone',()=>{
  const r=lookupCodhProvinceId({name:'陸奥国',year:1869});
  assert.equal(r.province_id,null);assert.equal(r.status,'not_audited_for_year');
});
test('medieval and other undocumented periods are not backfilled from CODH modern register',()=>{
  const r=lookupCodhProvinceId({name:'武蔵国',year:1185});
  assert.equal(r.province_id,null);assert.equal(r.status,'not_audited_for_year');
});
test('invalid time cannot enter the crosswalk',()=>{
  assert.throws(()=>lookupCodhProvinceId({name:'陸奥国',year:1689.5}),RangeError);
  assert.throws(()=>lookupCodhProvinceId({name:'陸奥国',year:'1689'}),RangeError);
});
test('CODH source URI is official and all matches keep it',()=>{
  assert.equal(CODH_PROVINCE_ID_SOURCE,'https://codh.rois.ac.jp/province/');
  assert.equal(lookupCodhProvinceId({name:'武蔵',year:1689}).source_url,CODH_PROVINCE_ID_SOURCE);
});
test('existing Basho adapter keeps all 1689 old province claims but annotates IDs only',()=>{
  const names=source.places.map(p=>p.old_province.name);
  assert.deepEqual(names,['武蔵国','陸奥国','陸奥国']);
  const actual=catalog.features.filter(f=>f.properties.feature_type==='province_membership');
  assert.deepEqual(actual.map(f=>f.properties.codh_province_id),['P010','P002','P002']);
  assert(actual.every(f=>f.properties.codh_id_match_status==='id_match_only'));
  assert(actual.every(f=>f.geometry===null));
});
test('crosswalk never bypasses feature publication rights and human review',()=>{
  assert.equal(queryFeatures(catalog,{year:1689}).length,0);
  for(const p of source.places){
    const c=resolveProvince(catalog,{sourceRecordId:p.id,year:1689,mode:'research'});
    assert.equal(c.status,'candidate');
    assert.equal(resolveProvince(catalog,{sourceRecordId:p.id,year:1689}).status,'unknown');
  }
});
test('crosswalk preserves original source registry unmodified',()=>{
  const before=JSON.stringify(source);
  adaptBashoPrototype(source);
  assert.equal(JSON.stringify(source),before);
  assert(catalog.features.every(f=>f.properties.layer!=='historical_toponym'||f.properties.codh_id_source_url===CODH_PROVINCE_ID_SOURCE));
});
