# Basho Atlas ｜ 芭蕉時層地図（表示名は仮）

古歌・芭蕉の旅・現在の風景を重ねて読む、文学と地理の学習マップです。

## 開発状態（2026-10-17）

**最初のインタラクティブ地図のコードを実装しました。** GitHub Pagesは未公開で、ブラウザ実機試験は未完了です。

- [地図画面（ソース）](index.html)：Leafletで深川・武隈の松・松島の現代参照地点を表示
- **旧国名**：江戸中期1689年を基準に武蔵国／陸奥国を表示し、フィルタ可能
- **文学比較カード**：芭蕉以前／芭蕉／現代の三層切替
- **現代POI**：OpenPOI APIの周辺300m検索（ボタン押下時のみ）
- **重要**：現代の参照地点≠芭蕉の正確な歩行地点。旧国境も歴史的な経路線も未表示

### 試作実行

外部CDN・地図タイル・OpenPOIを利用するため、HTTPサーバーから開いてください（`file://`直開きはJSON取得に失敗する場合があります）。

```sh
python -m http.server 8000
# ブラウザで http://localhost:8000/
```

Node.js 20以降が使える場合：

```sh
npm test
npm run check
```

テストコードは登録しましたが、このセッションではNodeテストランナーでの実行は行っていません。GitHubからのファイル読み戻し、V8でのJavaScript構文検査、HTML-ID参照と地点JSONの静的検査を別途実施しています。

## 仕様・根拠・進捗

- [基礎構想](docs/CONCEPT.md)
- [実装計画](docs/ROADMAP.md)
- [比較UI仕様](docs/UI_SPEC.md)
- [旧国名と時代の扱い](docs/OLD_PROVINCES.md)
- [地点・作品・旅程データ契約](docs/DATA_MODEL.md)
- [出典・利用条件](docs/DATA_SOURCES.md)
- [先行アプリ・既存データの比較監査（2026-10-19）](docs/PRIOR_ART_AUDIT_2026-10-19.md)
- [DLM文学名所対応表・監査前](data/research/dlm-place-crosswalk.draft.json)
- [文化庁名勝構成地名26件・監査前](data/research/official-scenic-places.draft.json)
- [検証記録・引継ぎ](docs/RESEARCH_LOG.md)
- [3地点・現代座標＋旧国名の試作データ](data/prototype-locations.json)
- [武隈の松 文学データ（人の学術監査待ち）](data/examples/takekuma-matsu.draft.json)

## 2026-10-19の資料調査

DLMの文学名所5件を既存地点へ対応付ける調査台帳と、文化庁の国指定名勝構成地名26件の調査台帳を追加。**どちらも本番の地図ピンや既存文学カードを上書きしていません。**

## 次にやること

1. ブラウザ実機での地図、画面幅、キーボード、POI CORS応答と表示の確認
2. JSON Schema・確度表示・データ出典のテスト強化
3. 武隈の松の和歌・本文・旅程順の人手監査
4. 歴史地図の年代と旧国境ポリゴンの利用条件を確認（候補資料はCC BY-NC）
5. GitHub Pagesの公開範囲・条件を決めてから配信

このリポジトリの公開は、教材の学術監査完了やアプリ公開承認を意味しません。

### 2026-10-19：古歌・本文照合の新資料

- [文学本文の3地点監査報告書](docs/LITERARY_TEXT_AUDIT_2026-10-19.md)
- [文学本文・歌集・出典の監査用JSON](data/research/literary-text-collation.draft.json)
- [文学監査の整合性テスト](tests/literary-audit-integrity.test.mjs)

武隈の松に関連する『後撰和歌集』1241番・『後拾遺和歌集』1041・1042番をオンライン翻刻で照合。白河の関の能因・頼政の古歌、松島の曾良名の句と芭蕉の本文外の句を区別して記録しました。**人手による底本監査は未完了で、本番文学データは変更していません。** DLMの原XLSXは取得できず、内部8シートは未監査です。

### 2026-10-19：DLM公式XLSXの8シート実データ解析

**解消**：XLSXをリモート解析サービス経由で読み取り、公式に記載された8シート全件の列名・行数を確認しました。**原ファイル自体のSHA-256は未取得**です。

- [DLM XLSX構造監査](docs/DLM_XLSX_AUDIT_2026-10-19.md)
- [各シートの行数・列・欠損IDの機械可読監査](data/research/dlm-xlsx-schema-audit.json)
- [5地点・和歌48件の表記一致候補（未監査）](data/research/dlm-poem-form-candidates.draft.json)
- [ローカルへの限定引継ぎ](docs/LOCAL_DLM_BINARY_HANDOFF.md)
- [原本検査スクリプト](scripts/audit_dlm_binary.py)
- [追加データ整合性テスト](tests/dlm-staging-integrity.test.mjs)

注記：謡曲444件中6件はID欄空欄、和歌1,951件中62件は地名形欄が空欄。歌枕の文字列一致だけで一首を確定採用しません。原典資料のレビュー状態はすべて未承認です。
