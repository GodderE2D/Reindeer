import { Events, Listener } from "@sapphire/framework";
import { EmbedBuilder, Message } from "discord.js";

import colours from "../../../constants/colours.js";
import { sendTrackingLog } from "../../../functions/tracking/sendTrackingLog.js";
import { prisma } from "../../../index.js";

export class TrackingMessageUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.MessageUpdate,
    });
  }
  public async run(oldMessage: Message, newMessage: Message) {
    if (!newMessage.inGuild()) return;

    const trackers = await prisma.trackedContent.findMany({
      where: { type: "Message", contentId: newMessage.id, guildId: newMessage.guild.id },
      include: { report: true },
    });

    if (!trackers.length) return;

    for (const tracker of trackers) {
      const embed = new EmbedBuilder()
        .setColor(colours.warning)
        .setDescription(`Tracked message ${newMessage.url} has been edited.`)
        .addFields(
          {
            // accounting for partials
            name: `Old message content (${oldMessage.content ? `${oldMessage.content.length} chars` : "uncached"})`,
            value: oldMessage.content
              ? oldMessage.content.slice(0, 1024) || "*No message content.*"
              : "*Old message was uncached.*",
          },
          {
            name: `New message content (${newMessage.content.length} chars)`,
            value: newMessage.content.slice(0, 1024) || "*No message content.*",
          },
        )
        .setImage(
          newMessage.attachments.filter((attachment) => attachment.contentType?.startsWith("image")).first()?.url ??
            null,
        );

      sendTrackingLog(tracker, embed, newMessage.author);
    }
  }
}
