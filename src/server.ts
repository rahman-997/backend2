import app from "./app.js";
import { env } from "./config/env.js";
import { closeDatabase } from "./config/database.js";

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`API listening on http://${env.HOST}:${env.PORT}`);
});

// Protect the process from connections that never finish and keep HTTP timeouts explicit.
server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 5_000;

let shuttingDown = false;

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down gracefully`);

  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out");
    process.exitCode = 1;
    server.closeAllConnections();
  }, 10_000);
  forceExit.unref();

  server.close(async (error) => {
    if (error) {
      console.error("Graceful shutdown failed", error);
      process.exitCode = 1;
      clearTimeout(forceExit);
      return;
    }

    try {
      await closeDatabase();
      process.exitCode = 0;
    } catch (closeError) {
      console.error("Database shutdown failed", closeError);
      process.exitCode = 1;
    } finally {
      clearTimeout(forceExit);
    }
  });
};

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
