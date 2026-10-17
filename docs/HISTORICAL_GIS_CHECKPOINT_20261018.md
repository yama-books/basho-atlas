# 共通歴史GIS Core 引継ぎチェックポイント（2026-10-18）
状態: `feat/shared-hgis-core-20261018` ブランチに独立Coreを実装。**mainと既存アプリのコードを変更せず、PRレビュー待ち**。このファイルは変更・テストの記録。

## 再開点
- 正本: `yama-books/basho-atlas`
- まず読む: [Core実装・導入手順](HISTORICAL_GIS_CORE_MVP_20261018.md)、[共有構造](HISTORICAL_GIS_SHARED_ARCHITECTURE.md)、[データ契約](HISTORICAL_GIS_DATA_CONTRACT.md)。
- 先行チェックポイント: [2026-10-17](HISTORICAL_GIS_CHECKPOINT_20261017.md)。
- 連携先: `yama-books/genpei-sandbox` の `data/places/YASHIMA_SITE_REGISTRY.json` は**読取りだけ**。
- 旧国境や中世海岸線の図形、新規独立repo、商用・再配布条件の決裁は未実施。

## 今回の変更ファイル（branchのみ）
- `src/historical-gis/core.mjs`: 検証可能な年代判定、公開ゲート、旧国候補、地名完全一致、bbox Point限定、資料時差、交通グラフ。
- `src/historical-gis/adapters.mjs`: 既存2アプリの独立IDを保持した読取変換。source IDsは `src:basho:*` / `src:genpei:*`。
- `tests/historical-gis-core.test.mjs`: 30件のユニットテスト。
- `tests/historical-gis-basho-readonly.test.mjs`: 現行 `data/prototype-locations.json` を読む追加3件。
- `data/historical-gis/historical-feature.schema.json`: 不明な参照日の `null` を許容（未知のものを取得済日に偽装しない）。
- `docs/HISTORICAL_GIS_CORE_MVP_20261018.md`: 呼出仕様と対応範囲。

## 実施した検証と未実施
1. 隔離環境 Node v22.16.0 でCore・Adapterのユニット30件を**実行して全件成功**。実際にGitHubへ保存したsourceは読み戻し、V8構文と関数の代表的な動作を確認。
2. GitHubコネクタ経由で **本物の** basho-atlas `data/prototype-locations.json` を取得し3→6Featureに変換。深川=武蔵国、武隈の松・松島=陸奥国はすべて `candidate`、`public`では出力しない。現代座標と旧国所属のgeometryは混同しない。
3. 同じく genpei-sandbox の **本物の** 8史跡台帳を読み取り、8Featureを生成。1件のみ現代代表座標、7件はgeometry=null。歴史的イベントの座標を生成しない。
4. 両台帳のsource IDsは衝突しない。実際に保存されたGeoJSON sampleおよび変換後の2カタログ（計3件）をJSON Schema主要構造・型の独立検査で照合、問題0件。**公式JSON Schema完全検証器による網羅的検証ではない**。
5. GitHubブランチ上の6変更ファイルを読み戻し、コード実行可能・実データ変換・ID名前空間・公開ゲート・テスト存在を11項目で照合、全件PASS。
6. **未実行**: リポジトリ実体の `npm test`。内訳は既存7 + 先行GIS9 + Core30 + 読取橋渡し3 = **49件**。元の環境からGitHub cloneがDNS解決不能のため、実際のリポジトリ全体テストの成功を主張しない。Node20+のcheckout上で実行する必要あり。
7. **未実施**: Leaflet表示層/MapLibre表示層の実装、ブラウザQA、国境/海岸線史料監査、ライセンスの人手決裁。

## 今後の優先順
- **P0**: PRでNode20+の `npm test` を実際に実行。全49件の成否を記録。失敗時は原因に対する小さな修正。
- **P1**: API・出典・監査ゲートを維持したまま、`adaptGenpeiYashimaRegistry` を原データへの非破壊な読み込みで受入れ。原台帳を書き換えない。
- **P2**: 屋島で史料の確認できる少数地点から、現代参考点と1185候補地の関係を人が評価。海岸線は根拠のある資料と利用条件が確認できるまでnull。
- **P3**: 独立した歴史GIS表示のLeafletアダプターを別PRで検証し、その後MapLibreアダプター。既存 `app.js` の即時置換はしない。

## 衝突回避
今回は `app.js`、`index.html`、`styles.css`、`data/prototype-locations.json`、既存の `docs/OLD_PROVINCES.md` と `docs/ROADMAP.md` を触らない。源平側に書込みなし。Claude Codeは将来の地図UI、Codexは機械判定可能なCore/テスト、ChatGPTは設計/監査と引継ぎ。資源による担当交替は許容し、同じファイルの同時変更は避ける。
