import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Explicit opt-in only: routine checks stay offline and deterministic.
test('optional official CODH ID/name/parent-child table comparison',
  {skip:process.env.OLDMAP_COMPARE_CODH !== '1'}, async t => {
    const url = 'https://codh.rois.ac.jp/province/';
    const response = await fetch(url, {signal:AbortSignal.timeout(30000)});
    assert.equal(response.status, 200);
    const html = await response.text();
    const rows = [...html.matchAll(/<tr id="(P\d{3})">([\s\S]*?)<\/tr>/g)];
    assert.equal(rows.length, 88, 'page format or expected ID coverage changed');
    const official = new Map();
    for (const [, id, body] of rows) {
      const cells = [...body.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1]);
      assert(cells.length >= 3, 'expected ID, name and related IDs');
      assert.equal(cells[0].trim(), id);
      assert(!official.has(id), 'duplicate source ID');
      official.set(id, {name:cells[1].trim(),
        related:[...cells[2].matchAll(/href="#(P\d{3})"/g)].map(m => m[1]).sort()});
    }
    const catalog = JSON.parse(readFileSync(new URL('../data/historical-gis/codh-province-index.json', import.meta.url), 'utf8'));
    assert.deepEqual([...official.keys()].sort(), catalog.entries.map(e => e.id).sort());
    for (const entry of catalog.entries) {
      assert.equal(official.get(entry.id).name, entry.name, entry.id + ' name');
      const related = entry.parent_id ? [entry.parent_id] : [...(entry.linked_to ?? [])];
      assert.deepEqual(official.get(entry.id).related, related.sort(), entry.id + ' relations');
    }
    t.diagnostic(JSON.stringify({url, retrieved_at:new Date().toISOString(),
      method:'Node fetch; official HTML tr IDs / first three td cells; no geometry',
      html_sha256:createHash('sha256').update(html).digest('hex'), compared:88,
      differences:0}));
  });
