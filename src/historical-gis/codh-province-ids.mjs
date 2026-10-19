/** CODH P-series crosswalk for reviewed 1689 examples only.
 * Linking an identifier is NOT evidence that a coordinate falls within a border.
 * No Geoshape boundary data or geometry is bundled here.
 * Source: https://codh.rois.ac.jp/province/ (checked 2026-10-19).
 */
import { assertYear } from './core.mjs';

export const CODH_PROVINCE_ID_SOURCE = 'https://codh.rois.ac.jp/province/';

const VALIDATED_EXAMPLES_1689 = Object.freeze({
  '武蔵国': Object.freeze({ id:'P010', codh_name:'武蔵' }),
  '陸奥国': Object.freeze({ id:'P002', codh_name:'陸奥' })
});

/**
 * Conservative identifier-only lookup, not province geography resolution.
 *
 * Only the application's two documented old-province name claims in 1689
 * have been audited as ID correspondences.
 *
 * In 1868 CODH P002's partition into P111..P115 crosses a transition period;
 * the whole CE year cannot establish which identifier governed an event.
 * P115 means post-partition 陸奥; do not substitute it for 1689 P002.
 */
export function lookupCodhProvinceId({ name, year } = {}) {
  assertYear(year);
  const normalName = typeof name === 'string' ? name.trim().normalize('NFKC') : '';
  const normalized = normalName.endsWith('国') ? normalName : normalName + '国';
  if (year === 1868 && normalized === '陸奥国') {
    return { status:'transition_undetermined', province_id:null,
      reason:'1868_partition_requires_event_date_and_source', id_namespace:'CODH:province',
      source_url:CODH_PROVINCE_ID_SOURCE, geometry:null };
  }
  if (year !== 1689) {
    return { status:'not_audited_for_year', province_id:null,
      reason:'only_1689_identifiers_reviewed', id_namespace:'CODH:province',
      source_url:CODH_PROVINCE_ID_SOURCE, geometry:null };
  }
  const hit = VALIDATED_EXAMPLES_1689[normalized];
  if (!hit) {
    return { status:'no_verified_crosswalk', province_id:null,
      reason:'name_or_alias_not_in_audited_examples', id_namespace:'CODH:province',
      source_url:CODH_PROVINCE_ID_SOURCE, geometry:null };
  }
  return { status:'id_match_only', province_id:hit.id, codh_name:hit.codh_name,
    reason:'index_correspondence_only_not_geographic_membership',
    id_namespace:'CODH:province', source_url:CODH_PROVINCE_ID_SOURCE, geometry:null };
}
