# Oldmap UI担当（Claude Code）作業結果 2026-10-20
文書状態: **作業者の自己記録。採否・マージはChatGPT監査セッションが判断する。**
指示正本: [OLDMAP_CLAUDE_WP_20261020.md](OLDMAP_CLAUDE_WP_20261020.md) / [OLDMAP_LOCAL_WORK_MASTER_20261020.md](OLDMAP_LOCAL_WORK_MASTER_20261020.md)

## 0. 最小報告（マスター §6 形式）
```text
担当: Claude Code（UI・ブラウザE2E）
作業フォルダ: D:\dev\oldmap\ui（git worktree。本作業で新規作成）
baseブランチ/開始SHA: feat/shared-hgis-core-20261018 / 56fd8a12843baeaa524cf103e4a5a67a84db4f5d
作業ブランチ/最終SHA: work/oldmap-ui-20261020 / Draft子PRのhead（コミット後に確定）
子PR URL: Draft PR（base=feat/shared-hgis-core-20261018）。URLは監査報告に記載
変更ファイル: kyukoku/index.html, kyukoku/app.mjs, kyukoku/styles.css, kyukoku/QA.md,
  package.json, package-lock.json, playwright.config.mjs, tests/e2e/**, tests/tools/serve.mjs,
  .github/workflows/oldmap-ui-e2e.yml, docs/OLDMAP_CLAUDE_RESULT_20261020.md
実装したユーザー体験: §2
npm run check の結果: 開始時 102/102 PASS、終了時 102/102 PASS（exit 0）
UI担当のE2E/ブラウザ検証結果: §4（Playwright 38 passed / 19 skipped（設計上の対象外）/ 0 failed、3回連続 exit 0）
残る必須問題: なし（P0として把握しているものはない）。後続論点は §6
未確認・権利・史料上の注意: iPhone実機Safari未実施。§5
次回の再開位置: §7
```
- 編集していないもの: `src/historical-gis/**`、`data/**`、既存Basho `app.js`/`index.html`/`styles.css`、Genpei、LICENSE、既存 `tests/*.test.mjs`、main、PR #1 のbase。
- 使用したCore API: `createProvinceAtlasService(catalog)`、`service.search`、`service.getProvince`、`parseTargetYear`、（既存のまま）`lookupCodhProvinceId`。Codex側の新APIには依存していない。

## 1. 開始時の確認
- `D:\dev\oldmap` には `repo`（feat/shared-hgis-core-20261018 @56fd8a1）と `core`（Codex、work/oldmap-core-20261020）のみで、`ui` は未作成。マスター §2 の手順どおり `git -C repo worktree add -b work/oldmap-ui-20261020 ..\ui origin/feat/shared-hgis-core-20261018` で作成（`git fetch` 後の親最新=56fd8a1）。remote: `https://github.com/yama-books/basho-atlas.git`。
- Node v24.19.0 / npm 11.17.0（Windows 11）。開始時 `npm run check`: tests 102 / pass 102 / fail 0。

## 2. 変更点と画面のBefore/After
### U1 主要導線
| 課題（Before） | 対応（After） |
|---|---|
| 1280pxでは年代判定が地図の下（ページ上端から約659px）。375pxでは国名を選んでも判定は約1142px下で、選んだ結果が見えない | **3カラム（≥1181px）：①国名を選ぶ ②年と判定 ③現代の地図（参考）**。861–1180pxは①｜②の下に③。≤860pxは①→②→③の順。スマホで結果を選ぶと②へ自動スクロール（フォーカスは結果ボタンに残す）、②末尾に「↑ 国名の検索に戻る」 |
| 初期状態で武蔵P010が暗黙に選択済み。一覧の10番目なので見えず、何が選択中か不明 | 初期は**未選択**（「国名を選んでください」）。選択中の行に「選択中」ラベル＋左罫線（色以外の手がかり） |
| 判定文に対象年が出ず、年を変えたときに古い判定と見分けにくい | 判定文の先頭に「**1689年：**」等を明示。無効年は「**年が無効：**」 |
| 無効年でも「国境形状・確認済み歴史位置は未収録」と表示（理由が誤り） | 無効年は「年の入力が無効なため関連付けを停止」。史料・形状の不在とは別の文言 |
| 1185讃岐で「描けない」ことが読み取りにくい | 「地図に描けること」欄：「この国・年代の国境形状や確認済みの歴史上の位置は収録していないため、地図には何も描きません。推測した国境線や代表点も描きません。」 |
| 典拠が判定から離れている | 判定欄に「典拠を確認 ↓」→ `#sources`。CODHデータセット名と確認日（索引JSONの `source.checked_on`）を表示 |
| P002とP115の見出しが同じ「陸奥国」 | P115等は「陸奥国（明治の分割後）」 |
| 状態バッジが同系色の緑で「確定」に見えうる | ⓘ ID対応のみ（青灰）／△ 史料未監査・境界年保留・時代対象外・年月日未監査（黄土）／✕ 年入力エラー・索引なし（赤）。記号＋文字で区別し色だけに依存しない |
| 見出し「地図で参照点を確認」 | 「現代の地図（参考）」。凡例に「選んだ国名に索引上関連する現代参照点（1689年のみ・大きい点）」を追加 |
| 「関連する現代参照点を見る」で地図が動くだけ | 該当1点ならポップアップ（「現代の参照地点。歴史的な事件や旧国境の位置を示しません。」）も開く。「全国へ戻る」でポップアップを閉じて全国表示 |

### 異常系（U1-6 / U2）
| 状態 | Before | After |
|---|---|---|
| 索引JSON取得失敗 | 「索引の読み込みに失敗しました。HTTPサーバー経由で開いてください。」のみ、再試行不可 | 「**通信エラー**：国名索引を読み込めませんでした。検索と年代判定はできません。」＋「索引を再読込」ボタン。0件表示（「一致する国名がありません（索引は読み込み済み）」）と文言を分離。判定欄は「索引なし」。典拠リンクと地図は利用可 |
| Leaflet（CDN）失敗 | フォールバック文のみ。「全国へ戻る」等は押せるが無反応 | フォールバック＋「地図を再読込」（同じSRI付きでLeafletを再取得→成功すれば地図を初期化）。地図ボタンは無効化。凡例は「地図を表示できないため参照点は描画していません（4件）」 |
| OSMタイル失敗 | 警告＋再読込（失敗タイルごとに再表示） | 1回の読み込み試行につき**1度だけ**警告。文言を「通信エラー：背景地図（OpenStreetMap）の一部を取得できません」とし、史料・形状の不在（判定欄）と別の場所・別の理由で表示 |
| 参照点JSON失敗 | 全失敗時のみ「参照点データ取得失敗」 | 全失敗／一部失敗を区別して凡例に表示。判定には影響しないことを明記 |

### U2 アクセシビリティ・頑健性（実測、Chromium、陸奥P002・1868選択状態）
| 項目 | Before | After |
|---|---|---|
| 年プリセットボタン高さ | 36px（320px幅では26px） | 44px |
| 区分切替／関連IDボタン／地図ボタン | 33 / 32 / 31–34px | 40 / 40 / 40px |
| 検索欄・年入力の文字サイズ | 14px（iOS Safariはフォーカス時に自動ズームする） | 16px |
| コントラスト（.legal-note / footer / .eyebrow / .choice-desc / 凡例） | 3.86 / 3.58 / 4.13 / 4.22 / 4.06 | 5.80 / 5.36 / 5.18 / 5.35 / 6.32 |
| 横スクロール（320/375/390/768/1280px） | なし | なし（E2Eで常時検査） |
- キーボード：検索欄でEnter/↓→最初の結果、結果内で↑↓移動、先頭で↑→検索欄。Enter/Spaceで選択してもフォーカスは結果ボタンに残る（`aria-current` を差し替えるだけで再描画しない既存方針を維持）。IME変換確定のEnterでは移動しない（`isComposing`）。
- 読み上げ：`#result-status` は350ms、選択・年変更の要約（例「武蔵国、1689年：ID対応のみ」）は600msのデバウンス付き `aria-live`。「1689」を1文字ずつ打っても読み上げは1回（E2Eで計測）。
- `innerHTML` 不使用を維持。外部リンクは全て `target=_blank` + `rel="noopener noreferrer"`（Leaflet既定のOSM帰属リンクのみ `noopener`）。データ由来URLはHTTPSのみリンク化（既存の`safeSourceLink`）。

## 3. 地図・史料上の不変条件（変更していない）
- 描画するのは現代参照点4件の円マーカーのみ。`L.polygon`/`L.geoJSON`/`L.polyline` 不使用。1185年の讃岐で追加図形が無いことをE2Eで確認（パスは4件の円弧のみ）。
- 国名との強調は `year===1689` かつCoreの `lookupCodhProvinceId` が `id_match_only` の点だけ（既存方針）。1868 P002 は `transition_undetermined` のまま、P115を1689へ適用しない（`not_applicable_to_pre_reorganization`）。
- Leafletはテスト用にnpmの `leaflet@1.9.4`（BSD-2-Clause）をdevDependencyとして使用。本番ページは従来どおりunpkg＋SRI。地図画像・境界データは追加していない。

## 4. ブラウザ検証
### 4.1 Playwright E2E（自動・実ブラウザのクリック/入力）
- 環境: Windows 11 / Node v24.19.0 / `@playwright/test` 1.62.1 / Chromium 151.0.7922.34 / WebKit 26.5（Playwright同梱ビルド。iPhone 13 mini相当375×812の**模擬**）。
- コマンド: `npm run test:e2e`（= `playwright test`）。サーバーは `tests/tools/serve.mjs` が127.0.0.1:4173にbindし、`kyukoku/ src/ data/ docs/` のみ配信（node_modules・.gitは配信しない）。
- ネットワーク: unpkgのLeafletはローカルnpmの同一ファイルで応答（ページのSRI検証は有効）、OSMタイルは1×1 PNG、それ以外の外部リクエストはブロック。**OSM・CDNへの実アクセスなし**。
- 結果（3回連続、すべて exit 0）: **38 passed / 19 skipped / 0 failed**（約19–24秒）。skipは幅スイープ・キーボード等を `desktop-chromium` の1プロジェクトに限定しているための設計上のもの。

| プロジェクト | 実行 | 内容 |
|---|---|---|
| desktop-chromium 1280×900 | 19 | フロー1～6d（9件）＋キーボード、読み上げ回数、幅320/375/390/768/1280の横スクロール・はみ出し・タップ≥40px、コントラスト≥4.5、注入耐性 |
| mobile-chromium-390（Pixel 7、touch） | 10 | フロー9件＋スマホ導線（tapで選択→判定が画面内→検索に戻る→参照点へ） |
| webkit-iphone-375 | 10 | 同上（WebKitはWindows版にtouchエミュレーションが無いためclick） |

- フローと対応（WP §3の必須6種を含む）: 1 武蔵→P010→1689→典拠 / 2 陸奥P002・P115別候補→1868保留→P115を1689に適用しない / 3 讃岐1185・描画しない / 4 空欄・-1・10000・1.5・0→判定破棄→1689で復帰 / 5 参照点OFF/ON・関連点へ移動・全国へ戻る / 6a 索引JSON失敗→再試行 / 6b Leaflet失敗→再試行 / 6c タイル失敗→警告1回→再読込 / 6d 参照点JSON失敗。
- テストが空振りしないことの確認: `kyukoku/` の3ファイルを一時的に親ブランチ版へ戻して desktop-chromium を実行 → **16 failed / 1 passed**（期待どおり失敗。文言・ID追加に起因する失敗も含むため、各失敗が旧UIの不具合であるとは主張しない）。確認後に作業版へ復元。
- 途中で見つけて直したテスト側の不具合: `devices['iPhone 13 mini']` を展開しても当初はChromiumで実行されていた（`browserName` 未指定）。`browserName:'webkit'` を明示し、テスト内でエンジン名をアサートするようにした。

### 4.2 手動確認（Claude Desktopの内蔵ブラウザ、Chromium 152、モックなし）
- `npm run serve:kyukoku` → `http://127.0.0.1:4173/kyukoku/`。**実際のunpkg CDN（SRI一致）と実OSMタイル**で読込（数枚のタイル取得のみ）。
- 1280×720: 検索欄に「武蔵」→Enter→Enter → フォーカスがP010に残り「ID対応のみ」「1689年：…立証ではありません」。「関連する現代参照点を地図で見る」→深川・芭蕉記念館のポップアップ、「全国へ戻る」でポップアップが閉じる。タイル警告なし。
- 375×812（ビューポート模擬）: 「さぬき」→P044を選択→判定欄へ自動スクロール（「△ 史料未監査」「地図に描けること」）→1185で「1185年：…確認していません」、マーカー4件のみ、横スクロール0→「↑ 国名の検索に戻る」で一覧先頭へ、P044にフォーカス復帰。

### 4.3 スクリーンショット（最小3枚、`tests/e2e/evidence/`）
- `pc-1280-mutsu-1868.png`（PC、陸奥P002・1868「境界年・保留」）
- `phone-375-musashi-1689.png`（375px、武蔵選択後に判定欄へ移動した状態）
- `phone-375-leaflet-failure.png`（375px、Leaflet失敗：フォールバックと再読込ボタン、検索・判定は継続）

## 5. 未確認・注意
- **iPhone実機Safari：未実施**。WebKit 375pxはPlaywrightの模擬で、ソフトキーボード表示中の挙動・実タップ・セーフエリアは確認していない。QA.md の手順で実機確認が必要。
- Edge実機・Firefox：未実施（Chromium系はPlaywright Chromiumと内蔵ブラウザで確認）。
- スクリーンリーダー実機（VoiceOver/NVDA）：未実施。`aria-live` の回数はDOM変化の計測のみ。
- 画面拡大200%、OSのダークモード、「視差効果を減らす」：未計測（スタイルは `color-scheme:light` 固定、トランジションは `prefers-reduced-motion:no-preference` 時のみ）。
- 史料・権利: 新規の史料・境界・画像は追加していない。CODH/Geoshapeの利用条件は従来どおり `pending_human`。

## 6. 今後の接続論点（統合フェーズ向け）
- Core子PR（work/oldmap-core-20261020）の新API（現代参照点の正規化）が受け入れられたら、`loadReferences()` の正規化ロジックをCore関数へ置き換えるのが自然（UI側の小差分で可能）。現状は親ブランチのAPIのみ使用。
- リポジトリに `.gitignore` が無い。`node_modules/`・`test-results/` は本PRでコミットしていないが、所有範囲外のため追加していない。統合時に追加を推奨。
- CI: `.github/workflows/oldmap-ui-e2e.yml` は `kyukoku/**` 等の変更時と手動起動のみ、Chromium 2プロジェクトのみ、10分上限。既存 `historical-gis-contracts.yml`（`npm run check`）は変更していない（`npm ci` 不要のまま）。
- 選択状態のURL共有（`#P010@1689` 等）は未実装（機能を増やさない方針）。

## 7. 再開位置
`D:\dev\oldmap\ui`（work/oldmap-ui-20261020）。`npm ci` → `npm run check` → `npm run test:e2e`。監査指摘があればこのブランチに追加コミットし、Core受入後は最新親ブランチを取り込んでE2Eを再実行する。
