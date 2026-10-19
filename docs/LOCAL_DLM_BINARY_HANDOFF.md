# HANDOFF｜DLM元XLSXバイナリ検証・ローカル担当への限定タスク

**起票日：2026-10-19／作業範囲はDLMファイルのローカル検証のみ。**
共通正本：<https://github.com/yama-books/basho-atlas>

## 現状と理由

ChatGPTセッションで `https://literarymaps.nijl.ac.jp/downloads/dlm-dataset.xlsx` を**リモートXLSX解析サービス経由で読み取り**、全8シート・全行数・列名・欠損IDを検査できた。

- [構造監査](DLM_XLSX_AUDIT_2026-10-19.md)
- [機械可読の基準](../data/research/dlm-xlsx-schema-audit.json)
- [元XLSXの監査スクリプト](../scripts/audit_dlm_binary.py)

**未解決なのは**「オリジナルのXLSXファイルそのものを保存してSHA-256を取得すること」および「変換解析でID欠落6件が発生したのではないことの確認」。**8シート構造の再調査をゼロから行う必要はない。**

## ローカルへの依頼（完了基準あり）

1. WindowsローカルのWebブラウザ等を使い、公式配布URLから `dlm-dataset.xlsx` を取得する。他のミラーサイトからの代替は禁止。
2. ファイルを安全な一時作業フォルダに置き、Gitで追跡させない。
3. リポジトリのフォルダから、PowerShellで次を実行する。

```powershell
$xlsx = Join-Path $env:USERPROFILE 'Downloads\dlm-dataset.xlsx'
Get-FileHash -Algorithm SHA256 $xlsx
python .\scripts\audit_dlm_binary.py $xlsx --baseline .\data\research\dlm-xlsx-schema-audit.json --out (Join-Path $env:TEMP 'dlm-binary-audit.json')
```

保存先が異なる場合は、`$xlsx` に設定するファイルパスを変更する。
`python`が使えない場合は`py`等、環境に合う起動方法を選ぶ。

4. 出力の`difference_count`が0なら、8シートとID欠損がリモート解析と一致したと記録する。差があれば **原本を正として**、差分だけを記録し、人に照合を求める。
5. `$env:TEMP\dlm-binary-audit.json` のSHA-256、ファイルサイズ、入手日、差分結果を `docs/DLM_XLSX_BINARY_VERIFICATION.md` に保存（元XLSX本文・翻訳文・画像はGitHubへコピーしない）。
6. 可能なら修正・追加をPRとして提出する。既存データの監査状態を`human_approved`へ変更しない。
7. 作業結果をこの担当へ知らせる。原本に差異がある場合、和歌の対応表や書誌IDを**自動で置き換えず**比較結果を先に示す。

## 変更してよいファイル・触れないファイル

- 変更可：`docs/DLM_XLSX_BINARY_VERIFICATION.md`（新規）、必要なら`docs/RESEARCH_LOG.md`への検証結果追記。
- 変更しない：`app.js`、`styles.css`、`data/prototype-locations.json`、`data/examples/takekuma-matsu.draft.json`、`kyukoku-engine`。
- 他の並行セッションが作業する`docs/DATA_MODEL.md`／`docs/ROADMAP.md`への直接上書きは避ける。

## 注意

- レコードレベルの原本文・翻訳・画像の転載条件は別問題。
- 謡曲6件のID空欄は確認対象であり、架空IDを付けてはならない。
- `地名の形`が一致しても、歌枕と詩歌の関係が確定するわけではない。
- 応答の変換版の見出しと原XLSXの物理シート名は同じとは限らないため、差分の意味を記録する。
- ソースに秘密情報はないが、作業者の端末ユーザー名をリポジトリに記載する必要はない。
