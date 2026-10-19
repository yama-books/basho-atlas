import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = path => fs.readFileSync(new URL(path,root),"utf8");
const data = JSON.parse(read("prototypes/shirakawa/shirakawa.draft.json"));
const html = read("prototypes/shirakawa/index.html");
const js = read("prototypes/shirakawa/app.js");
const prodJs = read("app.js");
const proto = JSON.parse(read("data/prototype-locations.json"));
const previous = JSON.parse(read("data/research/literary-text-collation.draft.json"));

test("draft-only and source relations are enforced throughout Shirakawa fixture",()=>{
 assert.equal(data.human_review,"pending_human");
 assert.equal(data.public_use,"draft_only");
 assert.equal(data.record_status,"research_preview_only");
 const sourceIds = new Set(data.sources.map(x=>x.id));
 assert.equal(sourceIds.size,data.sources.length);
 for(const item of [...data.before,data.basho,data.today]){
   assert.equal(item.human_review,"pending_human");
   assert.equal(item.public_use,"draft_only");
   for(const sourceId of item.source_ids) assert(sourceIds.has(sourceId),"Missing source "+sourceId);
 }
 assert(sourceIds.has(data.place.dlm_reference_point.source_id));
});

test("Shirakawa literary data ties the right authors and anthology numbers",()=>{
 assert.equal(data.before.length,2);
 const ein=data.before.find(x=>x.poet==="能因法師");
 const yori=data.before.find(x=>x.poet==="源頼政");
 assert.equal(ein.catalogue_number,518);
 assert.equal(yori.catalogue_number,365);
 assert.equal(ein.work,"後拾遺和歌集");
 assert.equal(yori.work,"千載和歌集");
 assert.equal(ein.dlm_id,"5bfc17e8a7372ae5b22442e3");
 assert.equal(yori.dlm_id,"5bfc17e8a7372ae5b22442e7");
 assert.equal(previous.works.find(x=>x.id==="w-noin-shirakawa").number,518);
 assert.equal(previous.works.find(x=>x.id==="w-yorimasa-shirakawa").number,365);
});

test("Sora's poem is not misattributed to Basho",()=>{
 assert.equal(data.basho.poet_included.name,"曾良");
 assert.equal(data.basho.poet_included.attribution_kind,"printed_attribution_in_travelogue");
 assert.match(data.basho.poet_included.verse,/卯の花/);
 assert.match(data.basho.passage,/秋風/);
 assert.match(data.basho.passage,/紅葉/);
 assert.match(data.basho.passage,/青葉/);
});

test("DLM literary point is not treated as historic route, exact shrine or designated site boundary",()=>{
 const p=data.place;
 assert.equal(p.internal_id,"place-shirakawa-seki");
 assert.equal(p.province_at_1689,"陸奥国");
 assert.match(p.province_status,/pending_kyukoku_engine/);
 assert.equal(p.modern_designated_site.site_position,null);
 assert.equal(p.modern_designated_site.point_status,"not_geocoded");
 assert.equal(p.modern_designated_site.designated_on,"1966-09-12");
 assert.equal(p.dlm_reference_point.kind,"literary_reference_point_not_archaeological_boundary");
 assert.deepEqual(p.dlm_reference_point.coordinates,[140.228417,37.047115]);
 assert.equal(proto.places.some(x=>x.id==="shirakawa"),false);
});

test("all source links are safe HTTPS and credit DLM correctly",()=>{
 for(const source of data.sources){
   assert.match(source.url,/^https:\/\//);
 }
 assert(data.source_attribution.includes("CC BY 4.0"));
 assert(data.sources.some(x=>x.id==="city-history"));
 assert(data.sources.some(x=>x.id==="dlm-spot"));
 assert(data.learning.answer_status==="question_only");
});

test("preview HTML/JS wiring and safe DOM rendering, no production fixture leak",()=>{
 assert.doesNotThrow(()=>new vm.Script(js,{filename:"prototypes/shirakawa/app.js"}));
 for(const [,elementId] of js.matchAll(/id\("([a-z\-]+)"\)/g)){
   assert(html.includes('id="'+elementId+'"'),"Missing element "+elementId);
 }
 for(const word of ["秋風","紅葉","青葉"])assert(html.includes('data-word="'+word+'"'));
 for(const view of ["compare","before","basho","today"])assert(html.includes('data-view="'+view+'"'));
 assert(html.includes('name="robots" content="noindex,nofollow"'));
 assert(!js.includes("innerHTML"),"unsafe HTML insertion");
 assert(js.includes("createTextNode"),"annotated text must use real nodes");
 assert(!prodJs.includes("prototypes/shirakawa"),"production app should not import the draft preview");
 assert(!prodJs.includes("shirakawa.draft.json"),"production app should not import the fixture");
});
