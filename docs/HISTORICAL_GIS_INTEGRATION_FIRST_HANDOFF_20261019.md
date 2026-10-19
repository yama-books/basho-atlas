# HANDOFF：旧国名アトラス統合完成優先への方針転換（2026-10-19）
**再開位置はこの文書と[MASTERPLAN](HISTORICAL_GIS_KYUKOKU_MASTERPLAN_20261019.md)。**
正本: `yama-books/basho-atlas`
ブランチ: `feat/shared-hgis-core-20261018`
PR: https://github.com/yama-books/basho-atlas/pull/1 （Draft/未マージを維持）
ステータス: **計画と史料調査分担をGitHubへ記録。実装作業は今回行っていない。**

## 1. 上位合意
ユーザーは「個別データの完全性を追うことは長期的に重要だが、まず全体の統合完成と実用性を重視し、過剰検証に陥らない」方針を採択。
- v0.3目標は「検索→年選択→旧国ID候補の区別→地図/無図形の説明→出典参照」の導線を実際のブラウザで完走すること。
- 88件すべての個別史料検証、全年代全国の国境、未デジタル刊本の取得・画像利用は v0.3 の公開判断をブロックしない。
- ただし捏造した歴史国境、許諾のない画像の再配布、変更年内の一意判定、現代座標を中世地点と断定する誤用は引き続き**禁止/リリース阻止**。

## 2. 現在の実装状態（前回結果を継承）
- `kyukoku/`：独立Leaflet UI、国名・ID検索、1689/1185/1868例、現代参照点4件、年代の未監査表示。iPhone実機QA/正式配信は未完了。
- CODH P系列 `P001–P070`・`P100–P117` 88 IDを収録。`province-index.mjs`と`codh-province-ids.mjs`。IDと歴史境界は別。
- 既存Core/adapters/契約スキーマを非破壊。GeoshapeのCC BY-NC幕末境界データは未同梱、国境線0件。
- 前回最終Actions [run 39197655756](https://github.com/yama-books/basho-atlas/actions/runs/39197655756)＝93 PASS、0 FAIL。新しいコード検証結果とは混同しない。
- 旧別セッション `kyukoku-engine v0.1.0-dev` ZIP/15テストは未入手。非重複差分の最終精査は**好機があれば行う補完作業**へ移し、最初の完成を止めない。
- 現行Basho本体の`app.js`,`index.html`,`styles.css`,`data/prototype-locations.json`と`genpei-sandbox`は変更しない。

## 3. 今回新たに文書化・確認した事項
- [統合完成優先マスタープラン](HISTORICAL_GIS_KYUKOKU_MASTERPLAN_20261019.md)：W0–W10の開発順、v0.3/v0.5/v1.0の限定完成条件、運用型テスト、過剰検証を避ける停止規則。
- [中古・中世史料の並行調査トラック](HISTORICAL_GIS_PREMODERN_SOURCE_TRACK_20261019.md)：未デジタル刊本と古地図の探索、元図/模本/刊本の時差、ライセンス、採否、別セッション作業指示。
- 公式出典：CODH https://codh.rois.ac.jp/province/ 、Geoshape https://geoshape.ex.nii.ac.jp/kg/ 、国立公文書館元禄国絵図 https://www.digital.archives.go.jp/pickup/41 、NDL古地図案内 https://ndlsearch.ndl.go.jp/rnavi/humanities/post_101029 、NDL荘園案内 https://ndlsearch.ndl.go.jp/rnavi/humanities/shoen 。
- 元禄国絵図の作成命令は1696年、完成は主に1702年ごろ。**1689年そのものの地図ではない**。時代比較用。
- 中古・中世の荘園絵図・模本は、対象地域・史料成立年・模写年・後代復元の時点を分ける。「当時の実測境界線」とは扱わない。

## 4. 次の作業でやること（W1/W2/W3を最優先）
1. PR内の現行独立ページのブラウザ実動作確認（PC、できればiPhone Safari、ネットワーク遮断）。検索・年・同名陸奥P002/P115・参照点・出典・戻るを確認。
2. **実運用の問題だけ**を再現させて修正。無効年が残す古い判定、Leaflet/OSMの取得失敗、モバイルで検索欄への導線、読み上げ等。
3. Core/索引の重複を増やさず薄いFacadeを作り、UIからの利用契約を一箇所にまとめる。
4. 代表6シナリオ（武蔵・陸奥1689／陸奥1868／讃岐1185／無効年／通信失敗）をE2Eと実機に落とす。
5. 権利をクリアした史料候補が来た時のみ別レイヤー試作。未入手を理由に上の作業を止めない。

## 5. 役割分担・引継ぎ
- Codex＝`src/historical-gis/`、`data/historical-gis/`、Core整合性とテスト。
- Claude Code＝`kyukoku/`、モバイルUI、E2E・ブラウザQA。
- 史料専門の別セッション＝`docs/HISTORICAL_GIS_PREMODERN_*`文書のみ。中古中世の地図・書物の選別、デジタル未公開図版の利用条件と有用性調査。
- ChatGPT監理＝出典との適合、統合優先の判断、重複回避、HANDOFF記録。人＝許諾・学術的承認・公開決定。
- 同時作業はファイル単位に分離。リソース逼迫時の交替は直前のgit headとHANDOFFを読むこと。

## 6. 状態更新のテンプレート
```text
基準コミット:
担当 / 触るフォルダ:
実装を増やした機能:
実際に操作できたシナリオ:
機械テスト（件数/URL）:
実機検証（機種・OS・ブラウザ・操作）:
新たな資料と、その資料対象時期:
画像/境界再配布の権利:
残件（必須 / 非ブロッキング）:
次回の再開位置:
```

## 2026-10-19 夜 最新再開位置：UIの実用性改善を実装
- **紙媒体の中古・中世地図史料調査を一時停止**。史料トラック資料は参照用に保持し、別セッションは今は起動しない。ユーザーの明示的な再開指示まで資料探索を優先させない。
- `src/historical-gis/atlas-service.mjs`を新設し、`parseTargetYear`、`createProvinceAtlasService`によりCoreの薄い呼び出しを統一。
- `kyukoku/app.mjs`で不正な西暦入力をフェイルクローズにし、検索結果選択時のフォーカスを維持。Leafletのタイル取得失敗には警告・手動再読み込みを追加。`index.html`/`styles.css`で警告UIと狭幅検索優先を反映。
- `tests/historical-gis-atlas-service.test.mjs`に13件の回帰テスト。`kyukoku/QA.md`に現地/スマホ実機スモーク12場面を固定。
- [Actions run #39239772740](https://github.com/yama-books/basho-atlas/actions/runs/39239772740)：Nodeの検査 **117 PASS、0 FAIL**。これはテストの結果であって、実機ブラウザの操作保証ではない。
- 続きは **W1ブラウザでの実機スモーク確認 → 発見されたユーザー影響の大きい問題のみ修正 → 必要十分なQAでv0.3を判定**。古地図収集や全88 IDの深掘りを割り込ませない。
