# Claude Code ローカル作業指示：旧国名アトラスUI・E2Eの実用品質 v1.0
策定 2026-10-20 JST / **本指示はGitHub正本。実行・完了を意味しない。**
共通指示：[OLDMAP_LOCAL_WORK_MASTER_20261020.md](OLDMAP_LOCAL_WORK_MASTER_20261020.md)
作業場所：`D:\dev\oldmap\ui`
作業ブランチ：`work/oldmap-ui-20261020`
子PRのbase：`feat/shared-hgis-core-20261018`（main禁止）
納品先：この子PR、`docs/OLDMAP_CLAUDE_RESULT_20261020.md`

## 0. 開始時の準備・担当制限
- `git status --short --branch`, `git rev-parse HEAD`, `git remote -v` でworktreeと親branchを確認し、`npm run check` の開始時結果を記録。
- [共通マスタープラン](HISTORICAL_GIS_KYUKOKU_MASTERPLAN_20261019.md)、[旧国名UIの仕様](HISTORICAL_GIS_PROVINCE_ATLAS_20261019.md)、[実機12場面QA](../kyukoku/QA.md)、現在の`kyukoku/index.html`, `app.mjs`, `styles.css`を読む。
- CodexがCore (`src/historical-gis/**`)を同時編集している。**UI担当はそのフォルダ、`data/historical-gis/**`、既存Basho`app.js`/`index.html`/`styles.css`とGenpei原本に変更を加えない**。
- UIは現行の`createProvinceAtlasService(catalog)`、`service.search`、`service.getProvince`、`parseTargetYear`を使用。Codexが追加予定のAPIへの依存は統合監査後まで延期。

## 1. 最優先：利用者が迷わない一連の操作（U1）
次の6つのタスクを、PCのChrome/Edgeと幅375/390pxのスマホ表示で手順通り操作可能にする。
1. 「武蔵」で検索 → P010 を選ぶ → 1689年のID対応のみの理由を確認 → 典拠へ移動。
2. 「陸奥」で検索 → P002とP115が**別候補**で見える → 1868年のP002は`transition_undetermined`、P115も1689へ自動適用しない。
3. 1185年「讃岐」→史料未監査/国境形状未収録 →「描画できないこと」を理解できる。
4. 年入力を空欄・負数・10000・小数にする → 古い年の判定を残さない → 1689に戻すと復帰。
5. 現代参照点のON/OFF、関連参照点へ移動、全国へ戻る。**現代点と過去の位置を取り違えない**。
6. データ取得失敗・Leafletの読込失敗・OpenStreetMapタイルエラー → 理由と操作可能な代替部分が見える → 必要なら再試行できる。

- ブラウザの見た目が綺麗でも情報誤認が起きるラベルは修正。例：「1689年の歴史的所属が確定した」ような強調色や説明にしない。
- 初期表示で「国名を選べる場所」「年が変えられる場所」「地図が現代参考図であること」が直感的にわかるよう、見出しと配置を整理する。空状態・読み込み中・検索0件と通信エラーを区別。
- レイアウトの大改造が必要ならUI側だけで進めてよいが、機能数を無理に増やさず主要導線を優先する。装飾・動画・地図上の歴史推定線は追加しない。

## 2. アクセシビリティと頑健性（U2）
- iPhoneに近いビューポートで検索欄が地図に埋もれず、ソフトキーボード表示中も結果を選べる。検索後の選択状態、詳細への移動、戻る操作を明瞭にする。
- 320/375/390/768/1280pxで横スクロール・重なり・操作不能を防ぐ。小さなタップ領域や弱いコントラストを実測して改善。色だけに依存する判定表示を避ける。
- Tab/Shift+Tab/Enter/Space、フォーカス可視化、検索結果の`aria-current`、`aria-live`の過剰読み上げ、年代入力の誤値とメッセージの関連を確認。
- 外部データの名称/典拠を`innerHTML`で描画しない。URLの扱いはHTTPSを基本にし、危険なプロトコルをリンク化しない。出典をクリックすると別タブの場合`rel=noopener noreferrer`。
- タイルエラーを頻繁に連続通知する場合は一度の警告に集約。ネットワークエラーと「史料がなく地図形状がない」状態を**異なる理由**として表示する。
- 地図が使えない場合でも、検索・年代判定・出典へアクセスできることを実装上とテスト上で確認。

## 3. 本当にブラウザを動かすE2E（U3）
**`tests/*.test.mjs`のソース文字列照合は既に存在するので、同じテストを増やすのでなく、ブラウザの実際のクリック・入力・描画を検証する。**
- Playwright推奨（`@playwright/test`が未導入なら最小限のdevDependencyを導入）。所有範囲に限り`package.json`、ロックファイル、`playwright.config.mjs`、`tests/e2e/**`、必要なテスト用ローカルHTTPサーバーを作ってよい。
- テスト用HTTPサーバーはルートrepoから起動し、`/kyukoku/`と`/data/`と`/src/`を正しく返す。外部公開ではなく127.0.0.1にbindする。認証情報・個人情報を記録しない。
- テストは少なくとも武蔵→1689・陸奥同名→1868・讃岐1185・無効年→復帰・地図ON/OFF・CDNまたはJSONの失敗の6つ。必要に応じてWebKit（Playwright上の模擬）を試す。
- GitHub Actionsで常時ブラウザを起動するとCI使用量が増える。**まずローカルE2Eを安定化し、CIはpath限定か手動起動の軽量な別ワークフローに分ける**。既存`npm run check`を壊さない。`npm run test:e2e`などの明確な起動スクリプトを提供する。
- OSMタイルおよび外部CDNの大規模取得を行わない。ブラウザテストではネットワークをモック、必要ならLeafletのみローカルの検証用アセットを使う。ライセンスに従う。
- テスト成功だけで「実機iPhone確認済み」と言わない。iPhone実機の未検証/実施結果を独立した欄に記載。
- 外部依存が取得できない環境なら、原因/代替の手動操作手順・PCブラウザ結果を記録し、E2E成功を捏造しない。

## 4. 対象ファイル・非対象ファイル
変更可：
`kyukoku/index.html`、`kyukoku/styles.css`、`kyukoku/app.mjs`、`kyukoku/QA.md`、`tests/e2e/**`、`tests/tools/**`（新規E2E専用）、`playwright.config.*`、`package.json`、`package-lock.json`、必要なら`.github/workflows/oldmap-ui-e2e.yml`、`docs/OLDMAP_CLAUDE_RESULT_20261020.md`。
変更禁止：
`src/historical-gis/**`、`data/historical-gis/**`、`data/prototype-locations.json`、既存Basho本体とGenpei本体、LICENSE/データ使用許諾、main、Draft PR #1のbase。

Nodeのユニットテストを更新する必要がある場合は**`tests/historical-gis-oldmap-ui*.test.mjs`の新規パスのみ**。Codexが作る`tests/historical-gis-oldmap-core*.test.mjs`には触れない。

## 5. 納品の受入条件
- `npm run check`がPASS。ブラウザE2Eは実際に動いたケース数・ブラウザ・終了コードを報告。
- 原地図が未収録・通信不能・年未監査でも、検索・出典表示・理由説明が破綻しない。
- ユーザーに有益な画面改善を優先。追加UI全てをテストするための巨大な仕組みや、資料の完全収集へ脱線しない。
- ローカルで確認したスクリーンショット（PC/375px/失敗状態）は**必要な最小枚数**を添え、巨大な画像・動画・`node_modules`やブラウザ実行ファイルはGitにコミットしない。
- `docs/OLDMAP_CLAUDE_RESULT_20261020.md`に変更箇所、画面のBefore/After、QA実測、E2E、未確認、今後の接続論点を記録。
- 自ブランチにcommit/pushして**Draft子PR（baseは`feat/shared-hgis-core-20261018`）**を作成。自動でマージ/公開しない。ChatGPT監査の完了を待つ。

## 6. Claude Code起動プロンプト（そのまま使用）
> `D:\dev\oldmap\ui`で、GitHub正本`docs/OLDMAP_CLAUDE_WP_20261020.md`と`docs/OLDMAP_LOCAL_WORK_MASTER_20261020.md`を読み、作業ブランチ`work/oldmap-ui-20261020`の状態を確かめてからU1→U2→U3に取り組んでください。単体旧国名アトラスの検索・年変更・不確実性・現代地図・典拠の一貫したユーザー体験を優先し、既存Core・全国史料・古地図形状は編集しません。モバイルUIとブラウザE2Eを本当に動かして結果を記録し、`npm run check`を必ずPASSにしてください。`docs/OLDMAP_CLAUDE_RESULT_20261020.md`とDraft子PR（base=`feat/shared-hgis-core-20261018`）を作り、採否・マージは別のChatGPT監査セッションに任せてください。
