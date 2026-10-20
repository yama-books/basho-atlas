// Network control for the atlas E2E: no request leaves 127.0.0.1.
// - Leaflet 1.9.4 (BSD-2-Clause) is served from the local npm package instead of unpkg; the
//   page's SRI hashes still have to match, so a wrong file fails loudly.
// - OpenStreetMap tiles are replaced by a 1x1 PNG (no bulk tile download from the OSM servers).
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const leafletDist = fileURLToPath(new URL('../../node_modules/leaflet/dist/', import.meta.url));
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
export const INDEX_PATH = '**/data/historical-gis/codh-province-index.json';

/**
 * @param {import('@playwright/test').Page} page
 * @param {{leaflet?:'ok'|'fail', tiles?:'ok'|'fail', index?:'ok'|'fail'}} mode  mutable: tests may flip it to simulate recovery
 */
export async function mockNetwork(page, mode = {}) {
  mode.leaflet ??= 'ok'; mode.tiles ??= 'ok'; mode.index ??= 'ok';
  const counts = {tiles: 0, external: []};
  // Registered first = lowest priority: anything not handled below and not local is blocked.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    counts.external.push(url.href);
    return route.abort('blockedbyclient');
  });
  await page.route('https://unpkg.com/leaflet@1.9.4/dist/**', route => {
    if (mode.leaflet === 'fail') return route.abort('connectionfailed');
    const file = route.request().url().split('/dist/')[1].split('?')[0];
    if (!['leaflet.js', 'leaflet.css'].includes(file)) return route.abort('blockedbyclient');
    return route.fulfill({
      body: readFileSync(leafletDist + file),
      contentType: file.endsWith('.css') ? 'text/css' : 'text/javascript',
      headers: {'access-control-allow-origin': '*'},
    });
  });
  await page.route('https://tile.openstreetmap.org/**', route => {
    counts.tiles++;
    if (mode.tiles === 'fail') return route.abort('connectionfailed');
    return route.fulfill({body: PNG_1PX, contentType: 'image/png', headers: {'access-control-allow-origin': '*'}});
  });
  await page.route(INDEX_PATH, route => mode.index === 'fail' ? route.abort('connectionfailed') : route.continue());
  return counts;
}
