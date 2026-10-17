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
- [検証記録・引継ぎ](docs/RESEARCH_LOG.md)
- [3地点・現代座標＋旧国名の試作データ](data/prototype-locations.json)
- [武隈の松 文学データ（人の学術監査待ち）](data/examples/takekuma-matsu.draft.json)

## 次にやること

1. ブラウザ実機での地図、画面幅、キーボード、POI CORS応答と表示の確認
2. JSON Schema・確度表示・データ出典のテスト強化
3. 武隈の松の和歌・本文・旅程順の人手監査
4. 歴史地図の年代と旧国境ポリゴンの利用条件を確認（候補資料はCC BY-NC）
5. GitHub Pagesの公開範囲・条件を決めてから配信

このリポジトリの公開は、教材の学術監査完了やアプリ公開承認を意味しません。
