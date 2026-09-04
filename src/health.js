import http from "node:http";

/**
 * Railway 等で PORT ヘルスチェックが必要なときだけ起動する。
 * bot-hosting.net では不要なのでデフォルト OFF。
 * ENABLE_HEALTH=1 または PORT が明示されているときだけ起動。
 */
export function startHealthServer() {
  const enabled =
    process.env.ENABLE_HEALTH === "1" ||
    process.env.ENABLE_HEALTH === "true" ||
    Boolean(process.env.PORT);

  if (!enabled) {
    console.log("[health] skipped (bot-hosting 等では不要。必要なら ENABLE_HEALTH=1)");
    return null;
  }

  const port = Number(process.env.PORT) || 8080;
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`[health] http://0.0.0.0:${port}`);
  });
  server.on("error", (err) => {
    console.warn("[health] server error:", err.message);
  });
  return server;
}
