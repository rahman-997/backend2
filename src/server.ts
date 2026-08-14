import app from "./app.js";
import { env } from "./config/env.js";
import { closeDatabase } from "./config/database.js";
const server=app.listen(env.PORT,env.HOST,()=>console.log(`API listening on http://${env.HOST}:${env.PORT}`));
const shutdown=async(signal:string)=>{console.log(`${signal} received, shutting down gracefully`);server.close(async(error)=>{if(error){console.error("Graceful shutdown failed",error);process.exitCode=1;return;}await closeDatabase();process.exitCode=0;});};
process.once("SIGTERM",()=>void shutdown("SIGTERM")); process.once("SIGINT",()=>void shutdown("SIGINT"));
