// 書籍の初期データ（開発用。本番では DB から読む）。
export const SEED_BOOKS = [
  { id: 1, title: "The Hobbit", author: "J.R.R. Tolkien", isbn: "9780547928227", stock: 4 },
  { id: 2, title: "Dune", author: "Frank Herbert", isbn: "9780441172719", stock: 0 },
  { id: 3, title: "Kafka on the Shore", author: "Haruki Murakami", isbn: "9781400079278", stock: 7 },
  { id: 4, title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", isbn: "9780441478125", stock: 2 },
  { id: 5, title: "Norwegian Wood", author: "Haruki Murakami", isbn: "9780375704024", stock: 3 },
];

/** 初期データの写しを返す（試験やサーバーごとに独立した在庫にするため）。 */
export function seedBooks() {
  return SEED_BOOKS.map((b) => ({ ...b }));
}
