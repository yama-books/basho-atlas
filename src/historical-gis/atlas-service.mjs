/**
 * Small consumer-facing facade for the standalone historical province atlas.
 * No geocoding or historical border inference is performed here.
 */
import {
  validateProvinceIndex,
  searchProvinceIndex,
  explainProvinceYear,
  provinceRelations,
} from './province-index.mjs';

/** Strictly parse a CE year, never allowing 1e3, decimals, or stale fallback years. */
export function parseTargetYear(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'number' && !Number.isInteger(value)) return null;
  const text = String(value).normalize('NFKC').trim();
  if (!/^[0-9]{1,4}$/.test(text)) return null;
  const year = Number(text);
  return year >= 1 && year <= 9999 ? year : null;
}

export function createProvinceAtlasService(catalog) {
  const index = validateProvinceIndex(catalog);
  return Object.freeze({
    total: index.entries.length,
    search({text = '', group = 'all'} = {}) {
      return searchProvinceIndex(catalog, {query: text, group});
    },
    getProvince({id, year}) {
      const relations = provinceRelations(catalog, id);
      if (!relations) return {status: 'not_found', record: null, relations: null, yearResult: null};
      const parsed = parseTargetYear(year);
      const yearResult = parsed === null
        ? {status: 'invalid_year', year: null, province_id: null, geometry: null,
           message: '年の入力を確認してください。年代判定は停止しています。'}
        : explainProvinceYear(relations.record, parsed);
      return {status: 'found', record: relations.record, relations, yearResult};
    },
  });
}
