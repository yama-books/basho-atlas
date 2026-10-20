// U2: keyboard, mobile flow, widths 320–1280, tap targets and text contrast, measured in the browser.
import {test, expect} from '@playwright/test';
import {mockNetwork} from './network.mjs';

async function open(page) {
  await mockNetwork(page);
  await page.goto('/kyukoku/');
  await expect(page.locator('#catalog-count')).toHaveText('88 / 88');
}

test('keyboard: type, Enter to results, arrows, Enter selects and focus stays on the result', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'keyboard flow measured on desktop');
  await open(page);
  await page.keyboard.press('Tab'); // skip link
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.locator('#search').focus();
  await page.keyboard.type('陸奥');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-province-id="P002"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-province-id="P115"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-province-id="P115"]')).toBeFocused(); // not lost by re-render
  await expect(page.locator('[data-province-id="P115"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-province-id="P002"]')).toHaveAttribute('aria-current', 'false');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(page.locator('[data-province-id="P002"]')).toHaveAttribute('aria-current', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#search')).toBeFocused();
  // Focus ring is visible on the year presets.
  await page.locator('[data-year="1868"]').focus();
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  expect(outline).not.toBe('none');
  // The year error is tied to the input for assistive tech.
  await expect(page.locator('#target-year')).toHaveAttribute('aria-describedby', 'year-error');
});

test('screen reader live text is debounced: typing a year announces once', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'desktop only');
  await open(page);
  await page.locator('#search').fill('武蔵');
  await page.locator('[data-province-id="P010"]').click();
  await page.locator('#target-year').fill('');
  const seen = [];
  await page.exposeFunction('__seen', t => seen.push(t));
  await page.evaluate(() => new MutationObserver(() => window.__seen(document.getElementById('announce').textContent))
    .observe(document.getElementById('announce'), {childList: true, characterData: true, subtree: true}));
  await page.locator('#target-year').pressSequentially('1689', {delay: 40});
  await expect.poll(() => seen.length).toBe(1);
  await page.waitForTimeout(800);
  expect(seen).toEqual(['武蔵国、1689年：ID対応のみ']);
});

test('phone: choosing a result brings the verdict into view, and back-to-search returns', async ({page, browserName}, info) => {
  test.skip(info.project.name === 'desktop-chromium', 'narrow viewports only');
  // Playwright's WebKit build on Windows has no touch emulation: tap on Chromium, click on WebKit.
  const press = l => browserName === 'chromium' ? l.tap() : l.click();
  // Guard against a project silently running the wrong engine.
  expect(page.context().browser().browserType().name()).toBe(info.project.name.startsWith('webkit') ? 'webkit' : 'chromium');
  await open(page);
  const search = page.locator('#search');
  // Search field is above the map on phones.
  const s = await search.boundingBox(), m = await page.locator('#map').boundingBox();
  expect(s.y).toBeLessThan(m.y);
  await search.fill('武蔵');
  await press(page.locator('[data-province-id="P010"]'));
  await expect(page.locator('#detail-heading')).toBeInViewport();
  await expect(page.locator('#detail-state')).toHaveText('ID対応のみ');
  await press(page.locator('#back-to-search'));
  await expect(page.locator('#catalogue')).toBeInViewport();
  await expect(page.locator('[data-province-id="P010"]')).toBeFocused();
  // Map → related point → back to Japan on a phone.
  await press(page.locator('#focus-reference'));
  await expect(page.locator('#map')).toBeInViewport();
  await expect(page.locator('.leaflet-popup-content')).toContainText('深川');
});

for (const width of [320, 375, 390, 768, 1280]) {
  test(`layout ${width}px: no horizontal scroll, controls inside the viewport, tap targets ≥ 40px`, async ({page}, info) => {
    test.skip(info.project.name !== 'desktop-chromium', 'width sweep runs once');
    await page.setViewportSize({width, height: 900});
    await open(page);
    await page.locator('#search').fill('陸奥');
    await page.locator('[data-province-id="P002"]').click();
    await page.locator('[data-year="1868"]').click();
    const report = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const sel = ['#search', '.group-switch span', '.province-choice', '#target-year', '[data-year]', '#related-ids button',
        '#reset-map', '.layer-toggle', '#back-to-search', '.source-top'];
      const issues = [];
      for (const s of sel) for (const e of document.querySelectorAll(s)) {
        const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
        if (cs.display === 'none' || r.width === 0) continue;
        if (r.left < -1 || r.right > vw + 1) issues.push(`${s} outside viewport (${Math.round(r.left)}..${Math.round(r.right)})`);
        if (s !== '.source-top' && r.height < 40) issues.push(`${s} height ${Math.round(r.height)}`);
      }
      return {scroll: document.documentElement.scrollWidth - vw, issues};
    });
    expect(report.scroll, 'horizontal overflow px').toBeLessThanOrEqual(0);
    expect(report.issues).toEqual([]);
  });
}

test('text contrast of key status and helper text meets WCAG AA (4.5:1)', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'desktop only');
  await open(page);
  await page.locator('#search').fill('陸奥');
  await page.locator('[data-province-id="P002"]').click();
  await page.locator('[data-year="1868"]').click();
  const results = await page.evaluate(() => {
    const rgb = c => c.match(/[\d.]+/g).slice(0, 4).map(Number);
    const lum = ([r, g, b]) => { const f = v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
    const bgOf = e => { for (let n = e; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c[3] !== 0 && c.length >= 3) return c; } return [255, 255, 255]; };
    const sel = ['.eyebrow', '.subtitle', '.field-label', '.list-hint', '.choice-desc', '.choice-id', '.result-foot', '.sub-info', '#detail-state',
      '#year-verdict', '.reference-card p', '#related-ids button', '.source-meta', '.legal-note', '.legend-note', '.legend span', '.site-footer span', '.alert'];
    return sel.flatMap(s => [...document.querySelectorAll(s)].slice(0, 2).map(e => {
      const a = lum(rgb(getComputedStyle(e).color)), b = lum(bgOf(e));
      return {s, ratio: Math.round((Math.max(a, b) + .05) / (Math.min(a, b) + .05) * 100) / 100};
    }));
  });
  const low = results.filter(r => r.ratio < 4.5);
  expect(low, JSON.stringify(results)).toEqual([]);
});

test('no innerHTML-style injection: data-derived names are plain text and links are https only', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'desktop only');
  await open(page);
  await page.locator('#search').fill('<img src=x onerror=alert(1)>');
  await expect(page.locator('#result-status')).toContainText('一致する国名がありません');
  await expect(page.locator('#province-results img')).toHaveCount(0);
  const hrefs = await page.locator('a[href]').evaluateAll(as => as.map(a => a.href));
  expect(hrefs.filter(h => !/^(https:|http:\/\/127\.0\.0\.1)/.test(h))).toEqual([]);
  const blank = await page.locator('a[target=_blank]').evaluateAll(as => as.map(a => a.rel));
  expect(blank.every(r => /noopener/.test(r))).toBe(true);
});
