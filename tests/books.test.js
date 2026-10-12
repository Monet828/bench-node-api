import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.js";
import { adjustStock, getBook, listBooks } from "../src/books.js";
import { seedBooks } from "../src/data.js";

async function withServer(fn) {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
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
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/books`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.books.length, 5);
  });
});

test("GET /api/books/:id は 1 冊を返し、無ければ 404", async () => {
  await withServer(async (base) => {
    const ok = await fetch(`${base}/api/books/3`);
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).title, "Kafka on the Shore");
    const missing = await fetch(`${base}/api/books/99`);
    assert.equal(missing.status, 404);
  });
});

test("POST /api/books/:id/stock は在庫を変え、足りなければ 400", async () => {
  await withServer(async (base) => {
    const post = (id, body) =>
      fetch(`${base}/api/books/${id}/stock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const ok = await post(1, { delta: 2 });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).stock, 6);
    const short = await post(2, { delta: -1 });
    assert.equal(short.status, 400);
  });
});
