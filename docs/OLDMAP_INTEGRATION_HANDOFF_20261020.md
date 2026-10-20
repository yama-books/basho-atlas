# Oldmap 統合実装・検証 HANDOFF（2026-10-20）
**状態：Core/UIの子PRを親作業ブランチへ統合済み。v0.3コード・Chromium E2Eは検証済み。公開・iPhone Safari実機監査は未実施。**
正本：[yama-books/basho-atlas Draft PR #1](https://github.com/yama-books/basho-atlas/pull/1)
ブランチ：`feat/shared-hgis-core-20261018` / 対象APP：旧国名アトラス（APP-IDは未照合、独立APP-IDを推定しない）
作業開始指示：[OLDMAP_LOCAL_WORK_MASTER_20261020.md](OLDMAP_LOCAL_WORK_MASTER_20261020.md)
査読記録：[OLDMAP_REVIEW_LOG_20261020.md](OLDMAP_REVIEW_LOG_20261020.md)

## 1. ユーザー承認と変更境界
2026-10-20、ユーザーはCore PR #2 → UI PR #3の**親作業ブランチへの統合**を承認。これに従い以下を実施。
- **[PR #2](https://github.com/yama-books/basho-atlas/pull/2) Core：マージ済み**（merge commit `10c6626a84c9e63f3aea00b070006c262b9ae07f`、元head `d109b37cc5fd78a41b256a2414121cb179fb066e`）。
- **[PR #3](https://github.com/yama-books/basho-atlas/pull/3) UI：マージ済み**（merge commit `7563e21b79d9a05e5a48169b38987a3ee5cf485f`、元head `aaa83fefd51863d1a7d93a48ace9cdf5f41c0eb0`）。
- GitHubはDraft PRの直接マージを拒否したため、**子PRだけをReady状態に切り替えてマージ**。親PR #1は引き続きDraftでmain未マージ。GitHub Pages公開やJev送信・承認リスト変更は行っていない。
- このセッションではGitHubコネクタで親ブランチに直接統合差分を追加。ユーザーのWindowsローカルworktreeは直接変更していない。

## 2. マージ後に実施した接着・実用改善
1. `kyukoku/app.mjs` の旧`lookupCodhProvinceId`＋独自座標読込処理を、`src/historical-gis/atlas-reference-points.mjs` の`normalizeAtlasReferencePoints({basho,yashima})`へ集約。Coreの`points`をそのまま現代参照点として扱う。
2. `decisions`の「データセット欠落・不正座標・ID名の欠損・重複」と、ネットワーク障害を確認。どちらかのJSONがなくても残りの正常な参照点だけを描画できる。元JSON・Coreの公開APIを改変していない。
3. `tests/e2e/atlas-flows.spec.mjs`に、ブラウザ内での不正座標・HTML風の地点名・一部データ読込失敗の回帰ケース2件を追加（desktop/mobileの2プロジェクトで合計4テスト）。
4. `tests/historical-gis-province-atlas.test.mjs`の古いUI固有文字列検査`provinceId:null`を除去し、**Core正規化関数の現代参照点4件・所属未確認・屋島provinceId:null**という意味のある不変条件を実行検査するよう修正。
5. ルート`.gitignore`を追加。node_modules、Playwright生成物、ローカル環境変数・ログ等を除外。
6. `kyukoku/QA.md`に、通常のE2E HTTPサーバーは127.0.0.1限定でiPhone LANアクセス不可であることを明記。一時的なLAN内だけのPythonサーバーと実機Safari操作・終了・Firewall条件を記載。

## 3. 検証の記録
**最後のコードテスト実行対象：`5766e67c271380d1863228c53a94e7cbd6528cc7`**
| 検証 | GitHub Actions | 結果 |
|---|---|---|
| Node22 構文/契約テスト（`npm run check`） | [39414536500](https://github.com/yama-books/basho-atlas/actions/runs/39414536500) | **131 test / 130 pass / 0 fail / 1 skip**（CODH任意オンライン比較はオフラインでスキップ） |
| Chromium実ブラウザ E2E（desktop1280 + mobile390） | [39414536513](https://github.com/yama-books/basho-atlas/actions/runs/39414536513) | **42 test / 32 pass / 0 fail / 10 skip**（幅・a11y一部をdesktopに限定） |

詳細：
- 途中で古い「UIのソースに`provinceId:null`があるか」テストが失敗。意味上の不変条件を直接検証する形へ修正し、最新の上記CIでは合格。古い失敗がなくなったと確認済み。
- UI子PR #3作業者のWebKit模擬環境では38 pass/19 skipを3回と報告されているが、**親ブランチ統合後のWebKit再テストは未実施**。
- PC/iPhone実機Safariはこのセッションから直接操作していない。実際のunpkg CDN/OSMを使ったブラウザ手動確認は子PR作業者の事前結果であり、マージ後の本セッションが再実測したのではない。
- 親PR #1はmainにある文学資料系の追加テストも仮マージして実行されるため、子PRのテスト件数との差は単純な削除・失敗を意味しない。

## 4. v0.3受入状況
- **コード統合：完了**。検索→年別の保留判定→現代参照地点/国境なしの説明→典拠リンク。PC 1280/モバイル390の自動実ブラウザ検証済み。
- **安全性：Core/UIの実装条件を満たす**。CODH P IDを歴史的位置所属と断定しない、1185年の国境を推測描画しない、1868陸奥を保留、出典リンクを限定、元データ・ライセンス属性を保持。
- **UIの実機QA：未完了**。iPhone Safariのタップ・ソフトキーボード・画面ズーム・Wi-Fi通信・実OSMタイルはローカル実機確認が必要。WebKit模擬を実機確認済みと表現しない。
- **史料の完全性・古地図原図・全年代全国の国境：非ブロッキング／保留**。紙媒体の地図調査はPAUSED、画像権利/研究復元の公開決裁は行わない。
- **公開：未承認・未実施**。PR #1のmainマージ、Draft解除、GitHub Pages配信等は別の明示承認が必要。

## 5. ローカル次の作業手順
既存 `D:\dev\oldmap\repo`（管理clone）の現在branch/未コミット差分/worktreeを先に確認する。競合や作業中の変更があれば更新を中止。問題がなければ：
```powershell
git -C D:\dev\oldmap\repo status --short --branch
git -C D:\dev\oldmap\repo worktree list
git -C D:\dev\oldmap\repo fetch origin
git -C D:\dev\oldmap\repo pull --ff-only origin feat/shared-hgis-core-20261018
cd D:\dev\oldmap\repo
npm ci
npm run check
npm run test:e2e
```
`git pull --ff-only`はそのフォルダが`feat/shared-hgis-core-20261018` branchであり、未コミットの作業を持たないことを前提とする。違っていたらブランチを勝手に変更せず報告する。`D:\dev\oldmap\core` と `ui` は過去作業の隔離worktreeなので、`reset --hard`、`clean -fd`などで消去しない。iPhone実機QAの起動/Firewall/終了手順は [kyukoku/QA.md](../kyukoku/QA.md)に記載。

## 6. 次の一操作
**ローカルの最新親ブランチから iPhone Safariの実機QA（重点：検索→判定への自動スクロール、ソフトキーボード、国名戻り、地図失敗の継続動作）を行い、記録をこの監査セッションに送る。** 実機で阻害要因があればPR #1に修正コミット後E2E/Node CI再実行。問題なければv0.3候補として公開可否の別判断へ進む。
