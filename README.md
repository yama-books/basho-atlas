# Basho Atlas ｜ 芭蕉時層地図（表示名は仮）

芭蕉が訪ねた歌枕を、**芭蕉以前の和歌・物語／『おくのほそ道』の旅／現在の地理・施設**という三層で比べる、文学・歴史・地理の学習Webアプリ構想です。

## 現在の状態

**企画・データ設計段階（2026-10-17）**。アプリ本体は未実装、GitHub Pages未公開です。

最初の検証地点は**武隈の松（二木の松）**。岩沼市などの資料を使い、芭蕉の作品内の順序と曾良の旅程に関する記録の違いを、確かめられる形で扱います。

## 文書・初期データ

- [基礎構想 / CONCEPT](docs/CONCEPT.md)
- [データ契約 / DATA_MODEL](docs/DATA_MODEL.md)
- [データ・ライセンス / DATA_SOURCES](docs/DATA_SOURCES.md)
- [実装の順番 / ROADMAP](docs/ROADMAP.md)
- [調査・決定・再開位置 / RESEARCH_LOG](docs/RESEARCH_LOG.md)
- [武隈の松 実例JSON（**人の監査前・アプリ公開不可**）](data/examples/takekuma-matsu.draft.json)

## 特徴

- 歌枕の伝統・芭蕉の文学・現在の場所を横断して比較
- 「作品中の描写」と「史料に基づく実際の旅」を分けて表示
- OpenPOI APIによる現代の周辺施設検索を計画
- 典拠と確度を保持。AIが生成した未承認解釈を、確定した教材として扱わない

## 次に進めること

1. 武隈の松の古歌・本文・座標を底本と別資料で照合し、人が承認
2. JSON Schema／参照整合性チェックを追加
3. 比較カードUIをスマートフォンで試作
4. 地図・OpenPOIの動作検証を3地域に拡大

実装時は [ROADMAP](docs/ROADMAP.md) の受入条件と、[DATA_SOURCES](docs/DATA_SOURCES.md) の公開・権利境界を優先します。
