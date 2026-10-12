import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../src/server.js";
import { adjustStock, getBook, listBooks } from "../src/books.js";
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

test("POST /api/books registers a book", async () => {
  await withApp(async (app) => {
    const res = await app(`/api/books`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Neuromancer", author: "William Gibson", isbn: "9780441569595", stock: 3 }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.id, 6);
    assert.equal(body.title, "Neuromancer");
    assert.equal(body.stock, 3);
    const fetched = await app(`/api/books/${body.id}`);
    assert.equal(fetched.status, 200);
  });
});

test("POST /api/books は isbn が重複すると 409", async () => {
  await withApp(async (app) => {
    const res = await app(`/api/books`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Another Hobbit", author: "Someone", isbn: "9780547928227" }),
    });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, "duplicate_isbn");
    const list = await (await app(`/api/books`)).json();
    assert.equal(list.books.length, 5);
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
