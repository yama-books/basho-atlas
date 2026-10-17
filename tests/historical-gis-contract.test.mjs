import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(new URL("../data/historical-gis/yashima-basho.sample.geojson", import.meta.url), "utf8"));
const schema = JSON.parse(readFileSync(new URL("../data/historical-gis/historical-feature.schema.json", import.meta.url), "utf8"));
const P = id => fixture.features.find(f => f.id === id)?.properties;
const empty = time => time.start_year === null && time.end_year === null;

test("contract: GeoJSON and versioned schema exist", () => {
  assert.equal(fixture.type,"FeatureCollection");
  assert.match(fixture.schema_version,/^0\.1\./);
  assert.equal(schema.$schema,"https://json-schema.org/draft/2020-12/schema");
  assert.ok(fixture.features.length >= 4);
});

test("contract: no duplicate feature IDs or missing source references", () => {
  const ids = fixture.features.map(f => f.properties.feature_id);
  assert.equal(new Set(ids).size,ids.length);
  const sids = new Set(fixture.sources.map(s => s.source_id));
  for (const f of fixture.features) {
    assert.equal(f.id,f.properties.feature_id);
    assert.ok(f.properties.source_ids.length > 0);
    f.properties.source_ids.forEach(s => assert.ok(sids.has(s),s));
  }
});

test("contract: all four timelines are explicit and valid", () => {
  for (const f of fixture.features) {
    for (const field of ["valid_time","attested_time","source_created_time","geometry_observed_time"]) {
      const d = f.properties[field];
      assert.ok(d,field);
      if (d.start_year !== null && d.end_year !== null) assert.ok(d.start_year <= d.end_year,field);
    }
  }
});

test("contract: modern Yashima reference is not an 1185 battle coordinate", () => {
  const f = fixture.features.find(x => x.id === "hgis:genpei:ys001-modern");
  assert.equal(f.properties.layer,"modern_reference");
  assert.deepEqual(f.geometry.coordinates,[134.1012,34.3566]);
  assert.equal(f.properties.source_feature_refs[0].record_id,"YS001");
  assert.equal(P("hgis:genpei:yashima-1185").valid_time.start_year,1185);
  assert.equal(fixture.features.find(x => x.id === "hgis:genpei:yashima-1185").geometry,null);
});

test("contract: the medieval legend retains uncertain position", () => {
  const f = fixture.features.find(x => x.id === "hgis:genpei:ys003-tradition");
  assert.equal(f.geometry,null);
  assert.equal(f.properties.source_feature_refs[0].record_id,"YS003");
  assert.equal(f.properties.evidence_kind,"oral_tradition");
});

test("contract: 1689 province is a historical claim, not a border polygon", () => {
  const f = fixture.features.find(x => x.id === "hgis:basho:fukagawa-province-1689");
  assert.equal(f.geometry,null);
  assert.equal(f.properties.valid_time.start_year,1689);
  assert.equal(f.properties.feature_type,"province_membership");
  assert.equal(f.properties.administrative_type,"province");
  assert.equal(f.properties.province_name,"武蔵国");
});

test("contract: all sample contents are draft, without redistribution claims", () => {
  fixture.features.forEach(f => {
    assert.equal(f.properties.review_status,"pending_human");
    assert.equal(f.properties.public_use,"draft_only");
    assert.equal(f.properties.rights.license_status,"unverified");
    assert.equal(f.properties.rights.redistribution_allowed,null);
  });
});

test("contract: unverified ancient geometry must not be fabricated", () => {
  fixture.features.filter(f => f.properties.layer !== "modern_reference").forEach(f => assert.equal(f.geometry,null));
  fixture.features.filter(f => f.geometry?.type === "Point").forEach(f => {
    const [lng,lat] = f.geometry.coordinates;
    assert.ok(Math.abs(lng) <= 180 && Math.abs(lat) <= 90);
  });
});

test("contract: unknown attestation/source years do not assert eternal existence", () => {
  fixture.features.forEach(f => {
    assert.ok(empty(f.properties.attested_time));
    assert.ok(empty(f.properties.source_created_time));
    assert.ok(empty(f.properties.geometry_observed_time));
  });
});
