/**
 * Basho Atlas literary-card schema v1.
 * Pure, build-free ESM: importable by browsers and Node 20+.
 * The renderer never treats an unreviewed record as an approved lesson.
 */
export const LAYER_IDS = Object.freeze(["before", "basho", "today"]);
export const SCHEMA_VERSION = "1.0.0";
const allowedKinds = new Set(["waka", "haiku", "travelogue", "explanation", "site"]);
const allowedEvidence = new Set([
  "online_transcription", "edited_text", "secondary_commentary",
  "official_site", "dlm_metadata", "research_hypothesis"
]);
function fail(where, reason) { throw new TypeError(`${where}: ${reason}`); }
function isText(value) { return typeof value === "string" && value.trim().length > 0; }
function isHttps(value) {
  if (!isText(value)) return false;
  try { return new URL(value).protocol === "https:"; }
  catch { return false; }
}
function assertDraft(record, where) {
  if (!record || record.review_status !== "pending_human" || record.public_use !== "draft_only") {
    fail(where, "preview content must remain pending_human/draft_only");
  }
}
function uniq(items, where) {
  const seen = new Set();
  for (const id of items) {
    if (seen.has(id)) fail(where, `duplicate ID ${id}`);
    seen.add(id);
  }
}
export function validateCard(card) {
  assertDraft(card, "card");
  if (card.schema_version !== SCHEMA_VERSION) fail("card", "unsupported schema version");
  if (!/^[a-z0-9-]+$/.test(card.id || "") || !isText(card.title)) fail("card", "missing stable ID/title");
  if (!isText(card.subtitle) || !isText(card.location?.municipality)) fail("card", "missing subtitle/location");
  const province = card.location?.old_province;
  if (!province || !isText(province.name) || province.basis_year !== 1689 ||
      province.status !== "pending_kyukoku_engine") fail("old_province", "undated or unverified province");
  if (!Array.isArray(card.sources) || !card.sources.length) fail("sources", "missing sources");
  uniq(card.sources.map(x => x.id), "sources");
  const sourceIds = new Set();
  for (const source of card.sources) {
    if (!/^[a-z0-9-]+$/.test(source.id||"") || !isText(source.title) || !isHttps(source.url)) {
      fail("source", "invalid ID/title/HTTPS URL");
    }
    sourceIds.add(source.id);
  }
  function checkSources(value, where) {
    if (!Array.isArray(value) || value.length===0) fail(where, "source_ids required");
    for (const id of value) if (!sourceIds.has(id)) fail(where, `unknown source ID ${id}`);
  }
  if (!Array.isArray(card.layers) || card.layers.length !== LAYER_IDS.length ||
      card.layers.some((l,i) => l.id !== LAYER_IDS[i])) fail("layers", "must contain before/basho/today in order");
  const itemIds = new Set();
  for (const layer of card.layers) {
    assertDraft(layer, `layer ${layer.id}`);
    if (!isText(layer.title) || !Array.isArray(layer.items) || !layer.items.length) {
      fail(`layer ${layer.id}`, "missing title/items");
    }
    for (const item of layer.items) {
      assertDraft(item, `item ${item.id}`);
      if (!/^[a-z0-9-]+$/.test(item.id||"") || !allowedKinds.has(item.kind) ||
          !isText(item.title) || (!isText(item.text) && !isText(item.note))) {
        fail("item", "invalid ID/kind/title/content");
      }
      if (!allowedEvidence.has(item.evidence)) fail(item.id,"unknown evidence classification");
      if (itemIds.has(item.id)) fail("items",`duplicate item ID ${item.id}`);
      itemIds.add(item.id);
      checkSources(item.source_ids,item.id);
      if (item.attributed_to != null && !isText(item.attributed_to)) fail(item.id,"invalid author");
    }
  }
  if (!Array.isArray(card.keywords)) fail("keywords", "expected array");
  uniq(card.keywords.map(k => k.term), "keywords");
  for (const k of card.keywords) {
    if (!isText(k.term) || !isText(k.explanation) ||
        !Array.isArray(k.related_item_ids) || k.related_item_ids.some(id=>!itemIds.has(id))) {
      fail("keyword","invalid label/explanation/item references");
    }
  }
  if (!isText(card.learning?.question) || card.learning?.answer_status!=="question_only") {
    fail("learning","cannot publish an unreviewed answer");
  }
  checkSources(card.learning.source_ids,"learning");
  if (card.reference_point != null) {
    const point = card.reference_point;
    if (!["modern_reference_site", "literary_reference_point"].includes(point.kind) ||
        !Array.isArray(point.coordinates) || point.coordinates.length!==2 ||
        point.coordinates.some(n=>typeof n !== "number" || !Number.isFinite(n)) ||
        Math.abs(point.coordinates[0])>180 || Math.abs(point.coordinates[1])>90 ||
        !isText(point.caution)) fail("reference_point","invalid or ambiguous map reference");
    checkSources(point.source_ids,"reference_point");
  }
  return card;
}
export function getLayer(card,id) {
  return card.layers.find(layer=>layer.id===id) || null;
}
export function approvedForProduction(card) {
  // Intentionally always false for a preview schema. Production uses a separate,
  // human-reviewed data contract; callers cannot flip one JSON field to publish.
  return false;
}
