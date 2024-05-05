import { Events, Listener } from "@sapphire/framework";
import { Client } from "discord.js";
import { setTimeout } from "timers/promises";

import { cacheMembers } from "../../functions/cacheMembers.js";
import { logger, prisma } from "../../index.js";

export class CacheMembersListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: true,
      event: Events.ClientReady,
    });
  }
  public async run(client: Client<true>) {
    await setTimeout(1000);
    logger.info("Caching members for DM reports...");

    const startTime = Date.now();
    let total = 0;

    const guilds = await prisma.guild.findMany({ where: { dmReportsEnabled: true } });

    for (const { guildId } of guilds) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;

      total += (await cacheMembers(guild)) ?? 0;
    }

    logger.info(`Cached ${total} members from ${guilds.length} eligible guilds in ${Date.now() - startTime}ms.`);
  }
}
