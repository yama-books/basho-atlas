import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), "utf8");
const data = JSON.parse(read("data/prototype-locations.json"));
const app = read("app.js");
const html = read("index.html");
const draft = JSON.parse(read("data/examples/takekuma-matsu.draft.json"));

test("prototype location IDs and coordinates are valid and nonduplicated", () => {
  assert.equal(data.places.length, 3);
  const ids = new Set();
  for (const p of data.places) {
    assert(!ids.has(p.id));
    ids.add(p.id);
    assert.equal(p.coordinates.length, 2);
    const [lng, lat] = p.coordinates;
    assert(Number.isFinite(lng) && Math.abs(lng) <= 180);
    assert(Number.isFinite(lat) && Math.abs(lat) <= 90);
    assert.notEqual(p.coordinate_accuracy, "");
    assert.equal(p.historical_route_confirmed, false);
    assert(p.coordinate_sources.length >= 1);
    assert(p.coordinate_attribution, "Coordinate attribution required: " + p.id);
  }
});

test("old province labels use the 1689 reference period", () => {
  const names = data.places.map(p => p.old_province.name);
  assert.deepEqual(names, ["武蔵国", "陸奥国", "陸奥国"]);
  for (const p of data.places) {
    assert.equal(p.old_province.basis_year, 1689);
    assert.match(p.old_province.source_url, /^https:\/\//);
  }
});

test("all modern map points link to sources rather than fabricated route lines", () => {
  for (const p of data.places) {
    assert.match(p.source_url, /^https:\/\//);
    assert(p.periods.before && p.periods.basho && p.periods.today);
    assert(p.learning_question);
    assert.equal(p.literature_review_status, "draft_not_for_verified_teaching");
  }
  assert(!/L\.polyline\(/.test(app));
  assert(!/L\.polygon\(/.test(app));
});

test("prototype UI contains all referenced elements and usable controls", () => {
  for (const [, id] of app.matchAll(/byId\("([\w-]+)"\)/g)) {
    assert(html.includes('id="' + id + '"'), "Missing HTML ID: " + id);
  }
  for (const id of ["tab-before", "tab-basho", "tab-today"]) {
    assert(html.includes('id="' + id + '"'));
  }
  assert(html.includes('data-province="陸奥国"'));
  assert(html.includes('role="tablist"'));
  assert(html.includes('id="map-fallback"'));
});

test("JavaScript passes syntax compilation and keeps untrusted POI strings as text", () => {
  assert.doesNotThrow(() => new vm.Script(app, { filename:"app.js" }));
  assert(app.includes("textContent"));
  assert(!app.includes("innerHTML"));
  assert(app.includes("controller.abort()"));
  assert(app.includes("OPENPOI_RADIUS_METERS"));
});

test("draft scholarly interpretation is not promoted into approved teaching data", () => {
  const recordSets = ["places", "modern_sites", "works", "travel_events", "literary_relations", "learning_prompts"];
  for (const set of recordSets) {
    for (const item of draft[set]) {
      assert.equal(item.review_status, "pending_human");
      assert.equal(item.public_use, "draft_only");
    }
  }
  for (const relation of draft.literary_relations) {
    if (relation.type === "explicit_allusion") {
      assert.equal(relation.evidence_status, "primary_checked");
    }
  }
});

test("draft references resolve within the example data", () => {
  const sources = new Set(draft.sources.map(s => s.id));
  const places = new Set(draft.places.map(p => p.id));
  const works = new Set(draft.works.map(w => w.id));
  const sites = new Set(draft.modern_sites.map(s => s.id));
  const recordSets = ["places", "modern_sites", "works", "travel_events", "literary_relations", "learning_prompts"];
  for (const set of recordSets) {
    for (const item of draft[set]) {
      for (const id of item.source_ids || []) assert(sources.has(id), "Missing source: " + id);
      for (const key of ["place_id", "historical_place_id", "to_place_id"]) {
        if (item[key]) assert(places.has(item[key]), "Missing place: " + item[key]);
      }
      for (const key of ["from_work_id", "to_work_id"]) {
        if (item[key]) assert(works.has(item[key]), "Missing work: " + item[key]);
      }
      for (const id of item.modern_site_ids || []) assert(sites.has(id), "Missing modern site: " + id);
    }
  }
});
