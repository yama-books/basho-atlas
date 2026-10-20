# Codex ローカル作業指示：旧国名Core・参照データ境界の統合 v1.0
策定 2026-10-20 JST / **本指示はGitHub正本。実行・完了を意味しない。**
共通指示：[OLDMAP_LOCAL_WORK_MASTER_20261020.md](OLDMAP_LOCAL_WORK_MASTER_20261020.md)
作業場所：`D:\dev\oldmap\core`
作業ブランチ：`work/oldmap-core-20261020`
子PRのbase：`feat/shared-hgis-core-20261018`（**mainは使わない**）
納品先：この子PR、`docs/OLDMAP_CODEX_RESULT_20261020.md`

## 0. 初動必須
1. `git status --short --branch`、`git remote -v`、`git merge-base HEAD origin/feat/shared-hgis-core-20261018`、`git rev-parse HEAD`で作業対象を確認。予想外の変更・別ブランチなら修正せず報告。
2. `docs/OLDMAP_LOCAL_WORK_MASTER_20261020.md`、`docs/HISTORICAL_GIS_KYUKOKU_MASTERPLAN_20261019.md`、`docs/HISTORICAL_GIS_INTEGRATION_FIRST_HANDOFF_20261019.md`、`docs/HISTORICAL_GIS_DATA_CONTRACT.md`を確認。
3. `src/historical-gis/core.mjs`、`atlas-service.mjs`、`province-index.mjs`、`codh-province-ids.mjs`、`adapters.mjs`、既存テスト・JSONを確認。`npm run check`を実行し、開始時のPASS数とSHAを記録。
4. 同時にClaude Codeが`D:\dev\oldmap\ui`を編集する。**`kyukoku/**`、`package.json`、`package-lock.json`、`.github/workflows/**`、`tests/e2e/**`の編集禁止**。親Draft PR #1やmainにも直接pushしない。

## 1. 今回の達成目標
**一つの検索・年代判定・現代地点の参照データが、UIから安全に利用できるCore APIとして完結すること**。ブラウザの見た目、全国史料の完全性、旧国境ポリゴンは範囲外。

### C1 P0：現行の契約を守り、UIとの接続を安定化
- 既存公開APIを保持：`parseTargetYear()`, `createProvinceAtlasService(catalog)`, `service.search({text,group})`, `service.getProvince({id,year})`。
- 現在の戻り値`status`、`record`、`relations`、`yearResult`、`province_id`、`geometry:null`の意味を**破壊的に変えない**。`getProvince`に不明なIDを渡してもクラッシュせず、年が無効なら古い判定にフォールバックせず`invalid_year`。
- 旧国IDと古地図K ID、国/郡/藩/現代住所を混同しない。陸奥`P002`と分割後`P115`は別。1868境界年を一意に切替えない。
- 既存のCoreの`resolveProvince`、`temporalFit`等を利用し、名称・年代の第二の実装を作らない。
- 実際に既存コードの欠陥を再現できた場合だけ拡張する。純粋に綺麗な抽象化のための大規模リファクタをしない。

### C2 P0：他アプリの現代参照地点を、堅牢な純関数で統合
現行`kyukoku/app.mjs`にある芭蕉3地点と屋島YS001点の直接読込・安全判定ロジックを、**UIから独立したテスト可能な参照データ正規化関数**として作る。推奨新設パス：
`src/historical-gis/atlas-reference-points.mjs`（名前を変更するなら文書に理由）。

機能要件：
- `data/prototype-locations.json`の`places`から名前・現代施設座標・精度・出典・旧国候補（ある場合）を抽出。JSの入力はオブジェクト、ネットワーク通信/DOMなし。
- `data/historical-gis/yashima-basho.sample.geojson`から`layer=modern_reference`かつ妥当なWGS84 Pointだけを読み、屋島以外の位置不明な7史跡等の`geometry:null`を0,0や地域中心に置き換えない。
- 緯度/経度の配列順はGeoJSONの`[lng,lat]`。範囲外・NaN・文字列・欠損座標を拒否し、件ごとの警告と採否理由を記録できる構造にする。
- `P010`/旧`P002`との相互参照は「`id_match_only`/candidate」であり、地点の1689年当時の実証所属には昇格させない。
- 出典URL・地点名は信用済みHTMLと見なさない。原データを変更しない。外部通信や大量新規POI取り込みはしない。
- 参照点4件の表示は現在の挙動を保ち、資料・位置不明は明示的に区別する。後続UI作業で使える変換APIと小さな呼出例を結果文書へ記載する。

※UI担当の今のPRは既存データ読み込みで進めてよい。**Core APIの追加をUI側へ強制しない**。監査後の親ブランチ統合で必要な箇所のみ差し替える。

### C3 P1：軽量な索引チェック
- CODH 88ID（P001–P070＋P100–P117）の欠落・重複・系列・既存の親子関係の検査を維持。
- 原表の別取得/簡易差分が数十分以内に実行できるなら、検証用スクリプトまたは機械的比較表を追加（自動取得には出典・取得方法・年月日を記録）。できなければ「未比較」のまま引き継ぐ。
- **88件すべての史料、読み、旧国境、1880年代以前の地方行政の網羅的監査はしない。** この作業は統合完成を止めない。

## 2. 代表テスト：数より意味
新設`tests/historical-gis-oldmap-core.test.mjs`等に、次を最低限含める（既存テストで十分なら重複は追加しない）。
- 1689 武蔵`P010`はID対応のみ、地点所属や国境を返さない。
- 1689 陸奥`P002`と1868 陸奥`transition_undetermined`、P115の古い年への誤適用防止。
- 1185 讃岐に確定旧国境を付けない。
- 無効・空年入力に対して明示的エラー。
- Basho3件＋屋島広域参照1件だけを変換し、位置不明Featureを落としても元JSONは不変。
- 不正座標、文字列座標、危険な参照URL、未承認の図形レイヤーの混入防止。
- 旧国名が同名で複数IDある場合に候補を失わない。

`npm run check`が失敗したら原因・変更・修正内容を記録し、元からの問題と軽々に断定しない。

## 3. 納品と完了判定
- 変更は`src/historical-gis/**`、`data/historical-gis/**`（必要なら）、`tests/historical-gis-oldmap-core*.test.mjs`、`docs/OLDMAP_CODEX_RESULT_20261020.md`に限定。
- **成果はコード、実行したテスト、利用方法、予防したユーザー影響**。過剰な抽象化や大量の根拠収集でなく、小さく堅牢な実装にする。
- `git diff --check`、`npm run check`がPASS。テスト件数、対象コマンド、結果と制約を結果文書に記録。
- 自分のbranchにcommitし、認証済みGitHubへpushしたうえで**Draft PR (base `feat/shared-hgis-core-20261018`)**を作成。権限/認証でPR作成不可なら最終SHAと`git log -1`、差分パスを渡す。
- PRを自分でマージしない。主要API・UI接続差分はChatGPTの監査を待つ。未承認の権利許可フラグを`approved`にしない。

## 4. Codexに与える起動プロンプト（そのまま使用）
> `D:\dev\oldmap\core` で、GitHub正本 `docs/OLDMAP_CODEX_WP_20261020.md` と `docs/OLDMAP_LOCAL_WORK_MASTER_20261020.md` を読み、現在のHEAD・作業状態を確認してからC1→C2→C3を実装してください。作業ブランチは `work/oldmap-core-20261020`、子Draft PRのbaseは `feat/shared-hgis-core-20261018`。UI/`kyukoku`、`package.json`、Basho本体、Genpei、紙媒体古地図には触れない。検索と年判定APIの互換性、Basho3＋屋島1の現代参照点変換、null座標/誤年代/権利ゲートを優先し、全件史料監査は実施しない。必ず`npm run check`とgit diffを検査し、`docs/OLDMAP_CODEX_RESULT_20261020.md`を残し、Draft PRで報告。コードの採否とマージは別のChatGPT監査セッションで判断します。
