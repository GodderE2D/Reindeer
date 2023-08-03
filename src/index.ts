import "dotenv/config";

import process from "node:process";

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { PrismaClient } from "@prisma/client";
import { SapphireClient } from "@sapphire/framework";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import relativeTime from "dayjs/plugin/relativeTime.js";
import { Collection, Snowflake, version } from "discord.js";
import { Partials } from "discord.js";
import Fastify from "fastify";

import { intents } from "./constants/intents.js";
import { makeCache } from "./constants/makeCache.js";
import envVarCheck from "./functions/envCheck.js";
import Logger from "./logger.js";
import * as routes from "./routes.js";

// Logger
export const logger = new Logger();
logger.info("Logger initialised.");
logger.info(`Using Node.js version ${process.versions.node}`);
logger.info(`Using discord.js version ${version}`);

// Environment variables
export const env = envVarCheck(process.env);
logger.info(`Node environment: ${env.NODE_ENV}`);

// Dayjs plugins
dayjs.extend(duration);
dayjs.extend(relativeTime);

// Prisma client
export const prisma = new PrismaClient();

try {
  logger.info("Connecting to database...");
  await prisma.$connect();
  logger.info("Connected to database.");
} catch (error) {
  logger.error("Could not connect to database.\n", error);
}

// Sapphire client
export const client = new SapphireClient({
  intents,
  partials: [Partials.Message],
  makeCache,
});

client.login(env.DISCORD_TOKEN);

// Create collections
export const commandsRan = new Collection<Snowflake, { createdAt: Date; name: string }>();

// Catch uncaught errors
process.on("unhandledRejection", (err) => logger.error("Encountered an unhandled promise rejection:", err));
process.on("uncaughtException", (err) => logger.error("Encountered an uncaught exception:", err));

// Fastify client
const fastify = Fastify();

await fastify.register(cors, {
  origin: "*",
});

await fastify.register(helmet);

for (const plugin of Object.values(routes)) {
  await fastify.register(plugin);
}

if (!Number(env.API_PORT)) {
  throw new Error("API_PORT environment variable must be a number.");
}

fastify.listen({ port: parseInt(env.API_PORT), host: "0.0.0.0" }, (error, address) => {
  if (error) {
    logger.error("An error occurred when trying to initialise the API:", error);
    process.exit(1);
  }

  logger.info(`API server listening at ${address}.`);
});
