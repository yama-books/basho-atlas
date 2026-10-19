# DATA_MODEL.md — Basho Atlas データ設計 v0.1

- 更新日: 2026-10-17
- ステータス: **設計案**（人の学術監査前）
- 上位文書: [CONCEPT.md](CONCEPT.md)
- 実例: [武隈の松・監査待ちデータ](../data/examples/takekuma-matsu.draft.json)
- この文書はコード・DB導入の決定ではなく、最初の実例を検証できるようにするためのデータ契約。

## 1. 最優先の分離原則

1. **文学に描かれた順序と、史料から再構成される実際の行程を分ける。** 武隈の松と笠島の順序差が実例。
2. **地名・歌枕・現在の公園・歴史的対象を同一レコードに潰さない。** 同じ場所に見えるものでも「現代の比定地点」を独立に記録する。
3. **作品上の言及、史料による訪問の証拠、文学的影響、後世の解釈は別関係とする。**
4. **歴史の時刻と、資料の刊行時期と、Webページの確認日と、APIの取得時刻を混ぜない。**
5. **証拠を得たことと、人の確認・公開承認は別状態とする。** `source_checked` は `human_approved` ではない。
6. POIは現況を保証しない外部スナップショット。史実の正本データへ取り込まない。
7. 関連のない地点に自動で「影響を受けた」と表示しない。多対多リンクの採否は根拠ごとに監査する。

## 2. MVPのデータ集合（論理モデル）

| 集合 | 主キー | 主な役割 |
| --- | --- | --- |
| `places` | `place_id` | 歴史的な歌枕・地名の同一性、名称異同、説明対象 |
| `modern_sites` | `site_id` | 現代の公園・史跡・位置の比定、住所・座標・その根拠 |
| `works` | `work_id` | 文学作品・歌の著者・出典・本文管理 |
| `travel_events` | `event_id` | 旅程に関する時刻・場所・順序・訪問/言及を区別 |
| `literary_relations` | `relation_id` | 作品×場所、または作品×作品の関連。解釈の確度 |
| `learning_prompts` | `prompt_id` | 教材の問い（根拠と模範解答の監査は別） |
| `sources` | `source_id` | 根拠・資料区分・URL・閲覧日・利用条件 |
| `modern_poi_cache`（別領域） | `cache_key` | OpenPOI応答・取得時刻・ライセンス/帰属（静的正本ではない） |

最初はJSONで良い。将来ファイル分割・DB化しても主キーを維持する。GeoJSONは位置が監査できた後に**派生生成物**とする。

## 3. 共通フィールド

- `id`: 安定ID。ローマ字小文字・数字・ハイフンで一意。
- `review_status`: `pending_human` | `human_approved` | `rejected`（正本の人手監査）。
- `evidence_status`: `unverified` | `source_checked` | `primary_checked`。人の承認とは独立。
- `proposed_by`: `ai` | `human` | `import`。
- `source_ids`: `sources`への参照配列。少なくとも1件、または不足理由を明示。
- `notes`: 解釈と未解決事項。未確定の本文・座標を推測で埋めない。
- `public_use`: `draft_only` | `approved_for_app`。**リポジトリ公開と教材への採用は別**。

### 3.1 地点と地理

- `places.place_type`: `utamakura` | `historic_site` | `literary_place` | `route_stop` | `candidate`。
- `modern_sites.relation_to_historic`: `identified_location` | `commemorative_site` | `approximate_area` | `disputed`。
- `modern_sites.geometry`: `null`、またはGeoJSONのPoint/Polygon。地図に載せるには**座標精査と根拠が必要**。
- `modern_sites.geometry_status`: `not_geocoded` | `approximate` | `verified`。
- 史料で確認できる「訪問」と、現代の公園の位置座標は独立の根拠で示す。
- WGS84・GeoJSON座標順は **[経度, 緯度]**。APIも `center=lng,lat`。逆順事故を検査。

### 3.2 作品・関係性

- `works.kind`: `waka` | `haiku` | `travelogue` | `diary` | `narrative`。
- `works.text_status`: `not_transcribed` | `draft_transcription` | `human_collated`。底本未定なら本文を無理に埋めない。
- `literary_relations.type`:
  - `located_at`: 作品の主題・題材の歌枕
  - `mentioned_in`: 作品内に地名が登場
  - `explicit_allusion`: **原文中に**引用・言及の証拠あり
  - `scholarly_interpretation`: 研究者・出典による関連の説明
  - `shared_topos`: 同じ歌枕の伝統を共有するが直接影響を断定しない
- `explicit_allusion` は証拠箇所を示せない限り使わない。市の解説による「踏まえる」は、まず `scholarly_interpretation` として登録する。
- `learning_prompts.answer_status`: `question_only` | `draft_answer` | `human_approved`。初期は`question_only`。

### 3.3 旅と叙述順

- `travel_events.event_type`: `visited` | `passed` | `mentioned_only` | `inferred`。
- `travel_events.evidence_kind`: `original_diary` | `literary_narrative` | `municipal_research` | `scholarly_source`。
- `travel_events.event_date`: `{value, calendar, precision, source_ids}`。和暦と西暦を一つの文字列に混合しない。
- `travel_events.actual_order` と `narrative_order`: 同一章内の相対順序。確定できないときはnull。
- 実際の経路の線は、点を機械的に連結して「実際歩いた道」と表示しない。

### 3.4 根拠と表示

`sources` に `title`, `url`, `publisher`, `source_kind`（一次史料・史料翻刻・自治体解説・辞典等）, `accessed_on`, `license_status`, `usage_note` を記録する。
Webの出典は更新で変わる。必要なら確認日と版を記録。引用文・写真・データセットを無条件に転載しない。

## 4. OpenPOIの隔離インターフェース

`modern_poi_cache` が持つ候補: `query`（中心座標/半径/件数/フィルタ）, `fetched_at`, `results`, `source`, `licenses`, `attributions`, `expires_at`。
APIレスポンスの各レコードにあるライセンスと出典表示を**消さない**。サービス側の「登録済み」と「営業中」は区別する。取得失敗では歴史カードを壊さず「現代施設は取得できません」と表示する。大量・全路線検索は行わない。

## 5. 正本と派生物

`data/examples/*.draft.json` は**設計検証用の公開可能なドラフト**であって、公開アプリの確定教材データではない。人の承認後に `data/verified/` へ別途昇格させる。

GeoJSON、アプリ表示JSON、学習問題、検索インデックスは原本から生成する。手作業の異同確認を経ずにAI回答を正答にしない。

## 6. 最初の検証条件

1. 武隈の松の実例が、作品／旅程／現況地点／根拠／教育用の問いを独立して保持できる。
2. 「笠島→武隈」（作品上）と「武隈→笠島」（史料に関する自治体解説）の双方を**矛盾なく**表示できる。
3. 元善・季通・能因と芭蕉の関係で、単なる伝統と出典に基づく解釈を区別できる。
4. 未監査の座標・古歌の確定翻刻・教材解答を勝手に埋めていない。
5. 出典参照IDがすべて存在し、未承認ドラフトがアプリ本番に混入しない。
6. 実データで三層のカードを試し、修正箇所を `RESEARCH_LOG.md` に記録する。

## 7. 次の工程

- 作品本文の底本選定と人手照合
- 史跡公園の**座標・比定対象**の独立照合
- JSON Schemaと参照整合・緯度経度・公開ゲートの自動テスト
- 3地点に広げたときの拡張性評価
- 調査した資料の確認状況は [DATA_SOURCES.md](DATA_SOURCES.md) に記録

## 8. 追補（2026-10-17）：旧国名とプロトタイプとの分離

- 現代の参照座標と旧国名の初期試作データは `data/prototype-locations.json` に格納。
- `old_province: {name, reading, basis_year:1689, source_url}` を保持する。
- 将来は `old_provinces` を独立した時期付きマスターにし、所属関係を `place_province_assignments` として年代・根拠・確度付きで保持する。
- 旧国は「歴史的所属」表示であり、現代の名勝・資料館の座標や当時の歩行位置と同一視しない。
- **試作画面は公開可能なドラフト説明のみ**を扱い、武隈の松の学術監査待ちの古歌本文／模範解答は読み込まない。
- 旧国境ポリゴンは幕末期データを1689年に偽装しない。詳細は [OLD_PROVINCES.md](OLD_PROVINCES.md)。

## 9. 2026-10-19 追補：外部データとの「同一性判定」を分離

- [先行アプリ監査](PRIOR_ART_AUDIT_2026-10-19.md) を参照。DLMの「松島」は広い文学的景観、プロトタイプの五大堂は現在の施設であり、座標が一致しなくても片方を誤りとして上書きしない。
- **新規候補集合**：`external_records`（提供者名・原ID・資料URL・権利・取得日）、`place_links`（同一候補・広域包含・近傍・異説の関係種別）、`heritage_designations`（名勝指定と後日の追加指定）、`text_witnesses`（原本文・翻字・現代解説の層）を検討。
- 旧国名はDLMなどの表示値を参考照合用に保持する。ただし年代判定の共通正本は**別プロジェクトの旧国名エンジン**。このリポジトリに国名判定ロジックを重複実装しない。
- **自動名寄せ禁止**：白河の関／白川（山城）、松島／五大堂、隅田川／深川のように、名称・地理的近接が同一性の証拠にならない例を明示する。
- DLMの調査候補を `data/research/dlm-place-crosswalk.draft.json` に、文化財地名を `data/research/official-scenic-places.draft.json` に保存。どちらも`pending_human`であり、アプリの配信用データからは除外する。
- 作品成立・芭蕉の1689年の旅・1779年蕪村の受容作品・現代資料を分けられるよう、データモデルを単純な固定3時代から将来拡張可能な形とする。

## 10. 2026-10-19：文学本文のソース別照合モデル

[文学本文監査](LITERARY_TEXT_AUDIT_2026-10-19.md) と [照合JSON](../data/research/literary-text-collation.draft.json) を追加。

- `works` の和歌には `anthology`, `number`, `transcription_status`, `source_ids` を別々に保持する。番号が取れないものは `null`。オンライン翻刻確認と原本画像・校訂版の人手照合を区別する。
- `claims` に「出典中に明示される作者・歌」「校注で示された文学的関連」「教材上の問い」を異なる `claim_type` として記録する。
- 松島では、**『おくのほそ道』での曾良という署名**と、実作者をめぐる別資料の異説を区別する。芭蕉の本文外の句は初期段階で未校合。
- 武隈の松既存ドラフトに `poem_number` と `poem_number_status` を追記。数値1041などは外部翻刻照合済みであり、`review_status: pending_human` と `public_use: draft_only` は維持。
- DLMのXLSXファイル本体を得られない場合、サイト表示の8シート構成・件数を**ファイルの解析結果として記録しない**。

## 11. 2026-10-19：DLM XLSXを踏まえたステージング境界

- [DLM実データ監査](DLM_XLSX_AUDIT_2026-10-19.md)によると、文学名所の`ID`と和歌の`ID`は独立しており、`Poems`に歌枕IDへの明示的な外部キー列が存在しない。
- `Poems.地名の形`をインポートの**候補提示条件**には使えるが、同定済みの`place_id`にはしてはならない。具体的反例：`まつしま`と`たまつしま`の部分文字列誤一致。
- `source_catalogue_label`（例：`後撰(1241)`）を`document_id`と別に保存。書誌ラベルの文法差・表記ゆれを許容。
- ID空欄の謡曲6件を埋めるために架空のIDを作らず、**元のシート＋原行／NID**を監査用に保持する。
- 原データの国名ラベルは`raw_old_province_label`として保存し、年代付き`display_old_province`は独立旧国名エンジンへ問い合わせる。
- 原本のハッシュとライセンス・処理日時を備えた取込ステージングと、`human_approved` / `approved_for_app` の製品用データを厳格に分離する。
