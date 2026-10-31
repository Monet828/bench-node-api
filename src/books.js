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
  const items = matched.slice((page - 1) * size, page * size);
  return { books: items, total: items.length, page };
}

/** id の書籍を返す。無ければ null。 */
export function getBook(books, id) {
  return books.find((b) => b.id === id) ?? null;
}

/** 新しい書籍を作って books に追加し、返す。id は最大 id + 1。不正な入力は RangeError。 */
export function addBook(books, data) {
  const { title, author, isbn = "", stock = 0 } = data ?? {};
  if (typeof title !== "string" || title === "") throw new RangeError("title は空でない文字列");
  if (typeof author !== "string" || author === "") throw new RangeError("author は空でない文字列");
  if (typeof isbn !== "string") throw new RangeError("isbn は文字列");
  if (!Number.isInteger(stock) || stock < 0) throw new RangeError("stock は 0 以上の整数");
  const id = books.reduce((max, b) => Math.max(max, b.id), 0) + 1;
  const book = { id, title, author, isbn, stock };
  books.push(book);
  return book;
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
