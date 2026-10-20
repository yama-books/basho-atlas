/** Browsable CODH identifier catalogue, never a national historical geocoder. */
import { assertYear } from './core.mjs';
import { lookupCodhProvinceId } from './codh-province-ids.mjs';

const aliasById = Object.freeze({
  P002:['むつ','むつのくに'], P010:['むさし','むさしのくに'],
  P043:['あわ','あわのくに'], P044:['さぬき','さぬきのくに'], P101:['胆振']
});
const normal = value => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('ja');
const P_ID = /^P(?:0[0-6][0-9]|070|1(?:0[0-9]|1[0-7]))$/;

export function validateProvinceIndex(catalog) {
  if (catalog?.schema_version !== '0.1.0' || !Array.isArray(catalog.entries)) throw new TypeError('invalid CODH catalogue');
  if (catalog.source?.url !== 'https://codh.rois.ac.jp/province/') throw new TypeError('missing official CODH source');
  const byId = new Map();
  for (const entry of catalog.entries) {
    if (!P_ID.test(entry.id) || typeof entry.name !== 'string' || !entry.name || byId.has(entry.id)) {
      throw new TypeError('duplicate or malformed province record ID/name');
    }
    if (!['edo_inherited','meiji_split'].includes(entry.registry_group)) throw new TypeError('unknown ID series');
    if (entry.registry_group === 'edo_inherited' && Number(entry.id.slice(1)) > 70) throw new TypeError('wrong inherited ID series');
    if (entry.registry_group === 'meiji_split' && Number(entry.id.slice(1)) < 100) throw new TypeError('wrong split ID series');
    byId.set(entry.id,entry);
  }
  for(let i=1;i<=70;i++)if(!byId.has('P'+String(i).padStart(3,'0')))throw new TypeError('missing inherited index P'+i);
  for(let i=100;i<=117;i++)if(!byId.has('P'+String(i).padStart(3,'0')))throw new TypeError('missing split index P'+i);
  for(const entry of catalog.entries) {
    if(entry.parent_id && !byId.has(entry.parent_id)) throw new TypeError('missing parent '+entry.parent_id);
    for(const link of entry.linked_to || []) if(!byId.has(link))throw new TypeError('missing child '+link);
  }
  const inherited=catalog.entries.filter(e=>e.registry_group==='edo_inherited');
  const split=catalog.entries.filter(e=>e.registry_group==='meiji_split');
  if(inherited.length!==70 || split.length!==18)throw new RangeError('official P-series snapshot must contain 70+18 entries');
  return {entries:catalog.entries,byId,inherited,split};
}

export function searchProvinceIndex(index, { query='', group='all' }={}) {
  const { entries }=validateProvinceIndex(index);
  if(!['all','edo_inherited','meiji_split'].includes(group))throw new RangeError('unknown catalogue group');
  const needle=normal(query).replace(/国$/,'');
  return entries.filter(entry => group==='all'||entry.registry_group===group)
    .filter(entry=>!needle || [entry.id,entry.name,entry.name+'国',...(aliasById[entry.id]||[])].some(x=>normal(x).includes(needle)));
}

/** Distinguishes an official identifier from a year-appropriate provincial assignment. */
export function explainProvinceYear(entry, year) {
  assertYear(year);
  if(!entry || typeof entry.id!=='string') throw new TypeError('province entry required');
  if(entry.registry_group==='meiji_split'){
    return {status:year<1868?'not_applicable_to_pre_reorganization':'time_not_attested',
      message:year<1868?'このIDは明治期の分割後に設けた索引用IDです。指定年へ適用しません。':'明治期の分割後の国名です。対象年月日との照合が未完了です。',
      year,province_id:null,geometry:null};
  }
  const crosswalk=lookupCodhProvinceId({name:entry.name,year});
  const exact=crosswalk.status==='id_match_only'&&crosswalk.province_id===entry.id;
  if(exact) return {status:'index_correspondence_only',message:'この年代の旧国名に対応するCODHの索引用IDです。国境や地点所属の立証ではありません。',
    year,province_id:entry.id,geometry:null};
  if(crosswalk.status==='transition_undetermined') return {status:'transition_undetermined',
    message:'分割前後の切替時点が要検証です。年だけで旧国の切替を確定しません。',
    year,province_id:null,geometry:null};
  return {status:'historical_validity_unreviewed',
    message:'CODHの索引には登録されていますが、この年の実在期間や帰属を個別に確認していません。',
    year,province_id:null,geometry:null};
}

export function provinceRelations(index, id) {
  const {byId}=validateProvinceIndex(index);
  const record=byId.get(id);
  if(!record) return null;
  return {record,parent:record.parent_id?byId.get(record.parent_id):null,
    children:(record.linked_to||[]).map(code=>byId.get(code))};
}
