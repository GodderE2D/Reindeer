import { Events, Listener } from "@sapphire/framework";
import { EmbedBuilder, GuildMember } from "discord.js";

import colours from "../../../constants/colours.js";
import { sendTrackingLog } from "../../../functions/tracking/sendTrackingLog.js";
import { prisma } from "../../../index.js";

export class TrackingGuildMemberAddListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.GuildMemberAdd,
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
        .setColor(colours.green)
        .setDescription(`Tracked user ${member} has joined the server.`);

      sendTrackingLog(tracker, embed, member);
    }
  }
}
