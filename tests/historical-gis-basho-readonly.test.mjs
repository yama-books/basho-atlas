import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptBashoPrototype} from '../src/historical-gis/adapters.mjs';
import {resolveProvince,queryFeatures} from '../src/historical-gis/core.mjs';

const raw=JSON.parse(readFileSync(new URL('../data/prototype-locations.json',import.meta.url),'utf8'));

test('read-only Basho bridge retains original three modern reference points',()=>{
  const before=JSON.stringify(raw);
  const catalog=adaptBashoPrototype(raw);
  assert.equal(catalog.features.filter(f=>f.properties.layer==='modern_reference').length,3);
  assert.equal(catalog.features.filter(f=>f.properties.layer==='historical_toponym').length,3);
  assert.equal(catalog.features.length,6);
  assert.equal(JSON.stringify(raw),before,'adapter must not mutate Basho source data');
});
test('1689 historical labels are research candidates, never certified polygons',()=>{
  const catalog=adaptBashoPrototype(raw);
  for (const [site,name] of [['fukagawa','武蔵国'],['takekuma','陸奥国'],['matsushima','陸奥国']]) {
    const value=resolveProvince(catalog,{sourceRecordId:site,year:1689,mode:'research'});
    assert.equal(value.status,'candidate');
    assert.equal(value.candidates[0].feature.properties.province_name,name);
    assert.equal(value.candidates[0].feature.geometry,null);
    assert.equal(resolveProvince(catalog,{sourceRecordId:site,year:1689}).status,'unknown');
  }
});
test('public 1689 historical GIS output stays empty until approval and rights clearance',()=>{
  const catalog=adaptBashoPrototype(raw);
  assert.equal(queryFeatures(catalog,{year:1689}).length,0);
});
