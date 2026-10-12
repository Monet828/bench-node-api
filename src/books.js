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

/** 既に同じ isbn の書籍があるときの誤り（HTTP では 409 ISBN_DUPLICATE）。 */
export class IsbnDuplicateError extends Error {
  constructor(isbn) {
    super(`isbn ${isbn} は登録済み`);
    this.code = "ISBN_DUPLICATE";
  }
}

/** 書籍を登録して返す。id は採番する。isbn が登録済みなら IsbnDuplicateError。title・author・isbn が文字列でなければ TypeError、stock は 0 以上の整数（省略時 0）。 */
export function newBook(books, input = {}) {
  const { title, author, isbn, stock = 0 } = input;
  for (const value of [title, author, isbn]) {
    if (typeof value !== "string" || value === "") throw new TypeError("title・author・isbn は文字列");
  }
  if (!Number.isInteger(stock) || stock < 0) throw new RangeError("stock は 0 以上の整数");
  if (books.some((b) => b.isbn === isbn)) throw new IsbnDuplicateError(isbn);
  const book = { id: Math.max(0, ...books.map((b) => b.id)) + 1, title, author, isbn, stock };
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
