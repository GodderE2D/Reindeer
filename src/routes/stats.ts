import { FastifyPluginCallback } from "fastify";

import { client, commandsRan } from "../index.js";

export const stats: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get("/api/stats", (req, res) => {
    const memberCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const commandsRanInPastDay = commandsRan.filter(
      ({ createdAt }) => createdAt.getTime() > Date.now() - 86_400_000,
    ).size;

    return res.status(200).send({
      success: true,
      guildCount: client.guilds.cache.size,
      memberCount,
      channelCount: client.channels.cache.size,
      commandsRanInPastDay,
    });
  });

  done();
};
