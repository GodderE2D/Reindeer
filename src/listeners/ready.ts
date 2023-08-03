import { Events, Listener } from "@sapphire/framework";
import { Client } from "discord.js";

import { logger } from "../index.js";

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      once: true,
      event: Events.ClientReady,
    });
  }
  public async run(client: Client<true>) {
    logger.info("Bot is ready.");
    logger.info(`Logged in as ${client.user.tag} (${client.user.id}).`);
  }
}
