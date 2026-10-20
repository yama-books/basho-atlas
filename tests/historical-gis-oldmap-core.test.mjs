import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeAtlasReferencePoints} from '../src/historical-gis/atlas-reference-points.mjs';
import {createProvinceAtlasService} from '../src/historical-gis/atlas-service.mjs';

const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const basho = read('data/prototype-locations.json');
const yashima = read('data/historical-gis/yashima-basho.sample.geojson');
const one = coordinates => ({places:[{...structuredClone(basho.places[0]), coordinates}]});
const modern = () => structuredClone(yashima.features[0]);
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('four modern references retain coordinates, precision, sources and candidate-only IDs', () => {
  const before = JSON.stringify({basho, yashima});
  const {points, decisions} = normalizeAtlasReferencePoints({basho:freeze(basho), yashima:freeze(yashima)});
  assert.equal(points.length, 4);
  assert.equal(decisions.filter(d => d.accepted).length, 4);
  assert.equal(decisions.length, basho.places.length + yashima.features.length);
  assert.deepEqual(points.map(p => p.provinceId), ['P010', 'P002', 'P002', null]);
  for (const [index, p] of points.entries()) {
    assert.equal(p.layer, 'modern_reference');
    assert.equal(p.historicalMembership, 'unverified');
    assert.deepEqual(p.geometry.coordinates, [p.lng, p.lat]);
    assert(p.sources.length > 0);
    if (index < 3) {
      assert.equal(p.precision, basho.places[index].coordinate_accuracy);
      assert.equal(p.attribution, basho.places[index].coordinate_attribution);
      assert.equal(p.provinceCandidate.status, 'id_match_only');
      assert.equal(p.provinceCandidate.membership_status, 'candidate');
      assert.equal(p.provinceCandidate.geometry, null);
    }
  }
  assert.equal(points[3].publicUse, 'draft_only');
  assert.equal(points[3].reviewStatus, 'pending_human');
  assert.equal(points[3].rights.redistribution_allowed, null);
  points[3].geometry.coordinates[0] = 0;
  points[3].rights.license_status = 'changed';
  assert.equal(JSON.stringify({basho, yashima}), before);
});

test('unknown positions and non-modern layers never become map points', () => {
  const features = Array.from({length:7}, (_, i) => ({...modern(), id:'unknown:' + i, geometry:null}));
  const polygon = {...modern(), id:'polygon', geometry:{type:'Polygon', coordinates:[]}};
  const historical = {...modern(), id:'historical', properties:{...modern().properties, layer:'reconstructed_geography'}};
  const {points, decisions} = normalizeAtlasReferencePoints({yashima:{type:'FeatureCollection', features:[...features, polygon, historical]}});
  assert.deepEqual(points, []);
  assert.equal(decisions.filter(d => d.reason === 'position_unknown').length, 7);
  assert(decisions.some(d => d.reason === 'not_point'));
  assert(decisions.some(d => d.reason === 'not_modern_reference'));
});

test('invalid coordinates are rejected independently in both input formats', () => {
  for (const coords of [null, undefined, [], [139], [139,35,1], ['139',35], [139,'35'],
    [NaN,35], [139,Infinity], [181,35], [139,-91], {0:139,1:35}]) {
    const feature = modern(); feature.geometry.coordinates = coords;
    const result = normalizeAtlasReferencePoints({basho:one(coords),
      yashima:{type:'FeatureCollection', features:[feature]}});
    assert.equal(result.points.length, 0);
    assert(result.decisions.every(d => !d.accepted));
  }
  assert.equal(normalizeAtlasReferencePoints({basho:one([0,0])}).points.length, 1,
    'an explicit valid coordinate is distinct from an invented fallback');
});

test('unsafe source URLs are omitted and named as per-row warnings; names remain text', () => {
  const input = one([139,35]);
  input.places[0].name = '<img src=x onerror=alert(1)>';
  input.places[0].source_url = 'javascript:alert(1)';
  input.places[0].coordinate_sources = ['data:text/html,evil', 'http://example.org',
    'https://user:password@example.org', 'https://example.org/\npath', {}, 'bad url'];
  input.places[0].old_province.source_url = 'javascript:alert(1)';
  const {points, decisions} = normalizeAtlasReferencePoints({basho:input});
  assert.equal(points[0].name, input.places[0].name);
  assert.equal(points[0].source, null);
  assert.deepEqual(points[0].sources, []);
  assert.equal(points[0].provinceCandidate.claim_source, null);
  assert(decisions[0].warnings.includes('unsafe_or_invalid_source_url'));
  assert(decisions[0].warnings.includes('source_unavailable'));
  const f = modern(); f.properties.modern_site_coordinate_source = 'javascript:alert(1)';
  const output = normalizeAtlasReferencePoints({yashima:{type:'FeatureCollection',
    features:[f], sources:[{source_id:f.properties.source_ids[0], url:'data:text/plain,evil'}]}});
  assert.equal(output.points[0].source, null);
  assert(output.decisions[1].warnings.includes('missing_source_reference'));
});

test('bad province claims cannot crash or borrow 1689; 1868 remains undetermined', () => {
  for (const basis_year of [null, '', '1689', NaN, 0, 10000]) {
    const input = one([139,35]); input.places[0].old_province.basis_year = basis_year;
    const result = normalizeAtlasReferencePoints({basho:input});
    assert.equal(result.points[0].provinceId, null);
    assert(result.decisions[0].warnings.includes('invalid_province_claim'));
  }
  const input = one([139,35]);
  input.places[0].old_province = {name:'陸奥', basis_year:1868};
  const p = normalizeAtlasReferencePoints({basho:input}).points[0];
  assert.equal(p.provinceId, null);
  assert.equal(p.provinceCandidate.status, 'transition_undetermined');
});

test('malformed rows and a missing dataset leave valid sibling references available', () => {
  const input = {places:[null, {}, basho.places[0], basho.places[0]]};
  const result = normalizeAtlasReferencePoints({basho:input, yashima:{features:[]}});
  assert.equal(result.points.length, 1);
  assert.equal(result.decisions[3].reason, 'duplicate_id');
  assert.equal(result.decisions.at(-1).reason, 'dataset_unavailable_or_invalid');
  assert.equal(normalizeAtlasReferencePoints({yashima}).points.length, 1);
  assert.equal(normalizeAtlasReferencePoints().points.length, 0);
});

test('existing facade leaves 1185 Sanuki without geometry or established membership', () => {
  const service = createProvinceAtlasService(read('data/historical-gis/codh-province-index.json'));
  const {yearResult} = service.getProvince({id:'P044', year:1185});
  assert.equal(yearResult.status, 'historical_validity_unreviewed');
  assert.equal(yearResult.geometry, null);
  assert.equal(yearResult.province_id, null);
});
