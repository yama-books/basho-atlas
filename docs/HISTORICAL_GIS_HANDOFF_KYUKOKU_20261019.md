# 2026-10-19 旧国名エンジン統合 HANDOFF
正本: `yama-books/basho-atlas`
PR: [Draft PR #1](https://github.com/yama-books/basho-atlas/pull/1)
作業ブランチ: `feat/shared-hgis-core-20261018`
今回の目的: **別セッション「旧国名エンジン v0.1.0-dev」成果の非破壊統合**。屋島/Leaflet新規試作は後回し。

## 今回の完了事項
1. GitHub正本の `src/historical-gis/core.mjs`、`adapters.mjs`、Schema、先行HANDOFF、旧国名ドキュメントとBasho3地点の実データを確認。
2. 別セッションからの説明を既存実装と機能比較。双方にある年代・地名候補・境界分離は**既存の実装を保持**。独立エンジンの重複移植や別repo化をしない。
3. CODH公式[国・地域ID](https://codh.rois.ac.jp/province/)で`P010=武蔵`、`P002=分割前の陸奥`、`P111–P115=分割後の国`を照合。Geoshape[旧国・旧郡境界](https://geoshape.ex.nii.ac.jp/kg/)の幕末期/CC BY-NC、CODH[利用規約](https://codh.rois.ac.jp/policy/)の素材別条件を照合。
4. `src/historical-gis/codh-province-ids.mjs` に「**1689年の名称とCODH ID**」を照合する最小相互参照だけを追加。1185は未監査、1868年陸奥は `transition_undetermined`、1869は未監査、`P115`を旧陸奥`P002`と同一視しない。
5. 既存 `adapters.mjs` のBasho旧国候補へ任意の`codh_province_id`、`codh_id_match_status`、`codh_id_source_url`を付与。元JSON、Coreの照会動作、過去の未承認ゲートは変えない。
6. 既存Schemaのオプション属性を3件増補。`tests/historical-gis-codh-integration.test.mjs` で12件の独自回帰テスト追加。
7. [採否・史料・ライセンスの統合監査表](HISTORICAL_GIS_KYUKOKU_INTEGRATION_AUDIT_20261019.md)に、採用/不採用/追加検証と比較の根拠範囲を記録。

## テスト・確認
- GitHub Actions [run #39195215371](https://github.com/yama-books/basho-atlas/actions/runs/39195215371): Node22 `npm run check` **61 PASS / 0 FAIL / 0 SKIP**。もとの49件 + 今回12件。
- 誤った確定化を避けるテスト: 1689`P002` vs 分割後`P115`、1868を保留、1185をCODH IDで自動帰属しない、現代点からの境界推定をしない、public未承認を返さない、Basho原データ不変。
- これはソフトウェア回帰検証の結果であり、1689年の全旧国境・1185年の歴史的地理の学術監査を済ませた意味ではない。

## 取得できなかった別セッションの成果
- 依頼者は `kyukoku-engine v0.1.0-dev` ZIPと資料、15テストを「添付」と記載したが、現在のセッションの添付一覧・Library・コンテナ上にはファイル本体が見つからなかった。
- 以前の会話情報からZIP名 `kyukoku-engine-v0.1.0-dev_2026-10-18.zip`、17ファイル、`docs/FEASIBILITY.md`/`ARCHITECTURE.md`/`ROADMAP.md`/`INTEGRATION_BASHO_ATLAS.md`/`HANDOFF.md`という名前は把握。**バイト実体やテスト本文は読んでいない**。
- したがって今回の12件を「別セッションのテストから移植した」とは主張しない。ZIP入手後、15件を粒度別に既存61件と対照し、重複は捨て、追加価値のあるものだけ統合する。**ZIP未取得が唯一の重要な差分監査ブロッカー**。

## 変更していないもの
- `app.js`、`index.html`、`styles.css`、`data/prototype-locations.json`、`docs/OLD_PROVINCES.md`。
- `genpei-sandbox`全体。
- 旧国境polygon、現代線から作った推定境界、CODH/Geoshapeの原データ複製、アプリ公開判定。
- `main`へのマージ、PRのDraft解除。

## 次の再開指示
1. v0.1.0-dev ZIP本体をこの会話または別途アクセスできる共有場所へ添付し、ソースと15件テストを検査。
2. 差分が既存Coreと衝突する場合は、既存APIと契約を正本とした移行・非採用根拠を追記。
3. ZIP監査が済み、PR CIが緑なら旧国名統合フェーズの採否を確定。単一の `basho-atlas` 正本を維持。
4. その後、2026-10-18の共通GIS計画に戻り、屋島史料・独立Leafletページの作業再開を検討。
