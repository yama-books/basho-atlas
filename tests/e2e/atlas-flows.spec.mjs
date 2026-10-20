// U1: the six user tasks of docs/OLDMAP_CLAUDE_WP_20261020.md, driven through a real browser.
import {test, expect} from '@playwright/test';
import {mockNetwork} from './network.mjs';

const markers = page => page.locator('#map path.leaflet-interactive');

async function open(page, mode) {
  const counts = await mockNetwork(page, mode);
  await page.goto('/kyukoku/');
  await expect(page.locator('#catalog-count')).toHaveText('88 / 88');
  return counts;
}
async function choose(page, query, id) {
  await page.locator('#search').fill(query);
  await page.locator(`[data-province-id="${id}"]`).click();
  await expect(page.locator(`[data-province-id="${id}"]`)).toHaveAttribute('aria-current', 'true');
}

test('1. 武蔵 → P010 → 1689 is an ID correspondence only, then jump to the sources', async ({page}) => {
  const counts = await open(page);
  await choose(page, '武蔵', 'P010');
  await page.locator('[data-year="1689"]').click();
  await expect(page.locator('#detail-heading')).toHaveText('武蔵国');
  await expect(page.locator('#detail-state')).toHaveText('ID対応のみ');
  await expect(page.locator('#year-verdict')).toContainText('1689年');
  await expect(page.locator('#year-verdict')).toContainText('国境や地点所属の立証ではありません');
  // The UI must never claim a confirmed historical membership.
  await expect(page.locator('#detail')).not.toContainText(/確定した|所属が確定/);
  await page.getByRole('link', {name: /典拠を確認/}).click();
  await expect(page).toHaveURL(/#sources$/);
  await expect(page.locator('#sources')).toBeInViewport();
  const codh = page.locator('#catalog-source');
  await expect(codh).toHaveAttribute('href', 'https://codh.rois.ac.jp/province/');
  await expect(codh).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('#catalog-checked')).toContainText('2026-10-19');
  expect(counts.external.filter(u => !u.startsWith('https://tile.openstreetmap.org/'))).toEqual([]);
});

test('2. 陸奥 shows P002 and P115 separately; 1868 P002 is undetermined and P115 is not applied to 1689', async ({page}) => {
  await open(page);
  await page.locator('#search').fill('陸奥');
  await expect(page.locator('.province-choice')).toHaveCount(2);
  await expect(page.locator('[data-province-id="P002"]')).toContainText('江戸期から');
  await expect(page.locator('[data-province-id="P115"]')).toContainText('明治期分割後');
  await expect(page.locator('#result-status')).toHaveText('2件。国名を選択してください。');

  await page.locator('[data-province-id="P002"]').click();
  await page.locator('[data-year="1868"]').click();
  await expect(page.locator('#detail-state')).toHaveText('境界年・保留');
  await expect(page.locator('#year-verdict')).toContainText('1868年');
  await expect(page.locator('#year-verdict')).toContainText('確定しません');
  // Still P002: the 1868 year alone must not switch the record to P115.
  await expect(page.locator('#detail-id')).toContainText('P002');
  await expect(page.locator('[data-province-id="P002"]')).toHaveAttribute('aria-current', 'true');

  await page.locator('[data-year="1689"]').click();
  await page.locator('[data-province-id="P115"]').click();
  await expect(page.locator('#detail-heading')).toHaveText('陸奥国（明治の分割後）');
  await expect(page.locator('#detail-state')).toHaveText('時代対象外');
  await expect(page.locator('#year-verdict')).toContainText('指定年へ適用しません');
  // No modern reference point is tied to P115 in 1689.
  await expect(page.locator('#focus-reference')).toBeHidden();

  // The relation button returns to the parent without inventing anything.
  await page.getByRole('button', {name: '分割前：陸奥 P002'}).click();
  await expect(page.locator('#detail-id')).toContainText('P002');
  await expect(page.locator('#detail-state')).toHaveText('ID対応のみ');
});

test('3. 1185 讃岐 explains that nothing historical can be drawn', async ({page}) => {
  await open(page);
  await expect(markers(page)).toHaveCount(4);
  await page.locator('[data-year="1185"]').click();
  await choose(page, 'さぬき', 'P044');
  await expect(page.locator('#detail-heading')).toHaveText('讃岐国');
  await expect(page.locator('#detail-state')).toHaveText('史料未監査');
  await expect(page.locator('#year-verdict')).toContainText('1185年');
  await expect(page.locator('#selected-reference')).toContainText('地図には何も描きません');
  await expect(page.locator('#selected-reference')).toContainText('推測した国境線');
  await expect(page.locator('#focus-reference')).toBeHidden();
  // Only the 4 modern reference circles exist: no polygon/polyline was added for 1185.
  await expect(markers(page)).toHaveCount(4);
  expect(await page.locator('#map path.leaflet-interactive').evaluateAll(ps => ps.every(p => /a/i.test(p.getAttribute('d'))))).toBe(true);
});

test('4. invalid years drop the previous verdict, and 1689 restores it', async ({page}) => {
  await open(page);
  await choose(page, '武蔵', 'P010');
  await page.locator('[data-year="1185"]').click();
  await expect(page.locator('#detail-state')).toHaveText('史料未監査');
  const year = page.locator('#target-year');
  for (const bad of ['', '-1', '10000', '1.5', '0']) {
    await year.fill(bad);
    await expect(page.locator('#year-error'), `value ${JSON.stringify(bad)}`).toBeVisible();
    await expect(year).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#detail-state')).toHaveText('年入力エラー');
    await expect(page.locator('#year-verdict')).not.toContainText('1185年');
    await expect(page.locator('#year-verdict')).toContainText('年が無効');
    await expect(page.locator('[data-year][aria-pressed="true"]')).toHaveCount(0);
    await expect(page.locator('#reference-status')).toContainText('年入力エラー');
    await expect(page.locator('#focus-reference')).toBeHidden();
  }
  await page.locator('[data-year="1689"]').click();
  await expect(page.locator('#year-error')).toBeHidden();
  await expect(year).toHaveValue('1689');
  await expect(year).toHaveAttribute('aria-invalid', 'false');
  await expect(page.locator('#detail-state')).toHaveText('ID対応のみ');
  await expect(page.locator('#focus-reference')).toBeVisible();
  // Typed (not preset) recovery works too.
  await year.fill('1868');
  await expect(page.locator('#detail-state')).toHaveText('史料未監査');
});

test('5. modern points toggle, focus the related point, return to all Japan', async ({page}) => {
  await open(page);
  await choose(page, '武蔵', 'P010');
  await expect(markers(page)).toHaveCount(4);
  await expect(page.locator('#selected-reference')).toContainText('深川');

  await page.locator('#toggle-modern').uncheck();
  await expect(markers(page)).toHaveCount(0);
  await expect(page.locator('#reference-status')).toHaveText('現代参照点を非表示');
  await expect(page.locator('#focus-reference')).toBeHidden();
  await expect(page.locator('#detail-state')).toHaveText('ID対応のみ'); // verdict unaffected
  await page.locator('#toggle-modern').check();
  await expect(markers(page)).toHaveCount(4);

  await page.locator('#focus-reference').click();
  const popup = page.locator('.leaflet-popup-content');
  await expect(popup).toContainText('深川');
  await expect(popup).toContainText('現代の参照地点。歴史的な事件や旧国境の位置を示しません。');
  const shape = () => markers(page).evaluateAll(ps => ps.map(p => p.getAttribute('d')).join('|'));
  const zoomedIn = await shape();
  await page.locator('#reset-map').click();
  await expect(popup).toHaveCount(0);
  await expect.poll(shape).not.toBe(zoomedIn); // the view moved back out
  // Legend states these are modern points, not historical positions.
  await expect(page.locator('.legend')).toContainText('史実位置ではありません');
});

test('6a. index JSON failure is a network error with retry, not "0 results"', async ({page}) => {
  const mode = {index: 'fail'};
  await mockNetwork(page, mode);
  await page.goto('/kyukoku/');
  await expect(page.locator('#result-status')).toContainText('通信エラー');
  await expect(page.locator('#result-status')).not.toContainText('一致する国名がありません');
  await expect(page.locator('#catalog-count')).toHaveText('取得失敗');
  await expect(page.locator('#detail-state')).toHaveText('索引なし');
  await expect(page.locator('#catalog-source')).toBeVisible(); // sources still reachable
  await expect(page.locator('#map .leaflet-tile-pane')).toHaveCount(1); // map still usable
  mode.index = 'ok';
  await page.locator('#retry-index').click();
  await expect(page.locator('#catalog-count')).toHaveText('88 / 88');
  await expect(page.locator('#retry-index')).toBeHidden();
  await choose(page, '武蔵', 'P010');
  await expect(page.locator('#detail-state')).toHaveText('ID対応のみ');
});

test('6b. Leaflet CDN failure keeps search, verdicts and sources, and the map can be retried', async ({page}) => {
  const mode = {leaflet: 'fail'};
  await mockNetwork(page, mode);
  await page.goto('/kyukoku/');
  await expect(page.locator('#map-fallback')).toBeVisible();
  await expect(page.locator('#map-fallback')).toContainText('Leaflet');
  await expect(page.locator('#reset-map')).toBeDisabled();
  await expect(page.locator('#reference-status')).toHaveText('地図を表示できないため参照点は描画していません（4件）');
  await choose(page, '陸奥', 'P002');
  await page.locator('[data-year="1868"]').click();
  await expect(page.locator('#detail-state')).toHaveText('境界年・保留');
  await expect(page.locator('#focus-reference')).toBeHidden();
  await expect(page.locator('#catalog-source')).toBeVisible();
  mode.leaflet = 'ok';
  await page.locator('#retry-map').click();
  await expect(page.locator('#map-fallback')).toBeHidden();
  await expect(markers(page)).toHaveCount(4);
  await expect(page.locator('#reset-map')).toBeEnabled();
});

test('6c. tile errors show one warning, other features keep working, retry reloads tiles', async ({page}) => {
  const mode = {tiles: 'fail'};
  const counts = await open(page, mode);
  const warning = page.locator('#tile-status');
  await expect(warning).toBeVisible();
  await expect(warning).toContainText('通信エラー');
  expect(counts.tiles).toBeGreaterThan(1); // many tile failures...
  await expect(page.locator('.tile-warning')).toHaveCount(1); // ...one warning
  await choose(page, '武蔵', 'P010');
  await expect(page.locator('#detail-state')).toHaveText('ID対応のみ');
  await expect(markers(page)).toHaveCount(4);
  // Network failure and "no historical shape" are different messages in different places.
  await page.locator('[data-year="1185"]').click();
  await expect(page.locator('#selected-reference')).toContainText('収録していない');
  await expect(page.locator('#selected-reference')).not.toContainText('通信');
  mode.tiles = 'ok';
  const before = counts.tiles;
  await page.locator('#retry-tiles').click();
  await expect(warning).toBeHidden();
  await expect.poll(() => counts.tiles).toBeGreaterThan(before);
  await page.waitForTimeout(300);
  await expect(warning).toBeHidden();
});

test('6d. reference-point data failure is reported in the legend; search and verdicts still work', async ({page}) => {
  await mockNetwork(page);
  await page.route(/\/data\/(prototype-locations\.json|historical-gis\/yashima-basho\.sample\.geojson)$/, r => r.abort('connectionfailed'));
  await page.goto('/kyukoku/');
  await expect(page.locator('#reference-status')).toHaveText('参照点データを取得できませんでした（国名・年代判定には影響しません）');
  await expect(markers(page)).toHaveCount(0);
  await choose(page, '武蔵', 'P010');
  await expect(page.locator('#detail-state')).toHaveText('ID対応のみ');
  await expect(page.locator('#focus-reference')).toBeHidden();
});

test('7. Core normalization excludes invalid coordinates and treats input names as plain text', async ({page}) => {
  await mockNetwork(page);
  await page.route('**/data/prototype-locations.json', async route => {
    const original=await route.fetch();
    const data=await original.json();
    data.places[0].coordinates=['139.79',35.68]; // must not coerce string coordinates
    data.places[1].name='<img src=x onerror=alert(1)>';
    data.places[1].source_url='javascript:alert(1)';
    data.places[1].coordinate_sources=['javascript:alert(1)'];
    await route.fulfill({response:original,json:data});
  });
  await page.goto('/kyukoku/');
  await expect(page.locator('#catalog-count')).toHaveText('88 / 88');
  await expect(markers(page)).toHaveCount(3); // 2 remaining Basho + 1 modern Yashima
  await expect(page.locator('#reference-status')).toContainText('一部の参照点データを取得・表示できませんでした');
  await choose(page,'武蔵','P010');
  await expect(page.locator('#focus-reference')).toBeHidden();
  await choose(page,'陸奥','P002');
  await expect(page.locator('#selected-reference')).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#selected-reference img')).toHaveCount(0);
  await expect(page.locator('#detail-state')).toHaveText('ID対応のみ');
});

test('8. one missing reference dataset does not hide the other dataset', async ({page}) => {
  await mockNetwork(page);
  await page.route('**/data/prototype-locations.json',r=>r.abort('connectionfailed'));
  await page.goto('/kyukoku/');
  await expect(page.locator('#catalog-count')).toHaveText('88 / 88');
  await expect(markers(page)).toHaveCount(1); // the independent modern Yashima point
  await expect(page.locator('#reference-status')).toContainText('一部の参照点データを取得・表示できませんでした');
  await choose(page,'讃岐','P044');
  await expect(page.locator('#detail-state')).toHaveText('史料未監査');
  await expect(page.locator('#focus-reference')).toBeHidden();
});
