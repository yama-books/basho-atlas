/** Lossless external-ID bridging into draft Historical GIS records; no source writes. */
const unknownTime = () => ({ start_year:null, end_year:null, precision:'unknown' });
const timeAt = year => ({ start_year:year, end_year:year, precision:'year_approximate' });
const rights = () => ({ license_status:'unverified', license_expression:null,
  attribution:'Refer to the linked source; no redistribution permission is inferred.', redistribution_allowed:null });

function point(lng, lat) {
  if (lng == null || lat == null) return null;
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng)>180 || Math.abs(lat)>90) return null;
  return { type:'Point', coordinates:[lng,lat] };
}
function makeSource(url, title, sourceId) {
  return {source_id:sourceId,title,url,source_kind:'project_or_source_reference',license_status:'unverified',license_expression:null,accessed_on:null};
}
function feature({ id, name, reading=null, geometry=null, layer='modern_reference', kind='site', year=null,
  position='unknown', evidence='modern_registry', sourceIds=[], refs=[], warning, metadata={} }) {
  return { type:'Feature', id, geometry, properties:{
    feature_id:id,layer,feature_type:kind,name,reading,aliases:[],
    valid_time:year === null?unknownTime():timeAt(year),
    attested_time:unknownTime(),source_created_time:unknownTime(),geometry_observed_time:unknownTime(),
    position_quality:position,evidence_kind:evidence,source_ids:sourceIds,
    source_feature_refs:refs,review_status:'pending_human',public_use:'draft_only',proposed_by:'import',
    rights:rights(),historical_warning:warning,claim_id:id+':claim',origin_metadata:metadata
  }};
}
function collection(features,sources,sourceName) {
  return { type:'FeatureCollection',schema_version:'0.1.0',dataset_status:'draft_not_for_verified_teaching',
    generated_from:sourceName,sources,features };
}
function sourceRecorder() {
  const sourceByUrl = new Map();
  return {
    ref(url) {
      if (typeof url !== 'string' || !/^https:\/\//.test(url)) return null;
      if (!sourceByUrl.has(url)) {
        const sourceId = 'src:'+(sourceByUrl.size+1);
        sourceByUrl.set(url,makeSource(url,url,sourceId));
      }
      return sourceByUrl.get(url).source_id;
    },
    all() { return [...sourceByUrl.values()]; }
  };
}
/** Adapt only contemporary heritage location references; never mint a medieval event coordinate. */
export function adaptGenpeiYashimaRegistry(registry) {
  if (!Array.isArray(registry?.sites)) throw new TypeError('Yashima sites required');
  const s = sourceRecorder(), features=[], used = new Set();
  for (const site of registry.sites) {
    if (typeof site.site_id !== 'string' || !site.site_id || used.has(site.site_id)) throw new Error('invalid/duplicate site_id');
    used.add(site.site_id);
    const coords = point(site.location?.lng,site.location?.lat);
    const refs = (site.source_urls || []).map(url => s.ref(url)).filter(Boolean);
    if (site.location?.coordinate_source) { const src=s.ref(site.location.coordinate_source); if(src&&!refs.includes(src)) refs.push(src); }
    const id = 'hgis:genpei:'+site.site_id.toLowerCase()+':modern';
    features.push(feature({id,name:site.name,geometry:coords,position:coords?'representative_approximate':'locality_only',
      sourceIds:refs,refs:[{repository:'yama-books/genpei-sandbox',record_id:site.site_id,relation:'modern_heritage_reference'}],
      warning:'A present-day monument or regional point is not the proven location of a medieval event.',
      metadata:{current_site_kind:site.current_site_kind ?? null, historical_truth_in_source:site.historical_truth ?? null,
        event_link_in_source:site.event_link ?? null, person_ids_in_source:site.person_ids ?? [], original_location_precision:site.location?.precision ?? null}}));
  }
  return collection(features,s.all(),'yama-books/genpei-sandbox:data/places/YASHIMA_SITE_REGISTRY.json');
}
/** Adapt legacy Basho reference points and old-province label claims separately. */
export function adaptBashoPrototype(registry) {
  if (!Array.isArray(registry?.places)) throw new TypeError('Basho places required');
  const s=sourceRecorder(),features=[],used=new Set();
  for (const place of registry.places) {
    if (typeof place.id !== 'string' || !place.id || used.has(place.id)) throw new Error('invalid/duplicate place id');
    used.add(place.id);
    const modernId='hgis:basho:'+place.id+':modern';
    const geometry=Array.isArray(place.coordinates)?point(place.coordinates[0],place.coordinates[1]):null;
    const sourceIds=(place.coordinate_sources || []).map(url => s.ref(url)).filter(Boolean);
    const placeSource=s.ref(place.source_url); if (placeSource&&!sourceIds.includes(placeSource)) sourceIds.push(placeSource);
    features.push(feature({id:modernId,name:place.name,geometry,
      position:geometry?'representative_approximate':'unknown',sourceIds,
      refs:[{repository:'yama-books/basho-atlas',record_id:place.id,relation:'modern_reference_only'}],
      warning:'Modern facility reference point is not the exact historical travel location.',
      metadata:{original_coordinate_accuracy:place.coordinate_accuracy??null}}));
    const province=place.old_province;
    if (province?.name && Number.isInteger(province.basis_year)) {
      const provinceSource=s.ref(province.source_url);
      const claimId='hgis:basho:'+place.id+':province:'+province.basis_year;
      const claim=feature({id:claimId,name:place.name,geometry:null,layer:'historical_toponym',kind:'province_membership',
        year:province.basis_year,position:'unknown',evidence:'municipal_description',sourceIds:provinceSource?[provinceSource]:[],
        refs:[{repository:'yama-books/basho-atlas',record_id:place.id,relation:'historic_province_label_claim'}],
        warning:'This is an unreviewed province-label assertion, not a boundary-based classification.'});
      claim.properties.administrative_type='province';
      claim.properties.province_name=province.name;
      claim.properties.province_reading=province.reading??null;
      features.push(claim);
    }
  }
  return collection(features,s.all(),'yama-books/basho-atlas:data/prototype-locations.json');
}
