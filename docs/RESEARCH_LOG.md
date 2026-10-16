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

### 引継ぎ位置

**P0記録後、Cycle Aの「JSON Schemaと参照整合テスト」または、並行可能なCycle BのUI設計から再開。** 文学・位置の人手承認がまだないため、製品版の確定教材には昇格しない。

## 2026-10-16 — 基礎構想v0.1

- 歌枕・先行文学・『おくのほそ道』・現在のPOIの三層を持つアプリ構想を `docs/CONCEPT.md` に保存。
- 競合のhosomapには先行和歌への言及があると判明。差別化は比較学習・典拠監査・現代の風景への接続に置く。
- 3地域（深川～千住／武隈の松／松島）をPoC候補に選定。
