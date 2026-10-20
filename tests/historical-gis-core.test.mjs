import test from 'node:test';
import assert from 'node:assert/strict';
import {assertYear, temporalFit, isPubliclyEligible, queryFeatures, searchNames, resolveProvince, selectGeometry, getTransportGraph} from '../src/historical-gis/core.mjs';
import {adaptBashoPrototype, adaptGenpeiYashimaRegistry} from '../src/historical-gis/adapters.mjs';

const time=(a=null,b=null)=>({start_year:a,end_year:b,precision:'year_approximate'});
const base=(id,layer='historical_toponym',type='name',year=1185)=>({type:'Feature',id,geometry:null,properties:{
  feature_id:id,layer,feature_type:type,name:'屋島',reading:'やしま',aliases:['八島'],
  valid_time:time(year,year),attested_time:time(),source_created_time:time(),geometry_observed_time:time(),
  review_status:'pending_human',public_use:'draft_only',rights:{license_status:'unverified',redistribution_allowed:null},
  source_feature_refs:[{repository:'genpei',record_id:'YS001',relation:'ref'}]
}});
const approved=f=>{const x=structuredClone(f);x.properties.review_status='human_approved';x.properties.public_use='approved_for_app';x.properties.rights={license_status:'cleared',redistribution_allowed:true};return x;};
const coll=(...features)=>({type:'FeatureCollection',features});

for(const [name,year] of [['number string','1185'],['fraction',1689.5],['negative',-1],['zero',0],['NaN',NaN]])
  test('year rejects '+name,()=>assert.throws(()=>assertYear(year),RangeError));
test('year accepts 1185/1689/1868',()=>[1185,1689,1868].forEach(y=>assert.equal(assertYear(y),y)));
test('fully unknown dates are not eternal',()=>assert.equal(temporalFit(time(),1185),'unknown'));
test('one-sided bounds yield unknown or definite outside',()=>{
  assert.equal(temporalFit(time(1180,null),1185),'unknown');
  assert.equal(temporalFit(time(1180,null),1170),'outside');
  assert.equal(temporalFit(time(null,1190),1191),'outside');
  assert.equal(temporalFit(time(null,1190),1185),'unknown');
});
test('complete bounded range gets inclusion and exclusion',()=>{
  assert.equal(temporalFit(time(1180,1190),1185),'within');
  assert.equal(temporalFit(time(1180,1190),1689),'outside');
  assert.equal(temporalFit(time(1190,1180),1185),'invalid');
});
test('boundary year uncertainty is never silently resolved',()=>{
  const t={...time(1860,1870),uncertain_transition_years:[1868]};
  assert.equal(temporalFit(t,1868),'unknown');
  assert.equal(temporalFit(t,1867),'within');
});
test('draft is rejected by default public queries',()=>{
  assert.equal(queryFeatures(coll(base('a')),{year:1185}).length,0);
  assert.equal(queryFeatures(coll(base('a')),{year:1185,mode:'research'}).length,1);
  assert.equal(isPubliclyEligible(base('a')),false);
});
test('even an approved feature requires explicit redistribution clearance',()=>{
  const f=approved(base('a'));f.properties.rights.redistribution_allowed=null;
  assert.equal(isPubliclyEligible(f),false);
  assert.equal(queryFeatures(coll(f),{year:1185}).length,0);
});
test('unknown timeframe does not match unless explicitly requested',()=>{
  const f=base('a');f.properties.valid_time=time();
  assert.equal(queryFeatures(coll(f),{year:1185,mode:'research'}).length,0);
  assert.equal(queryFeatures(coll(f),{year:1185,mode:'research',includeTimeUnknown:true})[0].temporal,'unknown');
});
test('names match Japanese variants without conferring historical approval',()=>{
  const f=base('a');
  assert.equal(searchNames(coll(f),{text:'八島',year:1185}).length,0);
  assert.equal(searchNames(coll(f),{text:' やしま ',year:1185,mode:'research'}).length,1);
  assert.equal(searchNames(coll(f),{text:'大坂',year:1185,mode:'research'}).length,0);
});
test('bbox must not auto-place null geometry',()=>{
  const f=base('a');
  assert.equal(queryFeatures(coll(f),{year:1185,bbox:[133,34,135,35],mode:'research'}).length,0);
  const matches=queryFeatures(coll(f),{year:1185,bbox:[133,34,135,35],mode:'research',includeSpatiallyUnknown:true});
  assert.equal(matches.length,1); assert.equal(matches[0].spatial,'unknown');
  assert.throws(()=>queryFeatures(coll(f),{year:1185,bbox:[120,40,115,45],mode:'research'}),RangeError);
});
test('modern representative point stays a comparison reference',()=>{
  const f=approved(base('a','modern_reference','site')); f.geometry={type:'Point',coordinates:[134.1012,34.3566]};
  assert.equal(selectGeometry(f,1185).status,'modern_reference');
});
test('no invented coastline/route from absent historical geometry',()=>{
  const f=approved(base('a','reconstructed_geography','coastline'));
  assert.equal(selectGeometry(f,1185).status,'unlocated');
});
test('later document never silently becomes 1185 historical polygon',()=>{
  const f=approved(base('a','reconstructed_geography','coastline'));
  f.geometry={type:'LineString',coordinates:[[134.1,34.3],[134.2,34.3]]};
  f.properties.source_created_time=time(1880,1880);
  assert.equal(selectGeometry(f,1185).status,'withheld');
  assert.equal(selectGeometry(f,1185,{allowLaterMapAsComparison:true}).status,'later_source_comparison_only');
});
test('historical map image requires separate georeferencing even when geometry exists',()=>{
  const f=approved(base('a','historical_map_image','map_image'));
  f.geometry={type:'Point',coordinates:[134,34]};
  assert.equal(selectGeometry(f,1185).status,'image_requires_georeferencing');
});
test('draft Old Province claim is candidate only, never resolved',()=>{
  const f=base('claim','historical_toponym','province_membership');
  f.properties.administrative_type='province'; f.properties.province_name='讃岐国';
  assert.equal(resolveProvince(coll(f),{sourceRecordId:'YS001',year:1185}).status,'unknown');
  assert.equal(resolveProvince(coll(f),{sourceRecordId:'YS001',year:1185,mode:'research'}).status,'candidate');
  assert.equal(resolveProvince(coll(f),{sourceRecordId:'YS001',year:1689,mode:'research'}).status,'unknown');
  assert.equal(resolveProvince(coll(approved(f)),{sourceRecordId:'YS001',year:1185}).status,'resolved');
});
test('conflicting province claims remain ambiguous',()=>{
  const f=approved(base('a','historical_toponym','province_membership'));
  f.properties.administrative_type='province'; f.properties.province_name='讃岐国';
  const g=structuredClone(f);g.id='b';g.properties.feature_id='b';g.properties.province_name='阿波国';
  assert.equal(resolveProvince(coll(f,g),{sourceRecordId:'YS001',year:1185}).status,'ambiguous');
});
function graphNode(id,approvedFlag=true){let f=base('n-'+id,'transport','network_node');f.properties.network={node_id:id};return approvedFlag?approved(f):f;}
function graphEdge(id,from,to,passability='attested',approvedFlag=true){let f=base(id,'transport','route');f.properties.network={from,to,passability};return approvedFlag?approved(f):f;}
test('transport refuses unapproved and disconnected links',()=>{
  const list=coll(graphNode('A'),graphNode('B'),graphEdge('e1','A','B','attested',false),graphEdge('e2','B','Z'));
  const graph=getTransportGraph(list,{year:1185,mode:'research'});
  assert.equal(graph.edges.length,0);assert.deepEqual(graph.unresolvedEdges.map(e=>e.reason),['not_reviewed','unverified_connection']);
});
test('historical passability and fictional travel time remain separate',()=>{
  const list=coll(graphNode('A'),graphNode('B'),graphEdge('e1','A','B'),graphEdge('e2','A','B','inferred'));
  const g=getTransportGraph(list,{year:1185});
  assert.equal(g.edges.length,1);assert.equal(g.unresolvedEdges.length,1);
  assert.equal(g.edges[0].scenario_only,false);
  assert.equal('travel_minutes' in g.edges[0],false);
  const expanded=getTransportGraph(list,{year:1185,allowInferred:true});
  assert.equal(expanded.edges.length,2);assert.equal(expanded.edges[1].scenario_only,true);
});

const YASHIMA={sites:[
 {site_id:'YS001',name:'屋島',location:{lat:34.3566,lng:134.1012,precision:'area_representative_not_event_point',coordinate_source:'https://a.example/yashima'},source_urls:['https://a.example/yashima'],historical_truth:'historical_battle_region',person_ids:[]},
 {site_id:'YS002',name:'祈り岩',location:{lat:null,lng:null,precision:'locality_only',coordinate_source:null},source_urls:['https://a.example/prayer'],historical_truth:'local_tradition',person_ids:['C115']}
]};
test('Yashima registry adapter preserves original IDs and null coordinates',()=>{
  const r=adaptGenpeiYashimaRegistry(YASHIMA);
  assert.equal(r.features.length,2);assert.equal(r.sources.length,2);
  assert.deepEqual(r.features[0].geometry.coordinates,[134.1012,34.3566]);
  assert.equal(r.features[1].geometry,null);
  assert.equal(r.features[1].properties.source_feature_refs[0].record_id,'YS002');
  assert.equal(r.features[1].properties.review_status,'pending_human');
  assert.equal(r.features[0].properties.valid_time.start_year,null);
  assert.equal(r.features[0].properties.origin_metadata.historical_truth_in_source,'historical_battle_region');
});
test('adapters do not modify source registries',()=>{
  const src=structuredClone(YASHIMA),before=JSON.stringify(src);
  adaptGenpeiYashimaRegistry(src);assert.equal(JSON.stringify(src),before);
});
test('Basho adapter produces separate modern reference and 1689 province claims',()=>{
  const data={places:[{id:'fukagawa',name:'芭蕉記念館',coordinates:[139.7941013,35.6861339],coordinate_accuracy:'modern_building_rooftop',coordinate_sources:['https://b.example/map'],source_url:'https://b.example/a',old_province:{name:'武蔵国',reading:'むさしのくに',basis_year:1689,source_url:'https://b.example/province'}}]};
  const r=adaptBashoPrototype(data);assert.equal(r.features.length,2);
  assert.deepEqual(r.features[0].geometry.coordinates,[139.7941013,35.6861339]);
  assert.equal(r.features[1].geometry,null);
  assert.equal(r.features[1].properties.province_name,'武蔵国');
  assert.equal(resolveProvince(r,{sourceRecordId:'fukagawa',year:1689,mode:'research'}).status,'candidate');
  assert.equal(resolveProvince(r,{sourceRecordId:'fukagawa',year:1689}).status,'unknown');
  assert.equal(r.features[0].properties.valid_time.start_year,null);
});
test('bad coordinates are never silently attached to modern references',()=>{
  const bad=structuredClone(YASHIMA);bad.sites[0].location.lat=999;
  assert.equal(adaptGenpeiYashimaRegistry(bad).features[0].geometry,null);
});
test('duplicate external IDs are rejected',()=>{
  const dup=structuredClone(YASHIMA);dup.sites.push(structuredClone(dup.sites[0]));
  assert.throws(()=>adaptGenpeiYashimaRegistry(dup),/duplicate/);
});


test('source IDs are namespaced when separate app catalogs are combined',()=>{
  const basho=adaptBashoPrototype({places:[{id:'fukagawa',name:'Fukagawa',coordinates:[139,35],coordinate_sources:['https://a.example/yashima'],source_url:'https://a.example/yashima',old_province:{name:'武蔵国',basis_year:1689,source_url:'https://a.example/yashima'}}]});
  const genpei=adaptGenpeiYashimaRegistry(YASHIMA);
  const a=new Set(basho.sources.map(s=>s.source_id));
  assert.equal(genpei.sources.some(s=>a.has(s.source_id)),false);
});
test('province lookup optionally filters by source repository',()=>{
  const a=approved(base('a','historical_toponym','province_membership'));
  a.properties.administrative_type='province';a.properties.province_name='讃岐国';
  const b=structuredClone(a);b.id='b';b.properties.feature_id='b';b.properties.province_name='武蔵国';
  b.properties.source_feature_refs[0].repository='elsewhere';
  assert.equal(resolveProvince(coll(a,b),{sourceRecordId:'YS001',year:1185}).status,'ambiguous');
  assert.equal(resolveProvince(coll(a,b),{sourceRecordId:'YS001',sourceRepository:'genpei',year:1185}).status,'resolved');
});
