import { Report, TrackedContent } from "@prisma/client";
import { EmbedBuilder, GuildMember } from "discord.js";

export async function sendTrackingLog(
  tracker: TrackedContent & { report: Report },
  embed: EmbedBuilder,
  member: GuildMember,
) {
  const creator = tracker.creatorId && (await member.client.users.fetch(tracker.creatorId).catch(() => null));

  embed
    .setAuthor({
      name: `${member.user.tag} (${member.id})`,
      iconURL: member.user.displayAvatarURL({ forceStatic: true }),
    })
    .setFooter({
      text: `${creator ? `Tracker created by ${creator.tag} (${creator.id})\n` : ""}Key: ${tracker.id.slice(-7)}`,
    })
    .setTimestamp();

  const channel = await member.client.channels.fetch(tracker.report.threadId).catch(() => null);
  if (!channel?.isThread()) return;

  return await channel.send({ embeds: [embed] });
}
