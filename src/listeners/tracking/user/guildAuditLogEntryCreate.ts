import { Events, Listener } from "@sapphire/framework";
import { AuditLogEvent, EmbedBuilder, GuildAuditLogsEntry, User } from "discord.js";

import colours from "../../../constants/colours.js";
import { handleMemberUpdate } from "../../../functions/tracking/handleMemberUpdate.js";
import { sendTrackingLog } from "../../../functions/tracking/sendTrackingLog.js";
import { logger, prisma } from "../../../index.js";

export class TrackingGuildAuditLogEntryCreateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.GuildAuditLogEntryCreate,
    });
  }

  public async run(entry: GuildAuditLogsEntry) {
    if (![AuditLogEvent.MemberBanRemove, AuditLogEvent.MemberUpdate].includes(entry.action)) return;

    if (!(entry.target instanceof User)) {
      return logger.warn(`Tracking target ${entry.target} is not a User, returning`);
    }

    const trackers = await prisma.trackedContent.findMany({
      where: { type: "User", contentId: entry.target.id },
      include: { report: true },
    });

    if (!trackers.length) return;
    for (const tracker of trackers) {
      switch (entry.action) {
        case AuditLogEvent.MemberBanRemove: {
          const embed = new EmbedBuilder()
            .setColor(colours.green)
            .setDescription(`Tracked user <@${entry.targetId}> has been unbanned by <@${entry.executorId}>.`);

          sendTrackingLog(tracker, embed, entry.target);
          break;
        }
        case AuditLogEvent.MemberUpdate: {
          handleMemberUpdate(tracker, entry);
        }
      }
    }
  }
}
