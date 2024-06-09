import "dotenv/config";

import process from "node:process";
import { setInterval } from "node:timers";

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { PrismaClient } from "@prisma/client";
import { SapphireClient } from "@sapphire/framework";
import Sentry from "@sentry/node";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import relativeTime from "dayjs/plugin/relativeTime.js";
import { Collection, Snowflake, version } from "discord.js";
import { Partials } from "discord.js";
import Fastify from "fastify";
import { AutoPoster } from "topgg-autoposter";

import { intents } from "./constants/intents.js";
import { makeCache } from "./constants/makeCache.js";
import { fetchBotBlacklist } from "./functions/botBlacklistCache.js";
import envVarCheck from "./functions/envCheck.js";
import { cacheStats, registerMetrics } from "./functions/registerMetrics.js";
import { runVoteReminder } from "./functions/runVoteReminder.js";
import { fetchTrackedContent } from "./functions/trackedContentCache.js";
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

// Initialise Sentry
if (env.NODE_ENV === "production" && env.SENTRY_DSN?.length) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
  });
}

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

// Top.gg statistics
if (env.NODE_ENV === "production" && env.TOPGG_TOKEN?.length) {
  const poster = AutoPoster(env.TOPGG_TOKEN, client);
  poster.on("error", (error) => {
    logger.error("Top.gg AutoPoster received an error:", error);
    Sentry.captureException(error, { extra: { type: "topgg-autoposter" } });
  });
}

// Create collections
export const commandsRan = new Collection<Snowflake, { createdAt: Date; name: string }>();
export const memberCache = new Collection<Snowflake, Snowflake[]>();

// Tracked content cache
export const trackedUsersCache = new Set<Snowflake>();
export const trackedMessagesCache = new Set<Snowflake>();
fetchTrackedContent(trackedUsersCache, trackedMessagesCache);
setInterval(() => fetchTrackedContent(trackedUsersCache, trackedMessagesCache), 30_000); // Fallback in case of a change outside of the process

// Bot blacklist cache
export const botBlacklistCache = new Set<string>();
fetchBotBlacklist(botBlacklistCache);
setInterval(() => fetchBotBlacklist(botBlacklistCache), 30_000); // Fallback in case of a change outside of the process

// Catch uncaught errors
process.on("unhandledRejection", (err) => logger.error("Encountered an unhandled promise rejection:", err));
process.on("uncaughtException", (err) => logger.error("Encountered an uncaught exception:", err));

// Vote reminders
setInterval(() => runVoteReminder(), 60_000);

// Prometheus metrics
registerMetrics();
cacheStats();
setInterval(() => cacheStats(), 30_000);

// Fastify client
if (env.API_KEY?.length) {
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

  fastify.listen({ port: parseInt(env.API_PORT || "3000"), host: "0.0.0.0" }, (error, address) => {
    if (error) {
      return logger.error("An error occurred when trying to initialise the API:", error);
    }

    logger.info(`API server listening at ${address}.`);
  });
}
