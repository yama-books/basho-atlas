# 共通歴史地理基盤：Shared Historical GIS Architecture v0.1
更新: 2026-10-17 / 状態: 設計案（実アプリ未接続・公開判定前）

## 1. 目的・境界
\`basho-atlas\`（1689年）と \`genpei-sandbox\`（1185年前後）で、年代・地名・国郡・地形・史料・権利情報を共通の仕様で利用する。両アプリの作品解釈、ゲーム内引力、所要時間、人物AI、表示文言は共通ライブラリへ持ち込まない。歴史的事実、後世の伝承、地理的推定、現代座標を同一視しない。

既存資料: [OLD_PROVINCES.md](OLD_PROVINCES.md)、[DATA_MODEL.md](DATA_MODEL.md)、[ROADMAP.md](ROADMAP.md)。連携先: https://github.com/yama-books/genpei-sandbox/blob/main/docs/FOUNDATION_DESIGN.md および https://github.com/yama-books/genpei-sandbox/blob/main/data/places/YASHIMA_SITE_REGISTRY.json 。

## 2. 確認済み現状（GitHub実ファイル照合）
- basho-atlas: \`app.js\` / \`index.html\` に Leaflet 1.9.4 + OSM公式タイル。WGS84の現代3地点、旧国名ラベル（深川＝武蔵国、岩沼・松島＝陸奥国、基準1689）、OpenPOI任意検索を試作。境界線・年代による地理レイヤー切替・古地図位置合わせ・歴史経路なし。\`before/basho/today\` は **文学解説タブ**であって地理時代の切替ではない。
- genpei-sandbox: \`YASHIMA_SITE_REGISTRY.json\` に現代の史跡・伝承地8件。精査済み座標はYS001屋島の代表点1件のみ。7件はnull。1185年の事件座標には転用できない。現代交通を使う自律移動構想はあるが、歴史経路データは未接続。
- basho-atlas既存ファイルは本設計作業では一切変更しない。

## 3. 推奨構成
**静的JSON/GeoJSON + フレームワーク非依存の小さなTypeScriptライブラリ + 表示アダプター**。APIサーバー／DB／全国GISファイルの同梱は初期MVPから除外する。旧国名エンジン構想（将来の \`kyukoku-engine\`）は独立のCoreとして吸収できるインターフェースを保ち、リポジトリ新設・公開設定・ライセンスは後日承認を得る。今回の保存先は既存 basho-atlas のdocsとサンプルのみ。

\`\`\`text
domain-neutral historical-gis
  core/          dates, provenance, uncertainty, province IDs, layer selection
  gazetteer/     place identity, aliases, time-scoped claims, source references
  geography/     feature and reconstruction catalogs; no invented polygons
  transport/     network nodes/edges + certainty; NO travel-time simulation
  geometry/      optional GeoJSON/topology providers + publication gate
  imagery/       historical map image metadata, IIIF/tiles, georeferencing errors
  adapters/leaflet/   Leaflet visual layer metadata/output
  adapters/maplibre/  MapLibre source/style metadata/output
apps (outside shared core):
  basho-atlas / genpei-sandbox / others
\`\`\`

## 4. 6独立レイヤー
1. **historical_map_image**: 当時または後世に作製された古地図画像そのもの。作製期・描写対象期・利用許諾・画像変形・ジオリファレンス残差・制御点を必須管理。画像を1185年の実測面として扱わない。
2. **reconstructed_geography**: 復元水域・河口・古道・地形。根拠年代・推定方法・複数仮説・現代とのずれを表示。
3. **historical_toponym**: 同一地名対象とその時期別名称、旧国・郡・藩等の区別。GeoLOD/CODH IDを外部キーに保持し、名称の一致だけで所属判定しない。
4. **historical_activity**: 事件・人物・旅程と地点の「関係」への参照。アプリ固有の人物・作品正本を複製しない。
5. **modern_reference**: 現代行政区画、施設、OpenPOI、現代海岸線。歴史時代の事実認定に流用しない。
6. **provenance_uncertainty**: すべてのレイヤーに共通の横断メタデータ。出典・位置精度・典拠区分・公表権利・監査。

## 5. 時間軸の不変条件
\`valid_time\` = 地物が存在したと推定する期間、\`attested_time\` = 史料上で存在・状態を確認できる期間、\`source_created_time\` = 文献・地図そのものの作製期、\`geometry_observed_time\` = 位置や形状が測定・復元された基準期。互いに独立で、省略時はnull。年粒度と年内不確定の扱いを明示。1185年の地形に1880年代の地図線を当てる場合は \`anachronism_warning\` を必須、1185年形状として自動採用しない。各候補は \`claim_id\` を持ち、相反する仮説を残す。

## 6. データフローと信頼境界
\`sources\` → 人手・機械による整理 \`candidate_features\` → 出典/年代/許諾/位置精度を確認 → \`approved_features\` → GeoJSON配布 → Map Adapter。公開リポジトリにドラフト例を置くことと実際のアプリに表示することは別。公開表示の原則 \`review_status=human_approved\` かつ \`public_use=approved_for_app\`、\`license_status=cleared\`（データ自体を再配布する場合）。\`geometry=null\`でも「候補地未確定」カードは表示可能。境界・道路の点包含判定だけでは歴史所属を決めない。

## 7. 既存ソフトの再利用判断
- Leafletは既存bashōアプリから変えず、任意のGeoJSONレイヤー・ラスタオーバーレイと凡例を追加する最小アダプターを後日設ける。
- MapLibre GL JSは源平側で検証。大容量のベクトルタイルや透明度変更が必要になった時だけ導入。CoreはLeaflet/MapLibreのクラスを返さない。
- Turf.js等は点包含・距離・重なり計算に採用候補。ただし点が多角形内にあること ≠ 1185年の歴史的所属確定。
- CODH / Geoshape / GeoLOD / GeoNLP: 地名とID・候補探索を再利用。個別情報の年代・権利確認は残る。
- IIIF Presentation/Image API: 画像のメタデータ・表示に活用候補。既存の未許諾画像を再ホストしない。
- 必須新規部分: 複数時間軸・証拠分類・公開ゲート・後世資料の転用警告・可通行性とゲーム速度の分離。

## 8. 依存方向と分担
- 共通層はアプリの \`app.js\` / \`HistoricalEvent\` / \`fatePull\` をimportしない。
- basho-atlas側: 既存 \`data/prototype-locations.json\` に対する **読み取り専用変換**のみ計画。フィールドを破壊変更しない。
- genpei側: \`site_id\` YS001〜YS008、\`historical_truth\`、\`person_ids\`、\`event_link\` を保持するアダプターを後日作る。原台帳は無変更。
- ChatGPT: 史料・契約・アーキテクチャ文書。Codex: スキーマと純粋関数テスト。Claude Code: 独立地図UI試作。人: 原資料・公開・再配布判定。
- 再配分時は作業範囲とコミット、衝突ファイルをチェックポイントに記す。並行編集は同じファイルを避ける。

## 9. 決定・保留
確定設計案: 六層分離、静的契約、未確定geometry許容、前後時代を区別、Core非UI依存、Leaflet現状維持。
保留: 最終ライブラリ配布先/公開設定/ライセンス、歴史復元海岸線の史料監査、各種画像の再利用、実際の歴史時代の可通行性。全国境界はMVP外。
