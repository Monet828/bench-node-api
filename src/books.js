/**
 * 書籍の在庫の操作。books は呼び出し側が持つ配列（サーバーごとに 1 つ）。
 * 返す形は README.md のとおり。
 */

/** GET /api/books の中身。q で書名を絞り込み、page・size でページに分ける。 */
export function listBooks(books, query = {}) {
  const q = query.q || null;
  const page = Number(query.page ?? 1);
  const size = Number(query.size ?? 20);
  const matched = q ? books.filter((b) => b.title.includes(q)) : books;
  const total = matched.length;
  const items = matched.slice((page - 1) * size, page * size);
  return { books: items, total, page };
}

/** id の書籍を返す。無ければ null。 */
export function getBook(books, id) {
  return books.find((b) => b.id === id) ?? null;
}

/** 在庫を delta だけ増減する。無ければ null。在庫は 0 未満にならない。 */
export function adjustStock(books, id, delta) {
  const book = getBook(books, id);
  if (!book) return null;
  if (!Number.isInteger(delta)) throw new RangeError("delta は整数");
  if (book.stock + delta < 0) throw new RangeError("在庫が足りない");
  book.stock += delta;
  return book;
}
