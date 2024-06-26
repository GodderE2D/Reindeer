import { Events, Listener } from "@sapphire/framework";
import { EmbedBuilder, Message } from "discord.js";

import colours from "../../../constants/colours.js";
import { sendTrackingLog } from "../../../functions/tracking/sendTrackingLog.js";
import { prisma, trackedMessagesCache, trackedUsersCache } from "../../../index.js";

export class TrackingMessageDeleteListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.MessageDelete,
    });
  }
  public async run(message: Message) {
    if (!message.inGuild()) return;

    const trackers = await prisma.trackedContent.findMany({
      where: { type: "Message", contentId: message.id, guildId: message.guild.id },
      include: { report: true },
    });

    if (!trackers.length) return;

    for (const tracker of trackers) {
      const embed = new EmbedBuilder()
        .setColor(colours.fuchsia)
        .setDescription(
          `Tracked message in ${message.channel} has been deleted. This message tracker will now be deleted.`,
        )
        .addFields({
          // accounting for partials
          name: `Message content (${message.content ? `${message.content.length} chars` : "uncached"})`,
          value: message.content
            ? message.content.slice(0, 1024) || "*No message content.*"
            : "*Message was uncached.*",
        })
        .setImage(
          message.attachments.filter((attachment) => attachment.contentType?.startsWith("image")).first()?.url ?? null,
        );

      await sendTrackingLog(tracker, embed, message.author);

      if (tracker.type === "User") trackedUsersCache.delete(tracker.contentId);
      else trackedMessagesCache.delete(tracker.contentId);

      await prisma.trackedContent.delete({ where: { id: tracker.id } });
    }
  }
}
