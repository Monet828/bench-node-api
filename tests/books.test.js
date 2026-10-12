import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../src/server.js";
import { addBook, adjustStock, getBook, listBooks } from "../src/books.js";
import { seedBooks } from "../src/data.js";
import { request } from "./helpers/app.js";

// 在庫ごとに handler を作り、fetch と同じ形の app(path, init) を渡す（ソケットは使わない。tests/helpers/app.js）。
async function withApp(fn) {
  const handler = createHandler();
  await fn((path, init) => request(handler, path, init));
}

test("listBooks は全件を返す", () => {
  const result = listBooks(seedBooks());
  assert.equal(result.books.length, 5);
  assert.equal(result.total, 5);
  assert.equal(result.page, 1);
});

test("listBooks は q で書名を絞り込む", () => {
  const result = listBooks(seedBooks(), { q: "Hobbit" });
  assert.deepEqual(result.books.map((b) => b.id), [1]);
});

test("getBook は無い id で null を返す", () => {
  assert.equal(getBook(seedBooks(), 99), null);
});

test("adjustStock は在庫を増減し、0 未満にはしない", () => {
  const books = seedBooks();
  assert.equal(adjustStock(books, 1, -1).stock, 3);
  assert.throws(() => adjustStock(books, 2, -1), RangeError);
});

test("GET /api/books は一覧を返す", async () => {
  await withApp(async (app) => {
    const res = await app(`/api/books`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.books.length, 5);
  });
});

test("GET /api/books/:id は 1 冊を返し、無ければ 404", async () => {
  await withApp(async (app) => {
    const ok = await app(`/api/books/3`);
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).title, "Kafka on the Shore");
    const missing = await app(`/api/books/99`);
    assert.equal(missing.status, 404);
  });
});

test("POST /api/books/:id/stock は在庫を変え、足りなければ 400", async () => {
  await withApp(async (app) => {
    const post = (id, body) =>
      app(`/api/books/${id}/stock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const ok = await post(1, { delta: 2 });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).stock, 6);
    const short = await post(2, { delta: -1 });
    assert.equal(short.status, 400);
  });
});

test("addBook は一意の id を付けて追加し、その書籍を返す", () => {
  const books = seedBooks();
  const a = addBook(books, { title: "A", author: "X", isbn: "1", stock: 2 });
  const b = addBook(books, { title: "B", author: "Y" });
  assert.equal(a.id, 6);
  assert.equal(b.id, 7);
  assert.equal(b.stock, 0);
  assert.equal(books.length, 7);
  assert.equal(getBook(books, 6), a);
  assert.throws(() => addBook(books, { author: "X" }), RangeError);
  assert.throws(() => addBook(books, { title: "C", author: "X", stock: -1 }), RangeError);
});

test("POST /api/books は 201 と id 付きの書籍を返し、不正なら 400", async () => {
  await withApp(async (app) => {
    const post = (body) =>
      app(`/api/books`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const ok = await post({ title: "Neuromancer", author: "William Gibson", isbn: "9780441569595", stock: 1 });
    assert.equal(ok.status, 201);
    const created = await ok.json();
    assert.equal(created.id, 6);
    assert.equal(created.title, "Neuromancer");
    const got = await app(`/api/books/${created.id}`);
    assert.equal(got.status, 200);
    const bad = await post({ author: "nobody" });
    assert.equal(bad.status, 400);
  });
});

test("POST /api/books は必須フィールドと stock の型・範囲を検証する", async () => {
  await withApp(async (app) => {
    const post = (body) =>
      app(`/api/books`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const valid = { title: "T", author: "A", isbn: "1", stock: 1 };
    for (const field of ["title", "author", "isbn"]) {
      for (const value of [undefined, "", null, 5]) {
        const res = await post({ ...valid, [field]: value });
        assert.equal(res.status, 400, `${field}=${JSON.stringify(value)}`);
        assert.ok((await res.json()).error);
      }
    }
    for (const value of [undefined, -1, 1.5, "3", null]) {
      const res = await post({ ...valid, stock: value });
      assert.equal(res.status, 400, `stock=${JSON.stringify(value)}`);
    }
    assert.equal((await post(null)).status, 400);
    assert.equal((await post({ ...valid, stock: 0 })).status, 201);
  });
});
