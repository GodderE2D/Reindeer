import { Events, Listener } from "@sapphire/framework";
import { Client } from "discord.js";

import { logger, prisma } from "../../index.js";

export class FetchAllTrackedContentListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: true,
      event: Events.ClientReady,
    });
  }
  public async run(client: Client<true>) {
    let totalFetched = 0;

    const trackers = (
      await prisma.trackedContent.findMany({
        orderBy: { createdAt: "desc" },
        include: { guild: true },
      })
    ).slice(0, 100);

    for (const tracker of trackers) {
      if (tracker.type === "Message") {
        const channel = client.channels.cache.get(tracker.channelId ?? "");
        if (!channel?.isTextBased()) return;

        const message = await channel.messages.fetch(tracker.contentId).catch(() => undefined);
        if (message) totalFetched++;
      } else {
        const guild = client.guilds.cache.get(tracker.guildId);
        if (!guild) return;

        const member = await guild.members.fetch(tracker.contentId).catch(() => undefined);
        if (member) totalFetched++;
      }
    }

    logger.info(`Fetched ${totalFetched} tracked content.`);
  }
}
