import { app } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db/prisma.js";
import { closeRedis } from "./redis/client.js";

const server = app.listen(config.PORT, config.HOST, () => {
  console.log(`Eventify listening on http://${config.HOST}:${config.PORT}`);
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shutdown] ${signal}`);
  const forceTimer = setTimeout(() => process.exit(1), 10_000);
  forceTimer.unref();
  server.close(async () => {
    await Promise.allSettled([closeRedis(), prisma.$disconnect()]);
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
