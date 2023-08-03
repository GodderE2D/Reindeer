import { Events, Listener } from "@sapphire/framework";
import { Guild } from "discord.js";

import sendable from "../functions/sendable.js";
import { client, env, logger } from "../index.js";

let warnedDevelopment = false;
let warnedVerified = false;

export class LimitGuildsListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.GuildCreate,
    });
  }
  public async run(guild: Guild) {
    if (env.NODE_ENV === "development") {
      if (!warnedDevelopment) logger.info("Environment detected as development - not limiting guilds.");
      return (warnedDevelopment = true);
    }

    if (client.guilds.cache.size > 100) {
      if (!warnedVerified) {
        logger.info(
          `Bot is in ${client.guilds.cache.size}/100 guilds, meaning it's likely verified - not limiting guilds.`,
        );
      }
      return (warnedVerified = true);
    }

    const guildsByOwner = guild.client.guilds.cache.filter((g) => guild.ownerId === g.ownerId);

    if (guildsByOwner.size <= 3) return;

    logger.info(
      `Threshold of 3 guilds exceeded for owner ${guild.ownerId} while joining guild '${guild.name}' (${guild.id}).`,
    );

    const message = [
      `Hi <@${guild.ownerId}>,`,
      "",
      `You have exceeded the maximum of 3 servers owned with Reindeer added. To prevent Discord from potentially flagging the bot for inorganic growth while it's unverified, Reindeer will leave your server **${guild.name}** (\`${guild.id}\`).`,
      "",
      "If you wish to add Reindeer to this server, please remove it from another server you own or wait until it's verified. You can join our [support server](https://discord.gg/R2FDvcPXTK) for updates. Thank you for your understanding.",
      "",
      "Best regards,",
      "Reindeer Development Team (by Blue Shark River)",
    ].join("\n");

    try {
      await client.users.send(guild.ownerId, message);
    } catch {
      const channelAttemptsOrder = [
        guild.publicUpdatesChannel,
        guild.systemChannel,
        guild.channels.cache.find((c) => sendable(c) && c.name.includes("general")),
        guild.channels.cache.find((c) => sendable(c)),
      ];

      for (const channel of channelAttemptsOrder) {
        if (!channel?.isTextBased()) continue;
        if (!sendable(channel)) continue;

        if (!(await channel.send(message).catch(() => undefined))) break;
      }
    }

    return await guild.leave();
  }
}
