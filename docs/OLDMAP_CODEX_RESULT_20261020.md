# Oldmap Core 実装結果（2026-10-20 JST）

担当: Codex / 作業場所: `D:\dev\oldmap\core`

- GitHub正本: `yama-books/basho-atlas`
- base: `feat/shared-hgis-core-20261018`
- 開始SHA: `56fd8a12843baeaa524cf103e4a5a67a84db4f5d`
- 作業branch: `work/oldmap-core-20261020`
- 最終SHA・子PR URL・最新CIはこの文書を含むDraft PRのHEAD/Checksを参照。マージ・公開は未実施。
- Windows PowerShell / Node `v24.19.0`（依存追加なし）。

## 実装と利用者への影響

C1: 既存のFacade・検索・年代判定APIは変更なし。開始時 `npm run check` は102 PASS / 0 FAIL（exit 0）。既存テストが1689 P010/P002のID対応、1868陸奥の保留、P115の古い年への不適用、空年/無効年、未知ID、陸奥の複数候補を検証済み。追加テストで1185讃岐P044が境界・確定所属を返さないことを確認。

C2: `src/historical-gis/atlas-reference-points.mjs` に純関数 `normalizeAtlasReferencePoints({basho, yashima})` を追加。Bashoの現代3点と屋島の現代広域代表1点を正規化する。入力ごとの `decisions` に採否・理由・警告を返す。欠落したデータセットや不正な1行で残りを失わず、null位置を推測座標に置換しない。

- 座標は数値2要素のWGS84 `[lng,lat]` に限定。NaN/Infinity/文字列/欠損/範囲外を拒否。GeoJSONは `modern_reference` のPointだけ採用。
- 名称、精度、出典URL、帰属、旧国候補、既存の審査・権利属性を保持。URLはHTTPSのみで資格情報・制御文字を除外。利用不能なURLは返さず警告。名前・帰属はプレーンテキストとして扱う必要がある。
- `provinceId` は候補の索引用ID。`provinceCandidate.status=id_match_only` / `membership_status=candidate`、`historicalMembership=unverified`。1689の歴史的所属を確定しない。名前対応は既存の `lookupCodhProvinceId` へ委譲し、無効な年を1689に補完しない。
- 出力は**Draftプレビュー用の現代参照点DTO**であり、公開承認済みGIS Featureではない。権利承認を与えるAPIではなく、一般公開への採用可否は別審査。入力も出力の変更によって書き換わらない。
- UIの現在の読み込みは変更なし。新APIへの切替は監査後の統合時にUI担当が行う。

```js
import {normalizeAtlasReferencePoints} from '../src/historical-gis/atlas-reference-points.mjs';
// basho/yashima は既存JSONを呼出元で取得したオブジェクト。
// 一方の読込が失敗した場合、その引数を省略して他方を利用できる。
const {points, decisions} = normalizeAtlasReferencePoints({basho, yashima});
// points: {name,lng,lat,source,sources,precision,provinceId,provinceCandidate,...}[]
// Leafletには [point.lat, point.lng]。名称は textContent で表示する。
// provinceIdでの強調表示は既存UIと同様、候補の対象年も確認する。
// decisions: {dataset,index,id,accepted,reason,warnings}[]
```

C3: 既存の88ID検査は保持。明示的な環境変数指定時だけ通信する比較テスト `tests/historical-gis-oldmap-core-codh.test.mjs` を追加。通常のチェックはオフライン。公式HTMLの行ID・最初の3セルからID/名称/関連IDだけ比較する。HTML形式が変われば失敗して再確認が必要になる。

## テスト証跡

- `node --test tests/historical-gis-oldmap-core.test.mjs`: 7 PASS / 0 FAIL、exit 0。
- `git diff --check`: exit 0。
- `jev-audit-pack.ps1 -RepoPath D:\dev\oldmap\core -TestCommand "npm run check" -HostModel codex -MaxDiffChars 50000`: 実テスト exit 0、credential scan 0 hits、`send_allowed=false`、`not_in_standing_approval`。Jevへの送信・監査は未実施。承認確認はこのセッションで依頼済み。監査合格とは扱わない。

公式比較の再実行（PowerShell）:

```powershell
$env:OLDMAP_COMPARE_CODH = '1'
node --test tests/historical-gis-oldmap-core-codh.test.mjs
Remove-Item Env:\OLDMAP_COMPARE_CODH
```

実行結果: 1 PASS / 0 FAIL、exit 0。2026-10-20 10:24:24 JST、Node fetchで `https://codh.rois.ac.jp/province/` を取得。88件、差分0。取得HTML SHA256: `688c2894b8dba4772d581d9f022b98fd6545e9d4b3ceabf72c9f4ade485484ab`。原表全体・境界・画像は同梱しない。この照合は名称・識別子・関連IDだけで、全年代の史料的存続、読み、境界、権利許可の検証ではない。

## 残件・再開位置

Coreの実装・契約テストは実施。Jev監査は未実施、子PRの採否・マージ・UIへの接続は監査待ち。PC/iPhone実機・UIのE2Eはこの担当では未実施。紙媒体古地図調査はPAUSED。Basho本体/Genpei/既存JSON/kyukoku/package/workflowは変更していない。

初期の `D:\dev\oldmap` は空で、指定coreが未作成だった。GitHub正本を取得し、管理cloneをrepoへ配置後、同じ開始SHAからcore worktreeを作成した。uiは本セッションでは作成・変更していない。次はPRのCore監査、採用決定後に親ブランチへ統合し、UI側で新APIの必要箇所だけ接続する。

## 最終ローカルチェック出力

```text
Command: npm run check
Exit code: 0
✔ data-derived popup source links are HTTPS-only (0.0781ms)
ℹ tests 110
ℹ suites 0
ℹ pass 109
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 958.129
```
