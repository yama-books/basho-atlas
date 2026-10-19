import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
function readJson(relative) {
  return JSON.parse(fs.readFileSync(new URL(relative,root), "utf8"));
}
const dlm = readJson("data/research/dlm-place-crosswalk.draft.json");
const heritage = readJson("data/research/official-scenic-places.draft.json");
const prototype = readJson("data/prototype-locations.json");

test("DLM crosswalk records have source, stable IDs, and valid map coordinates", () => {
  assert.equal(dlm.records.length,5);
  assert.equal(dlm.review_status,"pending_human");
  assert.equal(dlm.public_use,"research_only");
  assert.equal(dlm.source.whole_xlsx_imported,false);
  assert.match(dlm.source.license,/CC BY 4\.0/);
  const ids=new Set();
  for(const record of dlm.records){
    assert(!ids.has(record.external_id),"Duplicate DLM ID");
    ids.add(record.external_id);
    assert(record.external_url.endsWith("/"+record.external_id+"/"));
    const [lng,lat]=record.coordinates;
    assert(Number.isFinite(lng)&&Math.abs(lng)<=180);
    assert(Number.isFinite(lat)&&Math.abs(lat)<=90);
    assert.equal(record.review_status,"pending_human");
    assert.notEqual(record.relation,"same_confirmed");
  }
});

test("literary landscapes cannot silently replace existing modern POI pin positions", () => {
  const targetMap=new Map(prototype.places.map(p=>[p.id,p]));
  const matsushima=dlm.records.find(x=>x.external_name==="松島");
  const sumidagawa=dlm.records.find(x=>x.external_name==="隅田川");
  assert(matsushima && sumidagawa);
  assert.equal(matsushima.atlas_proto_id,"matsushima");
  assert.equal(sumidagawa.atlas_proto_id,"fukagawa");
  assert.notDeepEqual(matsushima.coordinates,targetMap.get("matsushima").coordinates);
  assert.notDeepEqual(sumidagawa.coordinates,targetMap.get("fukagawa").coordinates);
  assert.equal(sumidagawa.relation,"related_literary_geography_only");
  assert.equal(matsushima.relation,"broad_literary_landscape_to_modern_landmark");
});

test("official scenic registry is distinct from the initial designation count", () => {
  assert.equal(heritage.review_status,"pending_human");
  assert.equal(heritage.count,26);
  assert.equal(heritage.components.length,26);
  assert.equal(heritage.origin.initial_designation_date,"2014-03-18");
  assert.equal(heritage.origin.latest_addition_date_recorded_on_page,"2021-10-11");
  const names=heritage.components.map(x=>x.official_name);
  assert.equal(new Set(names).size,26);
  for(const component of heritage.components){
    assert.equal(component.review_status,"pending_human");
    assert.equal(component.individual_designation_date,null);
    assert.equal(component.site_coordinates,null);
    assert.equal(component.matched_to_literary_place,false);
  }
});

test("white river name collision and unresolved Takekuma mapping remain explicit", () => {
  assert(dlm.records.some(x=>x.external_name==="白河の関"));
  assert(dlm.lookup_gaps.some(x=>x.queried_name==="武隈の松"));
  assert(dlm.import_rules.some(x=>x.includes("文字列一致のみ")));
});
