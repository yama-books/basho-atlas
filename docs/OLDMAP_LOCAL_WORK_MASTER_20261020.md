# Oldmap ローカル並行実装の指示正本 v1.0
作成: 2026-10-20 JST / 文書状態: **作業指示。実装結果ではない**
担当拠点（ユーザーのWindows PC）: `D:\dev\oldmap`
正本GitHub: `yama-books/basho-atlas` / Draft [PR #1](https://github.com/yama-books/basho-atlas/pull/1)
親ブランチ: `feat/shared-hgis-core-20261018`（**mainからの分岐禁止**）
前提: [完成優先マスタープラン](HISTORICAL_GIS_KYUKOKU_MASTERPLAN_20261019.md)、[HANDOFF](HISTORICAL_GIS_INTEGRATION_FIRST_HANDOFF_20261019.md)、[QA手順](../kyukoku/QA.md)
子指示: [Codex・Core担当](OLDMAP_CODEX_WP_20261020.md) / [Claude Code・UI担当](OLDMAP_CLAUDE_WP_20261020.md)
監査・採否: [ChatGPT監査仕様](OLDMAP_REVIEW_PROTOCOL_20261020.md)

## 1. この分担の目的と優先順
**ゴールはv0.3 Integrated Preview：旧国名・ID検索→年変更→判定/不明理由→関連現代参照点と地図→出典、をPC/スマホで迷わず使えること。**
- 個別資料の網羅的な学術完全性や、旧国境の全時代復元よりも、統合動作・操作性・不具合の除去を先行。
- 紙媒体古地図・中古中世図版の調査は**PAUSED**。再開指示があるまで実施しない。
- 88件IDを歴史境界の実証と混同しない。1689のP010/P002は名前の相互参照であり歴史的所属の証明ではない。1868の陸奥は日付不明として保留。中世国境を想像して描かない。
- 不許諾または利用条件未確認の境界図形・原図画像を持ち込まない。既存Basho/Genpeiのデータと画面は非破壊。
- 既存の93件→123件という過去CIの件数は自動増減する。合格条件は**実行したPRの最新CIが成功**し、ユーザー導線が動くこと。

## 2. ローカル配置と担当境界
```text
D:\dev\oldmap\
├─ repo\             # basho-atlasの管理用clone。既存mainを勝手に改変しない
├─ core\             # Codex専用Git worktree / work/oldmap-core-20261020
└─ ui\               # Claude Code専用Git worktree / work/oldmap-ui-20261020
```
両worktreeは**同じリポジトリ履歴を共有するが、作業ファイルとHEADは独立**する。repo/core/uiの各フォルダを互いにコピーしない。既存ファイルを上書きしたり、未コミットの作業を消したりしない。
PowerShellで初期化（`D:\dev\oldmap`を作成済みという前提。git/Node.jsが使用可能であること）：
```powershell
$root = 'D:\dev\oldmap'
if (-not (Test-Path "$root\repo\.git")) {
  git clone https://github.com/yama-books/basho-atlas.git "$root\repo"
  if ($LASTEXITCODE -ne 0) { throw 'Clone failed. Authentication/repository URLを確認' }
}
git -C "$root\repo" remote -v
git -C "$root\repo" fetch origin --prune
if ($LASTEXITCODE -ne 0) { throw 'Fetch failed' }
git -C "$root\repo" worktree list
# 同名worktree・branchがまだ存在しないことを確認し、新規に作成する
git -C "$root\repo" worktree add -b work/oldmap-core-20261020 "$root\core" origin/feat/shared-hgis-core-20261018
git -C "$root\repo" worktree add -b work/oldmap-ui-20261020 "$root\ui" origin/feat/shared-hgis-core-20261018
git -C "$root\core" status --short --branch
git -C "$root\ui" status --short --branch
git -C "$root\core" rev-parse HEAD
git -C "$root\ui" rev-parse HEAD
```
- 実行前に `core`・`ui` が既存データを持っていないか確認する。すでに別repo/branchがあるならworktree addを繰返さず、状態を報告して止める。エラー時は `git reset --hard`, `git clean -fd`, `worktree prune` 等で作業を捨てない。
- `repo`に別リポジトリが既存ならcloneし直さずURLを照合。認証が必要ならGitの正式な認証手段を使い、公開URLで取得できなければその旨を報告する。秘密鍵やトークンをコミットしない。
- `core`と`ui`は**両方が同じ親ブランチの最新コミット**で始まったことを確認する。`node --version`（Node20以上）と `npm run check` で初期状態を検証。

## 3. 二担当の実装範囲
| 担当 | worktree / branch | 変更してよい領域 | 原則触れない領域 | 完了時 |
|---|---|---|---|---|
| Codex | `core` / `work/oldmap-core-20261020` | `src/historical-gis/**`, `data/historical-gis/**`（必要最小限）, `tests/historical-gis-oldmap-core*.test.mjs`, `docs/OLDMAP_CODEX_RESULT_*.md` | `kyukoku/**`, `package.json`, `package-lock.json`, `main` | Draft子PR → 親ブランチ |
| Claude Code | `ui` / `work/oldmap-ui-20261020` | `kyukoku/**`, `tests/e2e/**`, `playwright.config.*`, `package*.json`, 必要ならUI専用workflow, `docs/OLDMAP_CLAUDE_RESULT_*.md` | `src/historical-gis/**`, `data/historical-gis/**`, `main` | Draft子PR → 親ブランチ |
| ChatGPT監査 | GitHub接続のみ | 文書、差分・テスト/権利/UIレビュー記録 | 未承認PRの自動マージ | 採否、修正指示、統合ゲート |

**Coreの公開APIは初期分担中に破壊的変更しない。** UI側は既存`createProvinceAtlasService`, `parseTargetYear`, `search`, `getProvince`の契約で実装し、Core側が新しく足したAPIは監査後の統合フェーズまで前提にしない。

## 4. ブランチ・PR・合流の規則
1. 両担当は自分のブランチだけでcommit/push。勝手にmain/親branchへpushしない。`--force`や履歴書き換え禁止。
2. 子PRを作る場合は**base=`feat/shared-hgis-core-20261018`**、head=`work/oldmap-core-20261020`または`work/oldmap-ui-20261020`。`main`向けPRにしない。
3. 両PRはDraft、**レビュー待ち**としてリンクをこのChatGPTセッションに報告。Codex/Claude Codeによるセルフマージ・親PR #1マージ・Pages公開は禁止。
4. 統合順は原則Core→UI。Coreが親に受け入れられた場合、UI担当は**未コミット作業を保全した上で**最新親branchを取り込んで競合/テストを確認。不要なrebase/force pushを義務化しない。
5. 同じファイルを双方が変更する必要が生じたら、実装を止めてレビュー側へ提案。レビュー承認後に担当を一方へ寄せる。
6. 秘密情報・node_modules・Playwrightブラウザ・テスト動画・巨大スクリーンショットをソースPRへ混入させない。再現手順と必要な小さな証跡のみ残す。

## 5. 監査はChatGPTセッション側で実施
人手学術審査や権利付与をCodex/Claudeの自動テスト成功だけで済ませない。実機QA・採用可否・親branchへのマージはレビュアーが判断する。詳細は[監査プロトコル](OLDMAP_REVIEW_PROTOCOL_20261020.md)。

## 6. ローカル担当からの最小報告
```text
担当:
作業フォルダ: D:\dev\oldmap\core | D:\dev\oldmap\ui
baseブランチ/開始SHA:
作業ブランチ/最終SHA:
子PR URL（未作成なら理由）:
変更ファイル:
実装したユーザー体験:
npm run check の結果:
UI担当のE2E/ブラウザ検証結果（環境も）:
残る必須問題:
未確認・権利・史料上の注意:
次回の再開位置:
```
