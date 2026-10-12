// 試験用：ソケットを使わずに handler（createHandler() が返す関数）を呼ぶ。
// 評価の sandbox は localhost への通信を禁じているので、試験では listen も fetch もしない。
// 偽の req（method・url・headers、本文は Readable で流す）と、status・headers・本文を受ける偽の res を渡し、
// res.end() が呼ばれるのを待って、fetch の応答に似た { status, headers, text(), json() } を返す。
import { Readable } from "node:stream";

/** fetch(url, init) と同じ形で handler を呼ぶ。path は "/api/books?size=2" のような形。 */
export function request(handler, path, { method = "GET", headers = {}, body } = {}) {
  const chunks = body === undefined || body === null ? [] : [Buffer.from(body)];
  const req = Readable.from(chunks);
  req.method = method;
  req.url = path;
  req.headers = { host: "localhost" };
  for (const [k, v] of Object.entries(headers)) req.headers[k.toLowerCase()] = String(v);
  if (chunks.length) req.headers["content-length"] = String(chunks[0].length);

  return new Promise((resolve, reject) => {
    const out = [];
    const resHeaders = {};
    const timer = setTimeout(() => reject(new Error(`${method} ${path}：応答が 5 秒以内に終わらない（res.end() が呼ばれない）`)), 5000);
    const res = {
      statusCode: 200,
      statusMessage: "",
      headersSent: false,
      writableEnded: false,
      setHeader(name, value) {
        resHeaders[name.toLowerCase()] = value;
        return res;
      },
      getHeader: (name) => resHeaders[name.toLowerCase()],
      getHeaders: () => ({ ...resHeaders }),
      hasHeader: (name) => name.toLowerCase() in resHeaders,
      removeHeader(name) {
        delete resHeaders[name.toLowerCase()];
      },
      writeHead(status, message, headers) {
        res.statusCode = status;
        const h = typeof message === "string" ? headers : message;
        if (Array.isArray(h)) for (let i = 0; i < h.length; i += 2) res.setHeader(h[i], h[i + 1]);
        else if (h) for (const [k, v] of Object.entries(h)) res.setHeader(k, v);
        res.headersSent = true;
        return res;
      },
      write(chunk, encoding, cb) {
        if (typeof encoding === "function") [cb, encoding] = [encoding, undefined];
        if (chunk !== undefined && chunk !== null) out.push(Buffer.from(chunk, encoding));
        res.headersSent = true;
        if (typeof cb === "function") cb();
        return true;
      },
      end(chunk, encoding, cb) {
        if (typeof chunk === "function") [cb, chunk] = [chunk, undefined];
        if (typeof encoding === "function") [cb, encoding] = [encoding, undefined];
        if (res.writableEnded) return res;
        if (chunk !== undefined && chunk !== null) out.push(Buffer.from(chunk, encoding));
        res.headersSent = true;
        res.writableEnded = true;
        clearTimeout(timer);
        const text = Buffer.concat(out).toString("utf8");
        resolve({ status: res.statusCode, headers: { ...resHeaders }, text: async () => text, json: async () => JSON.parse(text) });
        if (typeof cb === "function") cb();
        return res;
      },
    };
    // handler は同期でも非同期でもよい。res.end() を待つ。handler が投げたらその誤りで落とす。
    Promise.resolve()
      .then(() => handler(req, res))
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
