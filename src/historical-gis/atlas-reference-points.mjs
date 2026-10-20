/** Pure draft-preview normalization. Strings are text, never trusted HTML.
 * No historical position, publication permission, or province membership is inferred.
 */
import {lookupCodhProvinceId} from './codh-province-ids.mjs';

const text = value => typeof value === 'string' ? value : null;
const list = value => Array.isArray(value) ? value : [];
const point = coordinates => Array.isArray(coordinates) && coordinates.length === 2 &&
  Number.isFinite(coordinates[0]) && Number.isFinite(coordinates[1]) &&
  Math.abs(coordinates[0]) <= 180 && Math.abs(coordinates[1]) <= 90;

/** HTTPS references only; credentials and control characters are not link material. */
function sourceUrl(raw) {
  if (typeof raw !== 'string' || /[\u0000-\u0020\u007f]/u.test(raw)) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/**
 * Inputs are parsed JSON objects, independently optional (one failure need not hide
 * the other dataset). Returns {points, decisions}; each input row has a decision.
 * points are modern preview references, NOT approved Historical GIS Features.
 */
export function normalizeAtlasReferencePoints({basho, yashima} = {}) {
  const points = [], decisions = [], used = new Set();
  function sources(raw, warnings) {
    return [...new Set(raw.filter(value => value != null).map(value => {
      const url = sourceUrl(value);
      if (!url) warnings.push('unsafe_or_invalid_source_url');
      return url;
    }).filter(Boolean))];
  }
  function accept({dataset, index, id, name, coordinates, precision, urls,
    provinceCandidate = null, warning, attribution = null, reviewStatus = null,
    publicUse = null, rights = null}, warnings) {
    const decision = {dataset, index, id, accepted:false, reason:null, warnings};
    decisions.push(decision);
    if (!id || !name?.trim()) { decision.reason = 'missing_id_or_name'; return; }
    if (used.has(id)) { decision.reason = 'duplicate_id'; return; }
    if (!point(coordinates)) {
      decision.reason = coordinates == null ? 'position_unknown' : 'invalid_coordinates';
      return;
    }
    const sourceUrls = sources(urls, warnings);
    if (!sourceUrls.length) warnings.push('source_unavailable');
    used.add(id);
    points.push({id, name, lng:coordinates[0], lat:coordinates[1],
      geometry:{type:'Point', coordinates:[...coordinates]}, layer:'modern_reference',
      precision, source:sourceUrls[0] ?? null, sources:sourceUrls,
      provinceId:provinceCandidate?.province_id ?? null, provinceCandidate,
      historicalMembership:'unverified', historicalWarning:warning,
      attribution, reviewStatus, publicUse, rights:structuredClone(rights)});
    decision.accepted = true;
    decision.reason = 'modern_reference_only';
  }

  if (!Array.isArray(basho?.places)) {
    decisions.push({dataset:'basho', index:null, id:null, accepted:false,
      reason:'dataset_unavailable_or_invalid', warnings:[]});
  } else basho.places.forEach((place, index) => {
    const warnings = [], old = place?.old_province;
    let provinceCandidate = null;
    if (old) {
      if (typeof old.name === 'string' && Number.isInteger(old.basis_year) &&
          old.basis_year >= 1 && old.basis_year <= 9999) {
        const crosswalk = lookupCodhProvinceId({name:old.name, year:old.basis_year});
        provinceCandidate = {...crosswalk,
          name:old.name, year:old.basis_year, membership_status:'candidate',
          claim_source:sources([old.source_url], warnings)[0] ?? null};
      } else warnings.push('invalid_province_claim');
    }
    accept({dataset:'basho', index,
      id:text(place?.id) ? 'basho:' + place.id : null, name:text(place?.name),
      coordinates:place?.coordinates, precision:text(place?.coordinate_accuracy),
      urls:[place?.source_url, ...list(place?.coordinate_sources)], provinceCandidate,
      warning:'Modern facility reference only; historical travel position and province membership unverified.',
      attribution:text(place?.coordinate_attribution),
      reviewStatus:text(place?.literature_review_status)}, warnings);
  });

  if (yashima?.type !== 'FeatureCollection' || !Array.isArray(yashima.features)) {
    decisions.push({dataset:'yashima', index:null, id:null, accepted:false,
      reason:'dataset_unavailable_or_invalid', warnings:[]});
  } else yashima.features.forEach((feature, index) => {
    const p = feature?.properties, id = text(feature?.id), warnings = [];
    const reason = feature?.type !== 'Feature' ? 'invalid_feature' :
      p?.layer !== 'modern_reference' ? 'not_modern_reference' :
      feature.geometry == null ? 'position_unknown' :
      feature.geometry.type !== 'Point' ? 'not_point' : null;
    if (reason) {
      decisions.push({dataset:'yashima', index, id, accepted:false, reason, warnings});
      return;
    }
    const sourceRows = list(p.source_ids).flatMap(sourceId => {
      const rows = list(yashima.sources).filter(s => s?.source_id === sourceId);
      if (!rows.length) warnings.push('missing_source_reference');
      return rows.map(s => s.url);
    });
    accept({dataset:'yashima', index, id, name:text(p.name),
      coordinates:feature.geometry.coordinates, precision:text(p.position_quality),
      urls:[p.modern_site_coordinate_source, ...sourceRows],
      warning:'Modern regional reference only; not the location of an 1185 event.',
      attribution:text(p.rights?.attribution), reviewStatus:text(p.review_status),
      publicUse:text(p.public_use), rights:p.rights ?? null}, warnings);
  });
  return {points, decisions};
}
