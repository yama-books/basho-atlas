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
- `tests/contracts.test.mjs`: POIキャンセル検査の既存アサーションの誤期待文字列を修正（アプリコードの変更なし）。
- `.github/workflows/historical-gis-contracts.yml`: Pull Request向けのNode22標準テストを導入。公開repoの標準runnerを使用。
- `data/historical-gis/historical-feature.schema.json`: 不明な参照日の `null` を許容（未知のものを取得済日に偽装しない）。
- `docs/HISTORICAL_GIS_CORE_MVP_20261018.md`: 呼出仕様と対応範囲。

## 実施した検証と未実施
1. 隔離環境 Node v22.16.0 でCore・Adapterのユニット30件を**実行して全件成功**。実際にGitHubへ保存したsourceは読み戻し、V8構文と関数の代表的な動作を確認。
2. GitHubコネクタ経由で **本物の** basho-atlas `data/prototype-locations.json` を取得し3→6Featureに変換。深川=武蔵国、武隈の松・松島=陸奥国はすべて `candidate`、`public`では出力しない。現代座標と旧国所属のgeometryは混同しない。
3. 同じく genpei-sandbox の **本物の** 8史跡台帳を読み取り、8Featureを生成。1件のみ現代代表座標、7件はgeometry=null。歴史的イベントの座標を生成しない。
4. 両台帳のsource IDsは衝突しない。実際に保存されたGeoJSON sampleおよび変換後の2カタログ（計3件）をJSON Schema主要構造・型の独立検査で照合、問題0件。**公式JSON Schema完全検証器による網羅的検証ではない**。
5. GitHubブランチ上の6変更ファイルを読み戻し、コード実行可能・実データ変換・ID名前空間・公開ゲート・テスト存在を11項目で照合、全件PASS。
6. **CI実行完了**: 2026-10-18 GitHub Actions [run 39077836169](https://github.com/yama-books/basho-atlas/actions/runs/39077836169) で Node22 の `npm run check` 成功。既存7 + 先行GIS9 + Core30 + 読取橋渡し3 = **49 PASS / 0 FAIL**。先行run 39077768572は48/49だったが、元の `tests/contracts.test.mjs` が実装にはない `controller.abort()` という文字列を期待したことが原因。既存 `app.js` が使う `state.poiAbort.abort()` とAbortController生成を検査するよう **テストのみ修正** し、再実行して全件成功。元のブラウザ動作を保証する実機テストではない。
7. **未実施**: Leaflet表示層/MapLibre表示層の実装、ブラウザQA、国境/海岸線史料監査、ライセンスの人手決裁。

## 今後の優先順
- **P0（達成）**: Draft [PR #1](https://github.com/yama-books/basho-atlas/pull/1) のNode22 GitHub Actionsで全49件成功。今後コード変更時はPRのチェック結果を再確認。
- **P1**: API・出典・監査ゲートを維持したまま、`adaptGenpeiYashimaRegistry` を原データへの非破壊な読み込みで受入れ。原台帳を書き換えない。
- **P2**: 屋島で史料の確認できる少数地点から、現代参考点と1185候補地の関係を人が評価。海岸線は根拠のある資料と利用条件が確認できるまでnull。
- **P3**: 独立した歴史GIS表示のLeafletアダプターを別PRで検証し、その後MapLibreアダプター。既存 `app.js` の即時置換はしない。

## 衝突回避
今回は `app.js`、`index.html`、`styles.css`、`data/prototype-locations.json`、既存の `docs/OLD_PROVINCES.md` と `docs/ROADMAP.md` を触らない。源平側に書込みなし。Claude Codeは将来の地図UI、Codexは機械判定可能なCore/テスト、ChatGPTは設計/監査と引継ぎ。資源による担当交替は許容し、同じファイルの同時変更は避ける。

## 2026-10-19 追補：旧国名エンジン別試作の統合
- **最新HANDOFF**: [2026-10-19 CODH旧国ID統合](HISTORICAL_GIS_HANDOFF_KYUKOKU_20261019.md)。[統合監査・採否表](HISTORICAL_GIS_KYUKOKU_INTEGRATION_AUDIT_20261019.md)。これらを前に読む。
- 追加: `src/historical-gis/codh-province-ids.mjs`、Bashoアダプターの任意注記、schema任意属性、CODH ID回帰12件。既存Coreは置換なし。
- GitHub Actions run [39195215371](https://github.com/yama-books/basho-atlas/actions/runs/39195215371) で **61件全件成功**。旧49件をすべて維持。
- 別セッションの独立ZIP実体と15件テスト本文は**このセッションで取得できず**。機能概要の照合と公式CODH IDの確認は完了、ファイル単位の比較は未完了。
- CI成功は学術的監査やライセンス承認とは別。幕末CC BY-NC国境ポリゴンを無断再配布しない。1689年の`P002`は幕末分割後の`P115`と区別し、1868年は年内の変化時点が不明なら保留。
