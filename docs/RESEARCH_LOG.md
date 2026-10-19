## 2026-10-19 — 先行サービスの第2次監査・出典照合の導入

- 調査対象：DLM、hosomap、文化庁の名勝と曾良日記、美術館の蕪村画巻、登米市uMap、芭蕉ウォーク。
- 決定：DLMを文学名所の構造化データ候補、文化庁DBを名勝名称・履歴の照合元、hosomapを地図UI構造研究、逸翁美術館を原資料／翻字／後世解釈の表示構造研究に位置付ける。
- **調査用データ追加**：`data/research/dlm-place-crosswalk.draft.json` 5件、`data/research/official-scenic-places.draft.json` 26構成地名。
- **自動テスト追加**：`tests/research-integrity.test.mjs` 4テスト。座標の誤置換、旧国名、指定年月日の一律転記を防止する。Nodeでの実行はこの時点では未実施。
- **権利判定**：DLMのデータセットはCC BY 4.0。hosomapの作者独自コード・GeoJSONの包括的再利用許諾は未確認。画像・翻刻・現代語訳はソース単位で扱う。
- **未着手**：DLMのXLSXファイル実体の取得・8シートの列／キー監査、文学引用の底本監査、ブラウザ実機表示、公開アプリへの反映。
- **既存地図への影響**：今回の研究用JSONは**本番地図で未読込**。既存3地点の座標・旧国名・文学カードの挙動は変更しない。
- 詳細：[先行アプリ再調査](PRIOR_ART_AUDIT_2026-10-19.md)。
- 次工程：原XLSX取得→対照キー確認→本文・地理を段階的に監査→アプリ表示に採用するデータのみ昇格。

---

## 2026-10-17 — 地図・旧国名プロトタイプ実装（追加チェックポイント）

- **実装**: `index.html` / `styles.css` / `app.js`、現代参照座標3地点 `data/prototype-locations.json`。
- **地図**: Leaflet 1.9.4 + OpenStreetMap地図タイル。ピン選択、旧国名別の一覧・絞り込み、初期地図範囲変更。
- **旧国名**: 武蔵国（深川）、陸奥国（武隈・松島）。1689年基準。現代ピンを歴史的歩行路にすり替えない。
- **旧国境**: 未実装。CODHの境界データは**幕末期**・CC BY-NCである。年代差・利用条件を見極めるまでコピー・表示しない。
- **文学UI**: 芭蕉以前／芭蕉／現代の切替、問い、地点・旧国資料のリンク。人の学術監査待ちの古典本文を教材として公開する実装は行わない。
- **OpenPOI**: 半径300m、最大12件、利用者が押したときのみ呼出。結果の座標・範囲・重複を検査し、ライセンス／出典を個別表示、地点変更時は前の検索を中止。
- **座標出典の表示を追加**: 現代施設のピンに `coordinate_attribution` を保持し、地点カードから座標典拠へリンク。松島は『日本歴史地名大系』施設・地点項目データセット（CODH作成）doi:10.20676/00000456 / CC BY 4.0 を明示。
- **テスト**: `tests/contracts.test.mjs` に7テストを記述。GitHub上の6ファイルを読み戻し、JavaScriptのV8構文検査・HTML参照ID25件・座標/旧国年代などの静的検査で**問題0件**。
- **未実施**: Nodeテストランナーでの `npm test`、実機Safari/Chrome、OpenPOIの実API通信、地図CDNの実機表示、GitHub Pages公開。**検証していないことを成功と扱わない**。
- **次の担当**: Nodeの7テスト実行→ブラウザQA→必要な修正→旧国境の法的・歴史的監査。公開の最終判断は利用者が行う。

### 関連する新文書
- [OLD_PROVINCES](OLD_PROVINCES.md)
- [UI_SPEC](UI_SPEC.md)

---

# RESEARCH_LOG.md — Basho Atlas 開発・検証記録

> 重要な状態変化のみ記録する。単なる会話ログではない。人が未承認の情報は、公開リポジトリに置いても確定教材として扱わない。

## 2026-10-17 — P0データ設計開始（初期チェックポイント）

### 正本
- GitHub: https://github.com/yama-books/basho-atlas
- branch: `main`
- 上位構想: `docs/CONCEPT.md`（2026-10-16版から継続）
- 新設: `docs/DATA_MODEL.md`, `docs/DATA_SOURCES.md`, `docs/ROADMAP.md`, `data/examples/takekuma-matsu.draft.json` と本ログ
- コード実装・GitHub Pages公開: **未実施**

### 検証した事実

1. 岩沼市『おくのほそ道』と岩沼によると、曾良の記録に関する説明では武隈の松→笠島方面の順だが、芭蕉の文学上の叙述では笠島→武隈の松の順序となる。
   - 出典: https://www.city.iwanuma.miyagi.jp/kanko/rekishi/nyumon/okunohosomichi.html
   - **未実施**: 曾良の日記の原典翻刻との直接照合。
2. 岩沼市の説明は、藤原元善『後撰和歌集』、橘季通『後拾遺和歌集』、能因の歌と伝承を、武隈の松の文学史として挙げる。特に「二木」「みき」の語遊びと芭蕉句の関係について地元解説あり。
   - 出典: 上記岩沼市資料、https://kotobank.jp/word/%E6%AD%A6%E9%9A%88%E3%81%AE%E6%9D%BE-319610
   - **未実施**: 歌集の底本・歌番号・原文・語釈の人手照合。
3. 現代の「二木の松史跡公園」は岩沼市二木二丁目29番8及び85番1。国指定名勝「おくのほそ道の風景地」の「武隈の松」は2014-03-18指定。
   - 出典: https://www.city.iwanuma.miyagi.jp/kurashi/infrastructure/toshi-keikaku/hutakinomatushisekikouen.html
   - 出典: https://www.city.iwanuma.miyagi.jp/kanko/bunkazai/takekumanomatsu.html
   - **未実施**: 位置座標の別ソース照合、現代POI APIの実呼び出し。
4. DLM公式データセットページの2026-10-17閲覧時の更新日表示は「2026-09-17」。`CONCEPT.md` 旧記述の「2026-03-23」は現時点の公式表示と一致しない。
   - 出典: https://literarymaps.nijl.ac.jp/dataset/
   - 対応: 現表示と過去メモの相違を記録し、現在の表示に修正。過去ページ更新履歴は未追跡。
5. OpenPOIの `GET /v1/search` は `center=lng,lat` と `radius`、`bbox`をサポート。POIごとのライセンスと出典の保持が必要。名勝などのランドマーク自体が欠ける場合がある。
   - 出典: https://docs.openpoiapi.com/ , https://openpoiapi.com/attribution.html
   - **未実施**: 武隈の松での実データ取得・表示・ライセンスUI確認。

### 設計上の判断

- 史料からの推定旅程と文学上の叙述順を別データにする。
- 現代の公園と、歴史的な歌枕を別IDにする。
- 作品→場所と作品→作品の関係を別IDにし、直接典拠と研究的解釈を分類する。
- 不確かな古歌本文・座標は `null` とし、無理に補完しない。
- `draft_only` + `pending_human` を使用し、AIによる出典探索を人の公開承認と混同しない。
- OpenPOI結果は静的教材データから隔離し、取得時刻・ライセンス・帰属を保持する。

### 初期成果と自動検証

- 参照データJSONの構築時に全 `source_ids`、place/work/site参照先の存在をスクリプト内で確認し、欠落なし。
- ただし **リポジトリ内で再実行できるJSON Schema / CIテストはまだない**。次フェーズで追加する。
- GitHubのコミットを読み戻し、最新の文書・JSONが正しく保存されたか再確認する。

### GitHub読み戻し・整合性テスト

2026-10-17: README, CONCEPT, DATA_MODEL, DATA_SOURCES, ROADMAP, RESEARCH_LOG, 武隈の松JSONの **7ファイル** がGitHub上に存在することを読み戻して確認。
- JSON構文解析に成功。
- 2地点（中心1・比較用文脈1）、現代史跡1件、作品6件、旅程イベント2件、文学関連4件、教材問い2件、出典6件。
- 全 `source_ids` と地点・現代史跡・作品参照先の存在、ID重複なし、READMEの文書リンクの実在を確認。
- 全てのデータレコードの公開ゲートは `pending_human` かつ `draft_only`。
- **検証中の修正**: 能因→『おくのほそ道』の関係は原文未照合のため、`explicit_allusion` から `scholarly_interpretation` に変更した（commit `bf05b39fd27cadb68bb7d186f8ece18b24a8aa9e`）。
- リポジトリで再実行可能な自動テストやCIは**まだ未作成**（その場の検証スクリプトで参照整合を検査した段階）。

### 引継ぎ位置

**P0記録後、Cycle Aの「JSON Schemaと参照整合テスト」または、並行可能なCycle BのUI設計から再開。** 文学・位置の人手承認がまだないため、製品版の確定教材には昇格しない。

## 2026-10-16 — 基礎構想v0.1

- 歌枕・先行文学・『おくのほそ道』・現在のPOIの三層を持つアプリ構想を `docs/CONCEPT.md` に保存。
- 競合のhosomapには先行和歌への言及があると判明。差別化は比較学習・典拠監査・現代の風景への接続に置く。
- 3地域（深川～千住／武隈の松／松島）をPoC候補に選定。
