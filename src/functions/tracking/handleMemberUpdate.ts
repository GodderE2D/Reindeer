import { Report, TrackedContent } from "@prisma/client";
import { EmbedBuilder, GuildAuditLogsEntry, User } from "discord.js";

import colours from "../../constants/colours.js";
import { sendTrackingLog } from "./sendTrackingLog.js";

export async function handleMemberUpdate(tracker: TrackedContent & { report: Report }, entry: GuildAuditLogsEntry) {
  if (!(entry.target instanceof User)) throw new Error("Target is not a User");

  for (const change of entry.changes) {
    if (change.key === "nick") {
      const embed = new EmbedBuilder()
        .setColor(colours.fuchsia)
        .setDescription(
          `Tracked user ${entry.target} had their nickname ${change.new ? "changed" : "reset"}${
            change.old ? ` from \`${change.old}\`` : ""
          }${change.new ? ` to \`${change.new}\`` : ""} by ${
            entry.executorId !== entry.targetId ? `<@${entry.executorId}>` : "themselves"
          }.`,
        );

      sendTrackingLog(tracker, embed, entry.target);
      break;
    } else if (change.key === "communication_disabled_until") {
      const embed = new EmbedBuilder().setColor(colours.cyan);

      if (change.new) {
        embed.setDescription(
          `Tracked user ${entry.target} was timed out (expires <t:${Math.floor(
            new Date(change.new as string).getTime() / 1000,
          )}:R>) by <@${entry.executorId}> for:\n>>> ${entry.reason || "*No reason provided.*"}`,
        );
      } else {
        embed.setDescription(`Tracked user ${entry.target}'s timeout was ended by <@${entry.executorId}>.`);
      }

      sendTrackingLog(tracker, embed, entry.target);
      break;
    }
  }
}
