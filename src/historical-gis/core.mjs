/** Framework-independent, conservative historical-geography queries. No side effects. */
const YEAR_MIN = 1;

export function assertYear(year) {
  if (!Number.isInteger(year) || year < YEAR_MIN || year > 9999) {
    throw new RangeError('year must be an integer CE year between 1 and 9999');
  }
  return year;
}

/** Unknown bounds are not treated as infinite evidence of existence. */
export function temporalFit(interval, year) {
  assertYear(year);
  if (!interval || typeof interval !== 'object') return 'unknown';
  const { start_year: start, end_year: end } = interval;
  if (start !== null && start !== undefined && (!Number.isInteger(start) || start < 1)) return 'invalid';
  if (end !== null && end !== undefined && (!Number.isInteger(end) || end < 1)) return 'invalid';
  if (start != null && end != null && start > end) return 'invalid';
  if ((start != null && year < start) || (end != null && year > end)) return 'outside';
  if (start == null || end == null) return 'unknown';
  if (Array.isArray(interval.uncertain_transition_years) && interval.uncertain_transition_years.includes(year)) return 'unknown';
  return 'within';
}

export function isPubliclyEligible(feature) {
  const p = feature?.properties;
  return p?.review_status === 'human_approved' &&
    p?.public_use === 'approved_for_app' &&
    p?.rights?.license_status === 'cleared' &&
    p?.rights?.redistribution_allowed === true;
}

const layers = new Set(['historical_map_image','reconstructed_geography','historical_toponym','historical_activity','modern_reference','transport']);
function assertCatalog(catalog) {
  if (catalog?.type !== 'FeatureCollection' || !Array.isArray(catalog.features)) {
    throw new TypeError('expected a GeoJSON FeatureCollection');
  }
}
function assertMode(mode) {
  if (mode !== 'public' && mode !== 'research') throw new TypeError('mode must be public or research');
}
function matchBbox(geometry, bbox) {
  if (!bbox) return 'unrestricted';
  if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isFinite) || bbox[0] > bbox[2] || bbox[1] > bbox[3] ||
    bbox[0] < -180 || bbox[2] > 180 || bbox[1] < -90 || bbox[3] > 90) throw new RangeError('bbox must be [west,south,east,north]');
  if (!geometry || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) return 'unknown';
  const [lng, lat] = geometry.coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return 'unknown';
  return lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3] ? 'within' : 'outside';
}

/** Returns annotated candidates, never treats research drafts as approved evidence. */
export function queryFeatures(catalog, { year, layer = null, mode = 'public', bbox = null,
  includeTimeUnknown = false, includeSpatiallyUnknown = false } = {}) {
  assertCatalog(catalog);
  assertYear(year);
  assertMode(mode);
  if (layer !== null && !layers.has(layer)) throw new RangeError('unknown layer');
  const result = [];
  for (const feature of catalog.features) {
    if (layer && feature.properties?.layer !== layer) continue;
    if (mode === 'public' && !isPubliclyEligible(feature)) continue;
    const temporal = temporalFit(feature.properties?.valid_time, year);
    if (temporal === 'invalid' || temporal === 'outside' || (temporal === 'unknown' && !includeTimeUnknown)) continue;
    const spatial = matchBbox(feature.geometry, bbox);
    if (spatial === 'outside' || (spatial === 'unknown' && !includeSpatiallyUnknown)) continue;
    result.push({ feature, temporal, spatial, approved: isPubliclyEligible(feature) });
  }
  return result;
}

function normal(text) { return typeof text === 'string' ? text.trim().normalize('NFKC').toLocaleLowerCase('ja') : ''; }
/** Exact historical name/reading/alias lookup, not a modern geocoder. */
export function searchNames(catalog, { text, year, mode = 'public', includeTimeUnknown = false } = {}) {
  const q = normal(text);
  if (!q) return [];
  return queryFeatures(catalog, { year, mode, includeTimeUnknown })
    .filter(({ feature }) => [feature.properties.name,feature.properties.reading,...(feature.properties.aliases || [])].some(s => normal(s) === q));
}

/** Only explicit old-province membership claims may participate; never polygon inferred. */
export function resolveProvince(catalog, { sourceRecordId, year, mode = 'public' } = {}) {
  if (typeof sourceRecordId !== 'string' || !sourceRecordId.trim()) throw new TypeError('sourceRecordId required');
  const candidates = queryFeatures(catalog, { year, mode, layer: 'historical_toponym' })
    .filter(({ feature }) => feature.properties.feature_type === 'province_membership' &&
      feature.properties.administrative_type === 'province' &&
      feature.properties.source_feature_refs?.some(r => r.record_id === sourceRecordId));
  if (!candidates.length) return { status:'unknown', candidates:[], reason:'no_matching_approved_claim_or_no_evidence' };
  const unique = new Set(candidates.map(c => c.feature.properties.province_name));
  if (unique.size > 1 || candidates.length > 1) return { status:'ambiguous', candidates, reason:'multiple_membership_claims' };
  if (!candidates[0].approved) return { status:'candidate', candidates, reason:'human_review_or_rights_pending' };
  return { status:'resolved', candidates, reason:null };
}

/** No vintage map / present-day coordinate is silently transformed into an historical shape. */
export function selectGeometry(feature, year, { mode = 'public', allowLaterMapAsComparison = false } = {}) {
  assertYear(year); assertMode(mode);
  if (mode === 'public' && !isPubliclyEligible(feature)) return { status:'withheld', geometry:null, reason:'review_or_redistribution_pending' };
  const p = feature?.properties;
  const t = temporalFit(p?.valid_time, year);
  if (t !== 'within') return { status:'unresolved', geometry:null, reason:'target_year_not_supported', temporal:t };
  if (feature.geometry === null || feature.geometry === undefined) return { status:'unlocated', geometry:null, reason:'geometry_not_established' };
  if (p?.layer === 'modern_reference') return { status:'modern_reference', geometry:feature.geometry, reason:'not_historical_location' };
  if (p?.layer === 'historical_map_image') {
    // Raster historical maps require dedicated image metadata; never pretend GeoJSON geometry is georeferencing.
    return { status:'image_requires_georeferencing', geometry:null, reason:'image_metadata_separate' };
  }
  const creation = p?.source_created_time;
  if (creation?.start_year != null && creation.start_year > year && !allowLaterMapAsComparison) {
    return { status:'withheld', geometry:null, reason:'source_postdates_target' };
  }
  if (creation?.start_year != null && creation.start_year > year) {
    return { status:'later_source_comparison_only', geometry:feature.geometry, reason:'source_postdates_target' };
  }
  return { status:'candidate_geometry', geometry:feature.geometry, reason: p?.historical_warning || null };
}

/** Graph topology, not game speed, cost or pathfinding. Unapproved edges never become traversable. */
export function getTransportGraph(catalog, { year, mode = 'public', allowInferred = false } = {}) {
  const entries = queryFeatures(catalog,{year,mode,layer:'transport'});
  const nodes = entries.filter(e => e.feature.properties.feature_type === 'network_node');
  const nodeIds = new Set(nodes.map(e => e.feature.properties.network?.node_id).filter(Boolean));
  const edges = [], unresolvedEdges = [];
  for (const entry of entries.filter(e => e.feature.properties.feature_type === 'route')) {
    const p = entry.feature.properties, n = p.network || {};
    let reason = null;
    if (!n.from || !n.to || !nodeIds.has(n.from) || !nodeIds.has(n.to)) reason = 'unverified_connection';
    else if (!entry.approved) reason = 'not_reviewed';
    else if (n.passability === 'attested') reason = null;
    else if (allowInferred && n.passability === 'inferred') reason = null;
    else reason = 'passability_not_established';
    if (reason) unresolvedEdges.push({ ...entry, reason });
    else edges.push({ ...entry, scenario_only:n.passability !== 'attested' });
  }
  return { nodes, edges, unresolvedEdges };
}
