import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const read=path=>JSON.parse(fs.readFileSync(new URL(path,root),"utf8"));
const audit=read("data/research/dlm-xlsx-schema-audit.json");
const candidates=read("data/research/dlm-poem-form-candidates.draft.json");
const proto=read("data/prototype-locations.json");
const expected=new Map([
 ["Spots (文学名所)",101],["Documents (資料)",336],["Poems (和歌)",1951],
 ["Poems Translations (和歌翻訳)",565],["Sanbuns (物語・説話)",437],
 ["Sanbuns Translations (物語翻訳)",374],["Yokyokus (謡曲)",444],["Images (絵図等)",129]
]);

test("DLM remote-converted XLSX comprises eight complete table schemas",()=>{
 assert.equal(audit.sheets.length,8);
 for(const sheet of audit.sheets){
   assert.equal(sheet.row_count,expected.get(sheet.sheet_name));
   assert.equal(sheet.field_count,sheet.fields.length);
   assert.equal(sheet.id_duplicate_count,0);
 }
 assert.equal(audit.original_xlsx_saved,false);
 assert.equal(audit.original_xlsx_sha256,null);
 assert.equal(audit.status,"schema_extracted_from_remote_conversion_not_original_binary_verified");
});

test("Yokyoku missing IDs are tracked instead of relabelled duplicate records",()=>{
 for(const sheet of audit.sheets) {
   if(sheet.sheet_name==="Yokyokus (謡曲)") {
     assert.equal(sheet.id_missing,6);
     assert.equal(sheet.id_filled,438);
     assert.equal(sheet.id_unique,438);
   }else{
     assert.equal(sheet.id_missing,0);
   }
 }
});

test("poem-key ambiguity remains explicit and no synthetic place foreign key appears",()=>{
 const stats=audit.cross_sheet_checks;
 assert.equal(stats.poem_count,1951);
 assert.equal(stats.poem_topographic_forms_filled,1889);
 assert.equal(stats.poems_explicit_place_id_column_exists,false);
 assert.equal(stats.poems_document_uuid_key_exists,false);
 assert.equal(stats.poem_ids_unique,true);
});

test("DLM place/poem candidate relations preserve counts and review gates",()=>{
 const expectedCounts=new Map([
   ["matsushima",[11,11]],["shirakawa-seki",[13,12]],["sue-no-matsuyama",[24,21]],
   ["kisagata",[2,2]],["sumidagawa",[2,2]]
 ]);
 assert.equal(candidates.public_use,"research_only");
 assert.equal(candidates.review_status,"pending_human");
 let total=0;
 for(const c of candidates.candidates){
  const [official,extracted]=expectedCounts.get(c.place_key);
  assert.equal(c.official_spot_count,official);
  assert.equal(c.extracted_candidate_count,extracted);
  assert.equal(c.poems.length,extracted);
  assert.equal(c.unreconciled_difference,official-extracted);
  for(const poem of c.poems){
   assert.equal(poem.review_status,"pending_human");
   assert.equal(poem.relation_status,"unverified_exact_form_candidate");
   assert(c.accepted_form_candidates.includes(poem.place_form));
  }
  total+=c.poems.length;
 }
 assert.equal(total,48);
});

test("avoid substring collision Matsushima vs Tamatsushima",()=>{
 const matsushima=candidates.candidates.find(c=>c.place_key==="matsushima");
 assert.deepEqual(matsushima.accepted_form_candidates,["まつしま"]);
 assert(!matsushima.poems.some(p=>p.place_form.includes("たまつしま")));
 assert(!candidates.candidates.some(c=>c.poems.some(p=>p.relation_status==="verified")));
});

test("date-aware old province labels not imported from DLM into modern map as truth",()=>{
 assert(audit.warnings.some(x=>x.includes("名取川")));
 assert(proto.places.every(p=>p.old_province.basis_year===1689));
 assert(!proto.places.some(p=>p.old_province.name==="陸前国"));
});
