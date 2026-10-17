# Historical GIS Data Contract v0.1 (draft-only)
更新: 2026-10-17 / 消費者: basho-atlas, genpei-sandbox, 将来のkyukoku-engine
規範: [共通アーキテクチャ](HISTORICAL_GIS_SHARED_ARCHITECTURE.md)・[データソース](HISTORICAL_GEO_DATA_SOURCES.md)。実行例は [サンプルJSON](../data/historical-gis/yashima-basho.sample.geojson)・[JSON Schema](../data/historical-gis/historical-feature.schema.json)。

## 1. ファイル単位
GeoJSON `FeatureCollection` を基本とし、トップレベルの拡張メンバー `schema_version`、`dataset_status`、`sources` を追加する。各 `Feature` は `geometry=null` を許可。GeoJSON `coordinates` は**[longitude,latitude]** (WGS84、EPSG:4326の概念) 。測地参照不明の歴史図版座標はGeoJSON geometryへ変換せず、画像専用メタデータとして保持。各Featureに原本レコードのstable-IDを紐付ける。

### 必須Feature properties
- `feature_id`: プロジェクト間で衝突しない `hgis:...` 安定ID。変更時は旧IDをalias/redirect扱い。
- `layer`: `historical_map_image | reconstructed_geography | historical_toponym | historical_activity | modern_reference | transport`。出典/不確実性は横断メタデータ。
- `feature_type`: `site | region | coastline | water | name | province_membership | route | network_node | map_image | other`。
- `name`, `reading`(nullable), `aliases`(array)。
- `valid_time`（歴史上の存在期、`start_year/end_year` はnullable）、`attested_time`（資料に現れる年代）、`source_created_time`（典拠の作製年）、`geometry_observed_time`（図形基準年）。各項目は別。年内の境目が不明なら保留、境界年だけから即時の所属変化を推定しない。
- `position_quality`: `verified_modern_site | representative_approximate | inferred_point | inferred_area | locality_only | unknown`。位置未特定ではgeometry=null。
- `evidence_kind`: `contemporary_document | later_document | gunki | oral_tradition | scholarly_reconstruction | municipal_description | modern_registry | synthetic_contract_fixture`。
- `source_ids`: 登録済み出典を参照。空配列には必ず `evidence_gap` を記す。
- `review_status`: `pending_human | human_approved | rejected` と、`public_use`: `draft_only | approved_for_app`。
- `rights`: `license_status`=`unverified|cleared|restricted`、`license_expression`、`attribution`、`redistribution_allowed`（nullも可）。各データソースの独自条件を保持。
- `source_feature_refs`: `{repository, record_id, relation}` の配列。既存 genpei `site_id`、basho `places.id` と紐付ける。
- `proposed_by`, `historical_warning`（null可）。

Source entries: `source_id`, `title`, `url`, `source_kind`, `license_status`, `license_expression`, `accessed_on`。引用対象とその公開可否は別判定。

## 2. 「期間」の契約
- 年は正整数として西暦年を使う（MVPは1185/1689/近代）。和暦日付・ユリウス/グレゴリオ暦は将来の `calendar` / `date_precision` に外部で保持し、西暦の年月日に無理に変換しない。
- `start_year=null` / `end_year=null` は**未知**を表し、紀元前から永遠まで存在した意味ではない。両方がある場合はstart<=end。フィルタでは片側不明を即一致にせず `indeterminate` と返す。
- `attested_time` は「この範囲の全期間の存続証拠」ではない。`source_created_time` と区別する。
- `target_year` が適合しても `anachronism_warning` がある後世形状は `historical_reconstruction_verified` にしない。
- 同一地点を複数の候補領域に割り付けた場合、`claim_id` ごとに双方を保持し、境界・複数候補・不明を `ambiguous|unknown` として返す。国郡と藩領、現代都道府県は別 `administrative_type`。

## 3. サンプルファイルの意味
`data/historical-gis/yashima-basho.sample.geojson` は構造テスト用のドラフト（not for verified teaching）。屋島の現代代表点以外の歴史事象はgeometry=null。1185年屋島、与一の伝承、1689年深川旧国名と現代参照点の区別を例示。**古地図画像や中世海岸線の実図形は含まない**。

## 4. 別アプリの読み込み
JavaScript:
```js
const response = await fetch("./data/historical-gis/yashima-basho.sample.geojson");
const catalog = await response.json();
const eligible = catalog.features.filter(f =>
  f.properties.review_status === "human_approved" &&
  f.properties.public_use === "approved_for_app" &&
  f.properties.rights.license_status === "cleared" &&
  f.geometry !== null
);
// 現在のfixtureは全件 pending_human / draft_only のため eligible は0件。
```
これは**文法例**であり、本アプリにloaderを追加したのではない。JSONを別リポジトリにコピーする場合、サンプル自体も、出典画像や参照元の配布許諾まで通過したと誤解しない。

### 将来の関数（インターフェース案）
- `searchNames({text,year,bbox}) -> NameCandidate[]`
- `resolveProvince({placeId|coordinates,year}) -> {status:'resolved'|'ambiguous'|'unknown',candidates,evidence}`
- `listLayers({year,bbox,licensePolicy}) -> LayerDescriptor[]`
- `getFeature(id) -> Feature|null`
- `selectGeometry({featureId,year}) -> {geometry,sourceTime,uncertainty,warnings}`
- `getTransportGraph({year,bbox}) -> {nodes,edges,unresolvedEdges}`
可視化は `LeafletAdapter.render(layer)` 等を別パッケージに置く。画像はIIIF/ジオレファレンスメタデータを別JSONとしてリンクし、GeoJSONポリゴンに偽装しない。

## 5. 非互換変更と出所管理
- `schema_version`: v0.1 は試験版。追加は互換、必須キー削除・値の意味変更はmajorを上げ、migration記録を必須にする。
- 各ファイルに `data_version` / `built_at` / `source_commit` を将来付与できる。ゲームのRunManifestには採用した正確なデータバージョンを保存。
- 機械検査: source参照整合、ID一意性、座標順、年代start<=end、null位置、史料帰属、draft公開ゲート、実世界の可通行性とゲームコストの分離。
- 元の8件台帳は変更しない。出典確認・学術承認前に `approved_for_app` へ自動昇格させない。
