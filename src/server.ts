import { app } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db/prisma.js";
import { logger } from "./observability/logger.js";
import { closeRedis } from "./redis/client.js";

const server = app.listen(config.PORT, config.HOST, () => {
  logger.info("server.started", {
    host: config.HOST,
    port: config.PORT,
    node: process.version,
    environment: config.NODE_ENV,
  });
});

server.requestTimeout = config.REQUEST_TIMEOUT_MS;
server.headersTimeout = Math.min(config.REQUEST_TIMEOUT_MS + 5_000, 120_000);
server.keepAliveTimeout = 5_000;
server.maxRequestsPerSocket = 1_000;

server.on("clientError", (error, socket) => {
  logger.warn("server.client_error", { message: error.message });
  if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
});

let shuttingDown = false;
async function shutdown(signal: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("server.shutdown_started", { signal, exitCode });

  const forceTimer = setTimeout(() => {
    logger.error("server.shutdown_forced", { signal });
    server.closeAllConnections();
    process.exit(1);
  }, config.SHUTDOWN_GRACE_MS);
  forceTimer.unref();

  server.close(async (error) => {
    if (error) logger.error("server.close_error", { error });
    await Promise.allSettled([closeRedis(), prisma.$disconnect()]);
    clearTimeout(forceTimer);
    logger.info("server.shutdown_complete", { signal });
    process.exit(error ? 1 : exitCode);
  });
  server.closeIdleConnections();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error("process.unhandled_rejection", { reason });
  void shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (error) => {
  logger.error("process.uncaught_exception", { error });
  void shutdown("uncaughtException", 1);
});
