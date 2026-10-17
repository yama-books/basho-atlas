# DATA_SOURCES.md — データ・権利・典拠台帳 v0.1

- 作成日: 2026-10-17
- 状態: 初期監査。各資料の再利用条件について、**閲覧と転載・配布の区別**を保つ。
- 原則: URLが公開されていること ≠ 本文・画像・データを無条件で複製できること。
- 人の監査未完了の資料は `approved_for_app` にしない。

## 1. ソース台帳

| ID | 資料 | 主な使い道 | 再利用・確認方針 |
| --- | --- | --- | --- |
| S01 | [岩沼市『おくのほそ道』と岩沼](https://www.city.iwanuma.miyagi.jp/kanko/rekishi/nyumon/okunohosomichi.html) | 曾良の旅程と作品叙述の順序差、和歌の伝統、地元史 | 解説の長文転載なし。事実・典拠を照合。人手確認前はドラフト |
| S02 | [岩沼市 二木の松史跡公園](https://www.city.iwanuma.miyagi.jp/kurashi/infrastructure/toshi-keikaku/hutakinomatushisekikouen.html) | 現代の史跡公園、所在地、公園施設 | 住所情報は照合可。写真・案内図の転載は別途確認 |
| S03 | [岩沼市 国指定名勝](https://www.city.iwanuma.miyagi.jp/kanko/bunkazai/takekumanomatsu.html) | 指定地・指定年月日・植継ぎの伝統 | 2014年3月18日指定。指定地の住所は公園所在地と異なる表記もある |
| S04 | [宮城県 指定文化財](https://www.pref.miyagi.jp/soshiki/bunkazai/okunohosomichinofukeichi.html) | 名勝指定と芭蕉句の確認 | 地方自治体の文化財情報。写真転載は未許可 |
| S05 | [コトバンク「武隈の松」](https://kotobank.jp/word/%E6%AD%A6%E9%9A%88%E3%81%AE%E6%9D%BE-319610) | 元善・季通・能因、古歌の書誌的補助確認 | 辞書本文は転載しない。原典歌番号・表記は別途照合 |
| S06 | [逸翁美術館『奥の細道画巻』](https://archives.hankyu-bunka.or.jp/digi-emaki/okunohosomichi1.html) | 該当段の補助確認と展示資料 | 翻刻・現代語訳・画像は個別利用条件確認まで転載しない |
| S07 | [DLMデータセット](https://literarymaps.nijl.ac.jp/dataset/) | 歌枕・関連和歌・資料・座標の候補 | **CC BY 4.0（データセットの公式表示）**。原配布物と再利用対象を精査し、出典・リンク・変更点を記載 |
| S08 | [OpenPOI API 仕様](https://docs.openpoiapi.com/) | 現代POIの検索と座標・施設情報取得 | APIのレスポンスごとに `licenses` / `attributions` を保持。利用形態を設計 |
| S09 | [OpenPOI 出典・ライセンス](https://openpoiapi.com/attribution.html) | API側の各種帰属・提供元 | **統一ライセンスではない**。Overture / Foursquare / JFF / 鉄道などに応じた義務がある |
| S10 | [国土地理院 地理院地図](https://maps.gsi.go.jp/) | 現代地図・航空写真・地形 | タイル・写真・旧版地図の利用条件を別途監査 |
| S11 | [国土数値情報](https://nlftp.mlit.go.jp/ksj/) | 土地利用・鉄道等の比較 | データ項目と配布版ごとの条件・更新時刻を確認 |
| S12 | [hosomap](https://kiritter.github.io/hosomap/) / [GitHub](https://github.com/kiritter/hosomap) | 競合機能・表示の参考 | **コードやGeoJSON、解説の転載不可として扱う**。上流の権利を確認するまで取り込まない |

確認日: 2026-10-17。上記は公開元にアクセスして確認した範囲の記録であり、すべてのライセンスの法的精査完了を意味しない。

## 2. 文学資料の検証段階

1. **発見**: 資料候補を見つけた。
2. **補助資料照合**: 自治体・辞典・研究解説などで事実関係の方向性を確認した。
3. **原典本文照合**: 信頼できる底本・翻刻・必要なら影印で該当箇所を確認した。
4. **人の承認**: 異同・解釈の確度を担当者が確認した。
5. **公開教材化**: 承認したデータのみ静的配布データに昇格。

**武隈の松の現在位置**: 2まで一部進捗。底本の逐語照合、元善・季通・能因の古歌本文、現代史跡の正確な座標は未完了。従ってJSONは公開リポジトリに置いても教材へは直接表示しない。

## 3. OpenPOI APIの取り扱い

公式仕様により `GET /v1/search` は `center=経度,緯度` と `radius` を使用する。`bbox` も利用でき、`limit` は1〜200。座標は地理上の対象を確認してから渡す。

- 閉業施設の残存、座標ズレ、観光名所自体の非収録がある。**営業中判定ではない**。
- 結果はレコード単位で `source`, `licenses`, `attributions` を保持。
- Overture MapsのデータにはCDLA-Permissive-2.0、Apache-2.0、CC0等の別条件が混在する。
- Foursquare由来のApache-2.0/NOTICE義務、各自治体のJFFのCC BY/PDL利用条件などは利用形態に応じ個別確認。
- **公開前に、画面上の帰属表示と必要なNOTICE・ライセンスの扱いを確認**する。
- 未取得のPOIデータを例示用に作り込まない。初回検証までスナップショットは空にする。
- API仕様のデータ形式をテストし、失敗時は文学カードだけでも読めるようにする。

## 4. DLM更新日の照合記録

先行の `CONCEPT.md` には「2026-03-23（公式表示）」と、旧競合メモの「2026-09-17」との相違が記載されている。**2026-10-17時点の公式データセットページは最終更新日「2026-09-17」** と表示することを確認した。

したがって、当面は「10月17日閲覧時の公式表示は9月17日」と記録する。3月23日の経緯は配信時期・キャッシュ・更新履歴の確認待ち。元資料を勝手に訂正したかのようには扱わない。

## 5. 公開直前チェック

- [ ] 各作品本文の底本・歌番号・表記異同を人が確認
- [ ] 各地点の位置座標・座標根拠を確認
- [ ] 各解説の典拠を提示し、史実と解釈を分離
- [ ] DLMを実際に引用・加工する場合はCC BY 4.0帰属・変更表示
- [ ] OpenPOI応答を使う場合はレコード別出典・NOTICE等の条件を満たす
- [ ] 写真・古地図・タイル提供者の権利・表示条件を確認
- [ ] 生成AI案を人の承認なしに模範解答・教材正本として出さない
- [ ] 他の非公開リポジトリの内部資料や履歴を混入させない

## 6. 2026-10-17 追加ソース（旧国名・現代参照地点）

| 資料 | 用途・利用条件 |
| --- | --- |
| [CODH旧国・旧郡境界データセット](https://geoshape.ex.nii.ac.jp/kg/) | **幕末期の国・郡境界**。CC BY-NC。現時点で国境線を複製・配布しない |
| [福島県立図書館のレファレンス](https://crd.ndl.go.jp/reference/entry/index.php?id=1000038375&page=ref_view) | 1868年の陸奥国分割の時期 |
| [松島町の歴史](https://www.town.miyagi-matsushima.lg.jp/page/1319.html) | 松島が陸奥国の地域であったこと |
| [江東区芭蕉記念館](https://www.city.koto.lg.jp/103020/shisetsuannai/kokyo/kinenkan/16761.html) | 現代の参照地点の所在地 |
| [OpenData Japan 芭蕉記念館](https://opd.opendata-japan.com/facility_and_place_v5s?facility_id=GV-7MNU-5E3L-9SAT) | 現代施設の座標。利用条件の再監査を要する |
| [みやぎフォトライブラリー 武隈の松](https://bosaikanko.jp/my13_iwanuma/%E5%9B%BD%E5%90%8D%E5%8B%9D-%E3%81%8A%E3%81%8F%E3%81%AE%E3%81%BB%E3%81%9D%E9%81%93%E3%81%AE%E9%A2%A8%E6%99%AF%E5%9C%B0-%E6%AD%A6%E9%9A%88%E3%81%AE%E6%9D%BE/) | 武隈の松付近の現代座標。写真そのものは無断転載しない |
| [Geoshape『日本歴史地名大系』五大堂](https://geoshape.ex.nii.ac.jp/nrct-poi/resource/04/040000072200.html) | 現代参照地点・五大堂の位置。CC BY 4.0表示／帰属条件を確認 |
| [OSMFタイル利用方針](https://operations.osmfoundation.org/policies/tiles/) | 地図タイルの表示・キャッシュ・帰属・禁止事項 |
| [Leafletの安定版](https://leafletjs.com/download) | 地図UIライブラリ1.9.4 |

詳しくは [OLD_PROVINCES.md](OLD_PROVINCES.md) と [UI_SPEC.md](UI_SPEC.md) を参照。
