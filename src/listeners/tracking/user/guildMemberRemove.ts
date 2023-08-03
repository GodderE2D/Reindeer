import { Events, Listener } from "@sapphire/framework";
import { EmbedBuilder, GuildMember } from "discord.js";

import colours from "../../../constants/colours.js";
import { sendTrackingLog } from "../../../functions/tracking/sendTrackingLog.js";
import { prisma } from "../../../index.js";

export class TrackingGuildMemberRemoveListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.GuildMemberRemove,
    });
  }
  public async run(member: GuildMember) {
    const trackers = await prisma.trackedContent.findMany({
      where: { type: "User", contentId: member.id },
      include: { report: true },
    });

    if (!trackers.length) return;

    for (const tracker of trackers) {
      const embed = new EmbedBuilder()
        .setColor(colours.error)
        .setDescription(`Tracked user ${member} has left the server.`);

      sendTrackingLog(tracker, embed, member);
    }
  }
}
