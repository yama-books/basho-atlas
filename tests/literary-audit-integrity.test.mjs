import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const get = p => JSON.parse(fs.readFileSync(new URL(p, root), "utf8"));
const audit = get("data/research/literary-text-collation.draft.json");
const takekuma = get("data/examples/takekuma-matsu.draft.json");
const byWork = new Map(audit.works.map(w => [w.id,w]));
const srcs = new Set(audit.sources.map(s => s.id));
const places = new Set(audit.literature_sites.map(p => p.id));

test("three Takekuma waka catalogue numbers remain tied to correct authors and anthologies", () => {
  const cases = [
    ["藤原元善", "後撰和歌集", 1241],
    ["橘季通", "後拾遺和歌集", 1041],
    ["能因法師", "後拾遺和歌集", 1042],
  ];
  for(const [author, anthology, number] of cases){
    assert(audit.works.some(w => w.author.startsWith(author) && w.anthology === anthology && w.number === number));
  }
  const takekumaNumber = new Map(takekuma.works.map(w => [w.id,w.poem_number]));
  assert.equal(takekumaNumber.get("work-fujiwara-motoyoshi-takekuma"), 1241);
  assert.equal(takekumaNumber.get("work-tachibana-suemichi-takekuma"), 1041);
  assert.equal(takekumaNumber.get("work-noin-takekuma"), 1042);
});

test("author printed in Oku no Hosomichi is distinguished from possible scholarly attribution", () => {
  const matsushima = byWork.get("w-sora-matsushima");
  const shirakawa = byWork.get("w-sora-shirakawa");
  assert.match(matsushima.author, /^曾良/);
  assert.match(shirakawa.author, /^曾良/);
  assert.equal(byWork.get("w-basho-matsushima-external").transcription_status, "not_collated");
  assert(audit.claims.some(c => c.id === "c-matsushima-sora-byline" &&
    c.interpretation_level === "textual_observation_not_definitive_historical_authorship"));
});

test("source evidence does not pretend to be a human-approved critical edition", () => {
  assert.equal(audit.literature_sites.length,3);
  assert.equal(audit.review_status, undefined);
  for (const kind of ["literature_sites","works","claims"]) {
    for(const item of audit[kind]){
      assert.equal(item.review_status, "pending_human");
      assert.equal(item.public_use, "draft_only");
      for(const id of item.source_ids || [])assert(srcs.has(id), "missing source " + id);
      if(item.place_id)assert(places.has(item.place_id));
      if(item.subject_id)assert(places.has(item.subject_id));
      for(const id of item.related_work_ids || [])assert(byWork.has(id), "missing work " + id);
    }
  }
});

test("DLM XLSX and evidence gates remain explicitly unverified", () => {
  assert.equal(audit.dataset_download.official_advertised_sheets,8);
  assert.equal(audit.dataset_download.actual_file_retrieved,false);
  assert.equal(audit.dataset_download.actual_sheet_structure_verified,false);
  assert(audit.works.some(w => w.place_id === "place-matsushima" &&
    w.anthology === "おくのほそ道（松島段）" &&
    w.author.startsWith("曾良")));
  assert(audit.works.every(w => w.transcription_status !== "human_collated"));
});
