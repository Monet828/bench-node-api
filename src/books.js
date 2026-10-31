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

/** 登録する書籍の入力を検める。title・author・isbn は空でない文字列、stock は 0 以上の整数。不正なら RangeError。 */
export function validateBook(input = {}) {
  const { title, author, isbn, stock } = input ?? {};
  for (const [name, value] of Object.entries({ title, author, isbn })) {
    if (typeof value !== "string" || value.trim() === "") throw new RangeError(`${name} は空でない文字列`);
  }
  if (!Number.isInteger(stock) || stock < 0) throw new RangeError("stock は 0 以上の整数");
}

/** isbn が既に books にあるか。 */
export function hasIsbn(books, isbn) {
  return books.some((b) => b.isbn === isbn);
}

/** isbn が重複したときの誤り（HTTP では 409）。 */
export class DuplicateIsbnError extends Error {}

/** 新しい書籍を追加し、発行した id を付けて返す。入力が不正なら RangeError、isbn が既にあれば DuplicateIsbnError。 */
export function addBook(books, input = {}) {
  validateBook(input);
  const { title, author, isbn, stock } = input;
  if (hasIsbn(books, isbn)) throw new DuplicateIsbnError(`isbn ${isbn} は登録済み`);
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
