# OLDMAP 2026-10-20 Core/UI 子PRのChatGPT監査ログ
更新: 2026-10-20 JST
文書状態: **レビュー実施済み・統合未実施**
親: [Draft PR #1](https://github.com/yama-books/basho-atlas/pull/1) / `feat/shared-hgis-core-20261018`
監査規則: [OLDMAP_REVIEW_PROTOCOL_20261020.md](OLDMAP_REVIEW_PROTOCOL_20261020.md)
優先方針: **アトラスの統合完成・実用性を優先、紙媒体古地図はPAUSED、個別史料の網羅監査は後続**

## 1. 監査対象と判断
| 対象 | head SHA | scope / base | GitHub実測 | 判定 |
|---|---|---|---|---|
| [Codex Core PR #2](https://github.com/yama-books/basho-atlas/pull/2) | `d109b37cc5fd78a41b256a2414121cb179fb066e` | 新規4ファイルのみ、base `feat/shared-hgis-core-20261018` | [Actions 39353439598](https://github.com/yama-books/basho-atlas/actions/runs/39353439598)：109 pass / 0 fail / 1 skip | **ACCEPT（Core単体・未マージ）** |
| [Claude Code UI PR #3](https://github.com/yama-books/basho-atlas/pull/3) | `aaa83fefd51863d1a7d93a48ace9cdf5f41c0eb0` | UI・E2E・テストサーバー16ファイル、同base | [contracts 39393662843](https://github.com/yama-books/basho-atlas/actions/runs/39393662843)：102 pass / 0 fail。 [E2E 39393662928](https://github.com/yama-books/basho-atlas/actions/runs/39393662928)：28 pass / 10 design-skip / 0 fail | **ACCEPT（UI単体・未マージ）** |
両PRにはレビューCOMMENTを投稿しており、Draft・未マージを維持。
PR #2は現代参照点正規化、null位置・座標・HTTPS安全、歴史所属未承認を担当。PR #3は3カラム/モバイル順、年判定・地図・出典導線、通信エラーの再試行、Playwright操作テストを担当。両者の変更ファイルに**同一パスの書込み競合はない**。
CoreのオンラインCODH公式88件差分0は作業者の明示実行記録を確認したもので、監査側でオンラインテスト再実行はしていない。
UIのWindows上ローカルPlaywright WebKit 38 pass/19 skip×3・実CDN/実OSM操作は作業者実測の記録であり、監査側からWindows環境で同じ操作を再実行したという意味ではない。3枚のPNGスクリーンショット実ファイルを読んでUIを確認した。
両作業ともJev監査は`send_allowed=false`により未実施。送信・権限変更をせず、本ChatGPTコードレビューと混同しない。

## 2. 実装の重要な進展
- **統合操作**：国名検索→年代を選ぶ→未確認・ID対応のみを確認→参照点/出典へ到達。
- **史料的な安全**：1185の国境を描かない、1868陸奥の切替時点を曖昧に維持、現代地点を中世や芭蕉の実訪問座標として使わない。
- **動作面**：索引通信失敗、Leaflet不達、OSMタイル失敗、参照JSON失敗を分けて扱えるUI。入力エラー/スクリーンリーダー向けフィードバック/スマホ狭幅を補強。
- **検証**：コード文字列チェックの追加だけでなく、Chromium CIで実際にクリック・入力するE2Eを確認。

## 3. 統合段階の必須差分（最優先、必要な作業だけ）
**I1 — CoreとUIの接続（必須）**
- Core `normalizeAtlasReferencePoints({basho,yashima})` をUI `kyukoku/app.mjs` の `loadReferences()` から利用する。
- 旧国候補は`provinceCandidate.status=id_match_only`と`membership_status=candidate`を維持し、`provinceId`で1689年のみ参照強調する既存のUI制約を保持。
- 結果`points`は現代参照点だけ、`decisions`でデータ欠落・不正行・権利未確認の状態を必要に応じて説明。地図Popupの`source`は厳密にHTTPS、`name`はテキスト扱い。
- Basho3＋屋島現代1点が表示され、独立API導入で過去の図形・国境・確度が勝手に増えないことをブラウザE2Eで確認。既存JSONを変更せず、Coreファサード重複も新設しない。

**I2 — 実機iPhone QAの準備（必須・公開前）**
- UI担当の`tests/tools/serve.mjs`は`127.0.0.1`にbind、`npm run serve:kyukoku`を用いると同じLANのiPhoneからはアクセスできない。ループバック限定のE2Eサーバーはそのままにする。
- `kyukoku/QA.md`に、安全な一時的LAN向け起動（例：`python -m http.server 8000 --bind <PCのLAN内IP>`、信頼できるLAN内のみ、Windows Firewallと切断方法、公開ポート開放禁止）を追加し、iPhoneの実タップ・スクロール・ソフトキーボード・画面幅を検証。
- iPhone実機Safari確認ができなかった場合、`WebKit模擬OK / Safari実機未確認`と明示し、無断で`実機確認済み`と昇格しない。

**I3 — ローカル衛生（重要、軽量）**
- ルート`.gitignore`を新設し`node_modules/`,`test-results/`,`playwright-report/`,`*.log`等を除外する。後方互換に影響する広範なignoreはしない。
- ローカルPlaywright版/CIのChromium E2Eは導入済み。追加のCIプロジェクトをむやみに増やさない。WebKit実機相当の手動検査を別建てで記録。
- `initMap()`がLeafletロード済みで初期化途中の例外を出した場合、再試行がコンテナの古い地図状態で失敗しないか再現時に確認（再現できなければブロック要件へ格上げしない）。

## 4. 合流順（承認前は進めない）
1. **ユーザーが「親ブランチへの子PR統合」を承認した場合のみ**Core PR #2を`feat/shared-hgis-core-20261018`へ統合。子PRのbase/head/差分を直前再確認する。
2. 同branchを最新化したUI PR #3を親へ統合し、親上で`kyukoku`の`loadReferences`をCore正規化APIに接続する小差分を、明確に担当を決めて実施。
3. 統合後に`npm run check`＋Chromium E2E（PC・390px）を実行し、できればPCブラウザとiPhone Safariを追加検証。`main`由来の別テスト群も親PRマージ結果で再確認。
4. 上記まで通ればv0.3完成ゲートを監査。**親PR #1をmainへマージ、Draft解除、公開は別途明示承認が必要**。

## 5. 今回の監査では行っていないこと
- PR #2/#3のマージ、ベース変更、実装ファイルの上書き、Jev権限変更、iPhone実機操作、紙媒体史料の調査再開。
- 全国全旧国境・全時代・地図画像の利用許諾の人手確定。
- 自動テスト件数の違いは必ずしも削除ではない。親PR #1は`main`との仮マージで文学資料テストを含み、子PRは親branch単体をベースとする。

## 6. 次の一操作
**ユーザーの統合承認を待つ。** 承認後、Core→UIの順で親branchへ統合、旧UI直接参照点処理をCoreの新正規化関数へ一本化する。
