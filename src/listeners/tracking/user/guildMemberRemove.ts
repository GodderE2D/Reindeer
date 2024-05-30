import { Events, Listener } from "@sapphire/framework";
import { AuditLogEvent, EmbedBuilder, GuildMember } from "discord.js";

import colours from "../../../constants/colours.js";
import { sendTrackingLog } from "../../../functions/tracking/sendTrackingLog.js";
import { prisma } from "../../../index.js";

export class TrackingGuildMemberRemoveListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.GuildMemberRemove,
    });
  }

  public async run(member: GuildMember) {
    // This event sometimes invokes even though the member has never left.
    if (await member.fetch().catch(() => undefined)) return;

    const trackers = await prisma.trackedContent.findMany({
      where: { type: "User", contentId: member.id, guildId: member.guild.id },
      include: { report: true },
    });

    if (!trackers.length) return;

    for (const tracker of trackers) {
      const { entries: banEntries } = await member.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanAdd,
        limit: 10,
      });

      const banEntry = banEntries.find(
        (entry) => entry.targetId === member.id && Date.now() - entry.createdTimestamp < 5_000,
      );

      const { entries: kickEntries } = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 10 });
      const kickEntry = kickEntries.find(
        (entry) => entry.targetId === member.id && Date.now() - entry.createdTimestamp < 5_000,
      );

      if (banEntry) {
        const embed = new EmbedBuilder()
          .setColor(colours.error)
          .setDescription(
            `Tracked user ${member} has ${
              banEntry
                ? `been banned by <@${banEntry.executorId}> for:\n>>> ${banEntry.reason || "*No reason provided.*"}`
                : "left the server."
            }`,
          );

        sendTrackingLog(tracker, embed, member.user);
      } else if (kickEntry) {
        const embed = new EmbedBuilder()
          .setColor(colours.orange)
          .setDescription(
            `Tracked user ${member} has ${
              kickEntry
                ? `been kicked by <@${kickEntry.executorId}> for:\n>>> ${kickEntry.reason || "*No reason provided.*"}`
                : "left the server."
            }`,
          );

        sendTrackingLog(tracker, embed, member.user);
      }
    }
  }
}
