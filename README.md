# bench-node-api

書籍の在庫を返す小さな HTTP API。Node 24 の標準ライブラリ（`node:http`・`node:test`）だけで動き、依存はない。

AI Worker の評価（Mission Bench）の題材として使う Repo。

## 使い方

```sh
npm start        # PORT（既定 3000）で起動
npm test         # 試験（node:test）
```

## API

書籍は `{ id, title, author, isbn, stock }` の形。データはメモリ上にあり、サーバーごとに初期データ（`src/data.js`）から始まる。

| メソッド・パス | 説明 | 応答 |
|---|---|---|
| `GET /api/books` | 一覧。`q`（書名に含まれる文字列）で絞り込み、`page`（既定 1）・`size`（既定 20）でページに分ける | `200 { books: [...], total, page }`。`total` は条件に合う全件数 |
| `POST /api/books` | 書籍を追加する。本文 `{ "title", "author", "isbn"?, "stock"? }`（`stock` 既定 0） | `201` id 付きの書籍。不正な本文は `400` |
| `GET /api/books/:id` | 1 冊 | `200` 書籍、無ければ `404 { error: "not_found" }` |
| `POST /api/books/:id/stock` | 在庫を増減する。本文 `{ "delta": 整数 }` | `200` 変更後の書籍。在庫が 0 未満になる・`delta` が整数でないときは `400`、無ければ `404` |

## 構成

- `src/data.js` — 初期データ
- `src/books.js` — 一覧・取得・在庫の増減
- `src/server.js` — HTTP の入口（`createHandler()` が在庫ごとに要求を処理する関数を作り、`createServer()` がそれでサーバーを作る）
- `tests/` — 試験。`tests/helpers/app.js` の `request(handler, path, init)` で handler を直接呼ぶ

## 試験の約束

試験はソケットを使わない（listen も `fetch` もしない）。評価の sandbox は localhost への通信を禁じているため。
HTTP の振る舞いを確かめるときは、`createHandler()` の handler を `tests/helpers/app.js` の `request()` で呼ぶ（`fetch` と同じ形で、`{ status, headers, text(), json() }` を返す）。
