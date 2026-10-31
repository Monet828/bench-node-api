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

/** 在庫を delta だけ増減する。無ければ null。在庫は 0 未満にならない。 */
export function adjustStock(books, id, delta) {
  const book = getBook(books, id);
  if (!book) return null;
  if (!Number.isInteger(delta)) throw new RangeError("delta は整数");
  if (book.stock + delta < 0) throw new RangeError("在庫が足りない");
  book.stock += delta;
  return book;
}

/** 書籍の入力を検べる。問題があれば理由の文字列、無ければ null。 */
export function validateNewBook(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return "本文はオブジェクト";
  for (const key of ["title", "author", "isbn"]) {
    if (typeof input[key] !== "string" || input[key].trim() === "") return `${key} は空でない文字列`;
  }
  if (!Number.isInteger(input.stock) || input.stock < 0) return "stock は 0 以上の整数";
  return null;
}

/** 書籍を登録して返す。isbn が既にあれば RangeError。 */
export function addBook(books, input) {
  const isbn = input.isbn.trim();
  if (books.some((b) => b.isbn === isbn)) throw new RangeError("isbn が重複");
  const id = books.reduce((max, b) => Math.max(max, b.id), 0) + 1;
  const book = { id, title: input.title.trim(), author: input.author.trim(), isbn, stock: input.stock };
  books.push(book);
  return book;
}
