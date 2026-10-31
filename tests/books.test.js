import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../src/server.js";
import { addBook, adjustStock, DuplicateIsbnError, getBook, isIsbnDuplicate, listBooks } from "../src/books.js";
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

test("isIsbnDuplicate は既存の isbn で true、無ければ false", () => {
  const books = seedBooks();
  assert.equal(isIsbnDuplicate(books, books[0].isbn), true);
  assert.equal(isIsbnDuplicate(books, "0000000000000"), false);
});

test("addBook は isbn が重複すると DuplicateIsbnError を投げ、登録しない", () => {
  const books = seedBooks();
  const before = books.length;
  assert.throws(
    () => addBook(books, { title: "Dup", author: "x", isbn: books[0].isbn, stock: 1 }),
    DuplicateIsbnError,
  );
  assert.equal(books.length, before);
});

test("POST /api/books は isbn が既存と重複すると 409", async () => {
  await withApp(async (app) => {
    const existing = (await (await app(`/api/books/1`)).json()).isbn;
    const res = await app(`/api/books`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Dup", author: "x", isbn: existing, stock: 1 }),
    });
    assert.equal(res.status, 409);
  });
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

test("POST /api/books は書籍を登録して 201 と新しい id を返す", async () => {
  await withApp(async (app) => {
    const post = (body) =>
      app(`/api/books`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const res = await post({ title: "Snow Crash", author: "Neal Stephenson", isbn: "9780553380958", stock: 5 });
    assert.equal(res.status, 201);
    const created = await res.json();
    assert.equal(created.id, 6);
    assert.equal(created.title, "Snow Crash");
    assert.equal((await (await app(`/api/books/6`)).json()).author, "Neal Stephenson");
    const bad = await post({ author: "x" });
    assert.equal(bad.status, 400);
  });
});

test("POST /api/books は title・author・isbn・stock が不正なら 400", async () => {
  await withApp(async (app) => {
    const valid = { title: "Snow Crash", author: "Neal Stephenson", isbn: "9780553380958", stock: 5 };
    const post = (body) =>
      app(`/api/books`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    for (const key of ["title", "author", "isbn"]) {
      for (const value of [null, undefined, ""]) {
        assert.equal((await post({ ...valid, [key]: value })).status, 400, `${key}=${value}`);
      }
    }
    for (const value of [null, undefined, -1, 1.5, "5"]) {
      assert.equal((await post({ ...valid, stock: value })).status, 400, `stock=${value}`);
    }
    assert.equal((await post({ ...valid, stock: 0 })).status, 201);
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
