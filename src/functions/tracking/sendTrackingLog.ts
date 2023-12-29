import { Report, TrackedContent } from "@prisma/client";
import { EmbedBuilder, User } from "discord.js";

export async function sendTrackingLog(tracker: TrackedContent & { report: Report }, embed: EmbedBuilder, user: User) {
  const creator = tracker.creatorId && (await user.client.users.fetch(tracker.creatorId).catch(() => null));

  embed
    .setAuthor({
      name: `${user.tag} (${user.id})`,
      iconURL: user.displayAvatarURL({ forceStatic: true }),
    })
    .setFooter({
      text: `${creator ? `Tracker created by ${creator.tag} (${creator.id})\n` : ""}Key: ${tracker.id.slice(-7)}`,
    })
    .setTimestamp();

  const channel = await user.client.channels.fetch(tracker.report.threadId).catch(() => null);
  if (!channel?.isThread()) return;

  return await channel.send({ embeds: [embed] });
}
