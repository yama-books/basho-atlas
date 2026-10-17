# Historical GIS 引継ぎチェックポイント
記録日: 2026-10-17
対象: yama-books/basho-atlas の共通歴史地理基盤検討。連携先 yama-books/genpei-sandbox は**読取りのみ**。

## 今回の完了内容
- 既存 basho-atlas: Leaflet1.9.4/OSM + 1689旧国名ラベル + 現代3点 + 文学解説タブ + OpenPOI。年代ごとの歴史地理描画、古地図画像・補正、歴史交通ネットワークは未実装。
- genpei-sandbox: 既存屋島史跡8件 (YS001-YS008) 参照。現代代表点はYS001のみ、ほか7件は未測位。台帳への更新なし。
- 構造を6分離 (古地図画像 / 歴史地理復元 / 地名 / 活動 / 現代 / 典拠・不確実性)。原則は時代適合と公開権利と位置の独立。
- 調査の主な一次配布元: CODH歴史GIS、CODH江戸末期海岸線/街道/宿場 (CC BY 4.0)、Geoshape旧国旧郡 (CC BY-NC)、Geoshape歴史地名、GSI、NDL、国土数値情報、高松市と奈良文化財研究所。詳細・未確定は DATA_SOURCES を参照。
- 新設5文書、バージョン付きdraft GeoJSON 4 features (1185 2件/1689 1件/現代1件)、試作JSON Schema、Node内蔵test runner用テスト9件。

## 正本ファイル
1. [共通基盤アーキテクチャ](HISTORICAL_GIS_SHARED_ARCHITECTURE.md)
2. [地理データと権利比較](HISTORICAL_GEO_DATA_SOURCES.md)
3. [屋島1185実証計画](MEDIEVAL_YASHIMA_DATA_PLAN.md)
4. [実装ロードマップ](HISTORICAL_GIS_ROADMAP.md)
5. [データ契約](HISTORICAL_GIS_DATA_CONTRACT.md)
6. [GeoJSONサンプル](../data/historical-gis/yashima-basho.sample.geojson)
7. [JSON Schema](../data/historical-gis/historical-feature.schema.json)
8. [契約回帰テスト](../tests/historical-gis-contract.test.mjs)

## 確認した結果（2026-10-17）
- GitHub書込後に**8新規ファイルをGitHub APIから読み戻し**。5文書の見出し、スキーマ・サンプルJSON構文、ID一意、ソース参照、4時系列項目、現代代表点座標、歴史図形null、1185/1689分離、伝承区分、未承認ゲート、9テストの存在について**13項目の静的・構造チェックPASS**。
- **Nodeの `node --test` / `npm test` は未実行**（この実行環境ではGitHubリポジトリをコンテナへcloneできず、git ls-remoteがDNS解決失敗）。したがってテスト9件の「実際のランナーPASS」は未主張。
- 既存 `app.js`, `index.html`, `styles.css`, `data/prototype-locations.json`, `docs/OLD_PROVINCES.md`, `docs/ROADMAP.md` は**今回変更していない**。genpeiの資料も変更なし。
- 元の史跡座標と歴史的イベント位置は別。サンプルの「公開済みファイル」と公開教材採用 (`approved_for_app`) は別。

## 次の受入手順
1. ローカル/CIで `npm test` を実行。追加テスト `tests/historical-gis-contract.test.mjs` の9件と既存 `tests/contracts.test.mjs` の7件を確認し、失敗なら競合範囲を特定。
2. JSON Schemaの検証器（Ajv等）でfixtureを検証し、必須フィールドと追加属性、FeatureCollection拡張を確認。将来必要なら `date_precision`, `candidate_claims` と `metadata` を明示的にスキーマ化。
3. 実際の `1185` 屋島地形は、研究・現地史料に当たってから初めてジオメトリ化。後世地図の島形を直結しない。
4. 既存bashō P1/P2/P3 を優先し、共通GISは別コンポーネントとして検証。Leafletを捨てず、MapLibreは別adapter。共通パッケージの新規リポジトリ・公開条件・ライセンスは人の承認待ち。
5. 人が配布・史料監査・正式公開を承認するまでは、`pending_human` / `draft_only` / `license_status:unverified` を維持。

## 作業分担・並列更新
ChatGPT=契約/監査、Codex=型と純粋関数・検査、Claude Code=後続の独立した地図ビュー。共通データと各アプリ本体を別ファイルにし、既存ソースへの変更は独立PRで実施。責任者変更時には最新commitと未完了ゲートをここに追記。作業の承継時にこのチェックポイントを先に読む。
