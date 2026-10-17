"use strict";

// Basho Atlas prototype: modern reference positions ≠ historical route.
const DATA_URL = "./data/prototype-locations.json";
const OPENPOI_URL = "https://api.openpoiapi.com/v1/search";
const OPENPOI_RADIUS_METERS = 300;
const OPENPOI_LIMIT = 12;

const state = {
  places: [],
  selected: null,
  province: "all",
  era: "basho",
  map: null,
  markerLayer: null,
  poiLayer: null,
  poiAbort: null
};

function byId(id) { return document.getElementById(id); }
function addText(parent, tag, value, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = value == null ? "" : String(value);
  parent.appendChild(el);
  return el;
}
function validCoordinates(coords) {
  return Array.isArray(coords) && coords.length === 2 &&
    coords.every(Number.isFinite) &&
    Math.abs(coords[0]) <= 180 && Math.abs(coords[1]) <= 90;
}
function withinFilter(place) {
  return state.province === "all" || place.old_province.name === state.province;
}
function byProvince(place) {
  return state.province === "all" || place.old_province.name === state.province;
}
function metersBetween(lng1, lat1, lng2, lat2) {
  const toRadians = n => n * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}
function clearPoi() {
  if (state.poiAbort) {
    state.poiAbort.abort();
    state.poiAbort = null;
  }
  byId("poi-results").replaceChildren();
  byId("poi-status").textContent = "検索はボタンを押すまで行いません。";
  byId("poi-load").disabled = false;
  if (state.poiLayer) state.poiLayer.clearLayers();
}
function choosePlace(place, moveMap = true) {
  if (!place || !withinFilter(place)) return;
  const changed = !state.selected || state.selected.id !== place.id;
  if (changed) clearPoi();
  state.selected = place;
  byId("place-name").textContent = place.name;
  byId("place-context").textContent = place.context;
  byId("province-badge").textContent = place.old_province.name + "（" + place.old_province.reading + "）";
  byId("learning-question").textContent = place.learning_question;
  byId("place-source").href = place.source_url;
  byId("province-source").href = place.old_province.source_url;
  byId("coordinate-source").href = place.coordinate_sources[0];
  byId("coordinate-credit").textContent = "座標データ出典： " + (place.coordinate_attribution || "確認中");
  updateEraPanel();
  drawIndex();
  drawMarkers();
  if (moveMap && state.map) {
    state.map.setView([place.coordinates[1], place.coordinates[0]], 14);
  }
}
function updateEraPanel() {
  const place = state.selected;
  if (!place) return;
  document.querySelectorAll("[data-era]").forEach(tab => {
    const active = tab.dataset.era === state.era;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  const headings = {before:"LITERARY MEMORY / 芭蕉以前",basho:"THE JOURNEY / 1689年",today:"THE PLACE TODAY / 現代"};
  const content = byId("era-content");
  content.replaceChildren();
  content.setAttribute("aria-labelledby", "tab-" + state.era);
  addText(content, "p", headings[state.era], "era-heading");
  addText(content, "p", place.periods[state.era]);
}
function drawIndex() {
  const holder = byId("place-index");
  holder.replaceChildren();
  const visible = state.places.filter(byProvince);
  byId("map-count").textContent = visible.length + " 地点";
  for (const place of visible) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "index-button";
    button.setAttribute("aria-current", String(state.selected?.id === place.id));
    addText(button, "span", place.name, "index-name");
    addText(button, "span", place.old_province.name + " · " + place.municipality, "index-province");
    button.addEventListener("click", () => choosePlace(place));
    holder.appendChild(button);
  }
}
function drawMarkers() {
  if (!state.map || !state.markerLayer || !window.L) return;
  state.markerLayer.clearLayers();
  for (const place of state.places.filter(byProvince)) {
    if (!validCoordinates(place.coordinates)) continue;
    const active = state.selected?.id === place.id;
    const marker = L.circleMarker([place.coordinates[1], place.coordinates[0]], {
      radius: active ? 10 : 8, weight: 2.5,
      color: active ? "#214c3a" : "#fff", fillColor: "#4b8065", fillOpacity: 1
    });
    const popup = document.createElement("div");
    popup.className = "map-popup";
    addText(popup, "strong", place.name);
    addText(popup, "small", place.old_province.name + " · " + place.reference_site);
    addText(popup, "small", "ピンは現代の参照地点");
    marker.bindPopup(popup);
    marker.on("click", () => choosePlace(place, false));
    marker.addTo(state.markerLayer);
  }
}
function fitVisibleMap() {
  if (!state.map || !window.L) return;
  const points = state.places.filter(byProvince).filter(p => validCoordinates(p.coordinates));
  if (!points.length) return;
  if (points.length === 1) {
    state.map.setView([points[0].coordinates[1], points[0].coordinates[0]], 12);
  } else {
    state.map.fitBounds(L.latLngBounds(points.map(p => [p.coordinates[1], p.coordinates[0]])), {
      padding:[28,28], maxZoom:10
    });
  }
}
function selectProvince(value) {
  state.province = value;
  document.querySelectorAll("[data-province]").forEach(button =>
    button.setAttribute("aria-pressed", String(button.dataset.province === value)));
  if (!state.selected || !withinFilter(state.selected)) {
    const first = state.places.find(withinFilter);
    if (first) choosePlace(first, false);
  }
  drawIndex();
  drawMarkers();
  fitVisibleMap();
}
function initMap() {
  if (!window.L) {
    byId("map-fallback").hidden = false;
    return;
  }
  try {
    state.map = L.map("map", {scrollWheelZoom:false, zoomControl:true});
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      maxZoom:18
    }).addTo(state.map);
    state.markerLayer = L.layerGroup().addTo(state.map);
    state.poiLayer = L.layerGroup().addTo(state.map);
    drawMarkers();
    fitVisibleMap();
  } catch (error) {
    byId("map-fallback").hidden = false;
    console.warn("Leaflet unavailable:", error);
  }
}
function makePoiNode(poi) {
  const card = document.createElement("article");
  card.className = "poi-card";
  addText(card, "div", poi.name || "名称未登録", "poi-title");
  const note = [poi.category || poi.business_type || "未分類", poi.address || "住所不明"].join(" · ");
  addText(card, "div", note, "poi-details");
  const licenses = Array.isArray(poi.licenses) ? poi.licenses.join(" / ") : "未記録";
  const attributions = Array.isArray(poi.attributions) ? poi.attributions.join(" / ") : "出典未記録";
  addText(card, "div", "ライセンス: " + licenses + " ｜ 出典: " + attributions, "poi-attr");
  return card;
}
async function loadPoi() {
  const place = state.selected;
  if (!place || !validCoordinates(place.coordinates)) return;
  clearPoi();
  const controller = new AbortController();
  state.poiAbort = controller;
  byId("poi-load").disabled = true;
  byId("poi-status").textContent = "周辺施設を取得しています…";
  const [lng,lat] = place.coordinates;
  const params = new URLSearchParams({
    center: lng + "," + lat,
    radius:String(OPENPOI_RADIUS_METERS),
    limit:String(OPENPOI_LIMIT)
  });
  try {
    const response = await fetch(OPENPOI_URL + "?" + params.toString(), {signal:controller.signal});
    if (!response.ok) throw new Error("OpenPOI HTTP " + response.status);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.results)) throw new Error("API response format mismatch");
    if (controller.signal.aborted || state.selected?.id !== place.id) return;
    const seen = new Set();
    const pois = payload.results.filter(p => {
      if (p.lat === "" || p.lng === "" || p.lat == null || p.lng == null) return false;
      const latitude = Number(p.lat), longitude = Number(p.lng);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
          Math.abs(latitude)>90 || Math.abs(longitude)>180 ||
          metersBetween(lng,lat,longitude,latitude) > OPENPOI_RADIUS_METERS) return false;
      const key = [p.name,p.address,latitude.toFixed(5),longitude.toFixed(5)].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    byId("poi-status").textContent = "取得結果 " + pois.length + "件（最大" + OPENPOI_LIMIT + "件）。登録情報であり営業保証ではありません。";
    for (const poi of pois) {
      byId("poi-results").appendChild(makePoiNode(poi));
      if (state.poiLayer && window.L) {
        L.circleMarker([Number(poi.lat),Number(poi.lng)], {
          radius:4,color:"#a56840",weight:1,fillColor:"#e3a77c",fillOpacity:.85
        }).bindTooltip(String(poi.name || "名称未登録")).addTo(state.poiLayer);
      }
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      byId("poi-status").textContent = "施設データを取得できませんでした。文学・地図の表示は利用できます。";
      console.warn("OpenPOI fetch failed:", error);
    }
  } finally {
    if (state.poiAbort === controller) {
      state.poiAbort = null;
      byId("poi-load").disabled = false;
    }
  }
}
async function bootstrap() {
  document.querySelectorAll("[data-province]").forEach(button =>
    button.addEventListener("click", () => selectProvince(button.dataset.province)));
  document.querySelectorAll("[data-era]").forEach(button => {
    button.addEventListener("click", () => { state.era = button.dataset.era; updateEraPanel(); });
    button.addEventListener("keydown", event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const eras = ["before","basho","today"];
      const index = eras.indexOf(state.era);
      state.era = eras[(index + (event.key === "ArrowRight" ? 1 : 2)) % eras.length];
      updateEraPanel();
      byId("tab-"+state.era).focus();
    });
  });
  byId("poi-load").addEventListener("click", loadPoi);
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("data HTTP " + response.status);
    const data = await response.json();
    if (!data || !Array.isArray(data.places) || !data.places.length) throw new Error("Invalid place data");
    state.places = data.places.filter(p => validCoordinates(p.coordinates) && p.old_province?.name);
    if (!state.places.length) throw new Error("No valid map locations");
    state.selected = state.places[0];
    choosePlace(state.selected, false);
    initMap();
  } catch (error) {
    byId("map-fallback").hidden = false;
    byId("map-fallback").textContent = "地点データを読み込めませんでした。リロードして再試行してください。";
    byId("place-name").textContent = "地点データを取得できません";
    byId("poi-load").disabled = true;
    console.error("Basho Atlas failed to start:", error);
  }
}
bootstrap();
