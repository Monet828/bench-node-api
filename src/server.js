import http from "node:http";
import { seedBooks } from "./data.js";
import { addBook, adjustStock, getBook, listBooks } from "./books.js";

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let text = "";
  for await (const chunk of req) text += chunk;
  if (text === "") return {};
  return JSON.parse(text);
}

/** 要求を処理する関数を作る。books はこのサーバーだけの在庫。試験はこの関数を直接呼ぶ（tests/helpers/app.js）。 */
export function createHandler(books = seedBooks()) {
  return async function handle(req, res) {
    const url = new URL(req.url, "http://localhost");
    try {
      if (req.method === "GET" && url.pathname === "/api/books") {
        return send(res, 200, listBooks(books, Object.fromEntries(url.searchParams)));
      }
      if (req.method === "POST" && url.pathname === "/api/books") {
        let body;
        try {
          body = await readJson(req);
        } catch {
          return send(res, 400, { error: "invalid_json" });
        }
        const input = body ?? {};
        for (const field of ["title", "author", "isbn"]) {
          if (typeof input[field] !== "string" || input[field] === "") {
            return send(res, 400, { error: "invalid_book", message: `${field} は空でない文字列` });
          }
        }
        if (!Number.isInteger(input.stock) || input.stock < 0) {
          return send(res, 400, { error: "invalid_book", message: "stock は 0 以上の整数" });
        }
        try {
          return send(res, 201, addBook(books, body));
        } catch (error) {
          if (error instanceof RangeError) return send(res, 400, { error: "invalid_book", message: error.message });
          throw error;
        }
      }
      const one = url.pathname.match(/^\/api\/books\/(\d+)$/);
      if (req.method === "GET" && one) {
        const book = getBook(books, Number(one[1]));
        return book ? send(res, 200, book) : send(res, 404, { error: "not_found" });
      }
      const stock = url.pathname.match(/^\/api\/books\/(\d+)\/stock$/);
      if (req.method === "POST" && stock) {
        let body;
        try {
          body = await readJson(req);
        } catch {
          return send(res, 400, { error: "invalid_json" });
        }
        try {
          const book = adjustStock(books, Number(stock[1]), body.delta);
          return book ? send(res, 200, book) : send(res, 404, { error: "not_found" });
        } catch (error) {
          if (error instanceof RangeError) return send(res, 400, { error: "invalid_delta", message: error.message });
          throw error;
        }
      }
      send(res, 404, { error: "not_found" });
    } catch {
      send(res, 500, { error: "internal_error" });
    }
  };
}

/** HTTP サーバーを作る（listen はしない）。 */
export function createServer(books = seedBooks()) {
  return http.createServer(createHandler(books));
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  createServer().listen(port, () => console.log(`listening on ${port}`));
}
