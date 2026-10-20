# Shared Historical GIS Core MVP 実装・利用手順
更新: 2026-10-18 / ブランチ: feat/shared-hgis-core-20261018
状態: **独立した試作。既存アプリ未接続、main未マージ。史料監査・商用配布ライセンスの承認前。**

## 1. 保存したコード
- [core.mjs](../src/historical-gis/core.mjs): 純粋関数のみ。DOM、Leaflet、MapLibre、ゲームエンジン、ネットワーク、外部依存なし。
- [adapters.mjs](../src/historical-gis/adapters.mjs): 既存 `basho-atlas` 3地点と `genpei-sandbox` 屋島8史跡を **読み取り専用** で地理共通契約へ変換。
- [Coreテスト](../tests/historical-gis-core.test.mjs): 30件のユニット検証。加えて[芭蕉実データテスト](../tests/historical-gis-basho-readonly.test.mjs): 3件。
- 先行の [データ契約](HISTORICAL_GIS_DATA_CONTRACT.md)、[v0.1 GeoJSON](../data/historical-gis/yashima-basho.sample.geojson)、[JSON Schema](../data/historical-gis/historical-feature.schema.json) を再利用。schemaでは出典の閲覧日を不明の `null` として保持可能にした。

`mjs` を選んだのは現在の芭蕉試作がビルド不要のJS/Node標準テスト構成だからであり、最終配布時のTypeScript型定義・npmパッケージ・独立リポジトリの採否は未決。ここでは既存アプリのpackage.jsonとUIは変更しない。

## 2. 実装API（現行の呼び出し契約）
| API | 結果 | 注意 |
|---|---|---|
| `assertYear(year)` | 1～9999のCE整数。異常値は例外 | 和暦日付/年内変更は未実装 |
| `temporalFit(time,year)` | `within/outside/unknown/invalid` | 開始/終了が片側不明なら安易にwithinとしない。任意のuncertain_transition_yearsをサポート |
| `isPubliclyEligible(feature)` | boolean | human_approved + approved_for_app + cleared + 再配布trueの4条件 |
| `queryFeatures(catalog,options)` | feature/temporal/spatial/approvedを含む候補 | 既定はpublicモードで失敗時非表示。research明示時のみドラフト取得 |
| `searchNames(catalog,{text,year,...})` | 完全一致候補配列 | 現代地名の曖昧ジオコーダではない |
| `resolveProvince(catalog,{sourceRecordId,sourceRepository?,year,mode?})` | resolved/candidate/ambiguous/unknown | 史料に紐付く **明示的な旧国所属の主張のみ**。点包含からは推定しない |
| `selectGeometry(feature,year,{mode?,allowLaterMapAsComparison?})` | 描画可能性・後世資料警告 | 後世史料は通常 withheld。比較を許可しても比較用という地位を保持 |
| `getTransportGraph(catalog,{year,mode?,allowInferred?})` | nodes,edges,unresolvedEdges | 未承認辺・未接続辺・通行不明を自動通行可能にしない。ゲーム速度・費用・最短経路は範囲外 |
| `adaptBashoPrototype(registry)` | FeatureCollection | 旧国候補はgeometry:null、現代3地点は現代レイヤー。原JSONを変更しない |
| `adaptGenpeiYashimaRegistry(registry)` | FeatureCollection | 8史跡を現代referenceとして写像。7 nullはnullのまま。1185合戦地点に再分類しない |

注意: `queryFeatures` の `bbox` 方式はMVPで **Pointのみ判定**。Line/Polygon と geometry=null は「空間未判定」扱いで、明示的な `includeSpatiallyUnknown` がなければ範囲検索に混入しない。広域面の空間計算は後続のGeometry Providerで行う。

## 3. 呼出例（調査UI側のみ）
```js
import { adaptBashoPrototype } from "./src/historical-gis/adapters.mjs";
import { resolveProvince, queryFeatures } from "./src/historical-gis/core.mjs";

const legacy = await (await fetch("./data/prototype-locations.json")).json();
const catalog = adaptBashoPrototype(legacy);

const studyClaim = resolveProvince(catalog, {
  sourceRecordId: "fukagawa",
  sourceRepository: "yama-books/basho-atlas",
  year: 1689,
  mode: "research"
}); // status === "candidate"（人の監査前）

const publicClaims = queryFeatures(catalog, { year: 1689 });
// [] : 未承認の地理データは自動公開しない
```

上は現行の呼び出し方の参考例であり、`app.js` に追加済みという意味ではない。試作の旧国名バッジは既存の表示を残しており、今すぐ置換しない。

### 源平連携の入口
源平側でJSON台帳を手元に読み込み、`adaptGenpeiYashimaRegistry(registry)` を呼ぶ。元の `site_id` を `source_feature_refs` に残す。`YS001` は現代の屋島広域代表点、`YS002`～`YS008` は座標不明。現代の史跡登録情報と1185年の出来事は別ID・別レイヤーで管理すること。出典の `source_id` は `src:genpei:*`、芭蕉は `src:basho:*` と別名前空間。

## 4. 確認済み・未確認
- 2026-10-18 隔離Node環境 `v22.16.0` で新Coreユニットテスト **30件PASS**。GitHubへアップロードしたコードも実データから直接変換し、Basho 3→6要素、Genpei 8→8要素、現代座標を除く歴史形状nullを照合。
- GitHub上の実際のGeoJSONサンプル／芭蕉変換／源平変換の**3種類がJSON Schemaの主要構造・型・参照規則に整合**することを独立検査で確認。これは仕様の一部の構造チェックであって、公式JSON Schema検証器による全キーワードの検証を代替しない。
- **実行済み（2026-10-18）**: GitHub Actions run [39077836169](https://github.com/yama-books/basho-atlas/actions/runs/39077836169) で `npm run check` を実行し、**既存7件 + 先行GIS9件 + Core30件 + Basho橋渡し3件 = 49件PASS / 0 FAIL**。最初の48/49件の失敗は、既存 `tests/contracts.test.mjs` が `controller.abort()` を文字列検査していたため。実装が使用している `state.poiAbort.abort()` に合わせてテスト側の検査を修正した。既存 `app.js` は無変更。
- 省略機能: 1185海岸線実図形、ジオリファレンスされた古地図ラスタ、全国旧国境、時代別街道グラフの実データ、検索の曖昧語マッチ、港/航路の推定、ゲームの移動速度。
- 既存 basho-atlas `app.js`、`index.html`、`styles.css`、`data/prototype-locations.json` は変更なし。genpei-sandboxへ書込みなし。

## 5. 受入・次フェーズ
1. PR上で `npm test` をNode20+で実行し、49件相当の既存+追加テストを通す。新規実装のテストでは通るケースだけでなく、間違った国所属・後世地図・未承認辺が落ちることを確認。
2. 人が確認した典拠と権利条件だけ、段階的に承認。戦場・記念碑・現代参照点の同一視はしない。
3. 中世屋島の推定海岸線・水域は、地形論文等の妥当な出典を得るまではgeometry=null。サンプルを捏造して見栄えを整えない。
4. Leaflet / MapLibre の画面実装は、Coreを受け入れてから独立試作を行う。ライブラリのライセンス/配布形態は人の承認を要する。

参考: [アーキテクチャ](HISTORICAL_GIS_SHARED_ARCHITECTURE.md)、[屋島資料計画](MEDIEVAL_YASHIMA_DATA_PLAN.md)、[旧国名](OLD_PROVINCES.md)。
