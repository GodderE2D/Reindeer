import process from "node:process";

import { z } from "zod";

import { logger } from "../index.js";

const envVarCheck = (env: NodeJS.ProcessEnv = process.env) => {
  const schema = z.object({
    DISCORD_TOKEN: z.string(),
    DB_CONNECTION_URL: z.string(),
    TOPGG_TOKEN: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
    DEVELOPMENT_GUILD_ID: z.string(),
    BOT_OWNER_ID: z.string(),
    ERROR_LOGS_CHANNEL_ID: z.string(),
    NODE_ENV: z.enum(["development", "production"]),

    API_PORT: z.string().optional(),
    API_KEY: z.string().optional(),
  });

  const parsedEnv = schema.parse(env);

  logger.info("Environment variables are valid.");

  return parsedEnv;
};

export default envVarCheck;
