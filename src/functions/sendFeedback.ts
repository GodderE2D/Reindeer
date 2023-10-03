import { Guild, Report } from "@prisma/client";
import { EmbedBuilder, GuildMember, User } from "discord.js";

import colours from "../constants/colours.js";
import { prisma } from "../index.js";
import { formatFeedbackMessage } from "./formatConfigMessages.js";

export async function sendFeedback(report: Report & { guild: Guild }, author: User, moderator: GuildMember) {
  if (!report.guild.authorFeedbackEnabled) return null;
  const isApproved = report.status === "Approved";

  const dmEmbed = new EmbedBuilder()
    .setColor(isApproved ? colours.success : colours.error)
    .setAuthor({ name: moderator.guild.name, iconURL: moderator.guild.iconURL({ forceStatic: true }) ?? undefined })
    .setTitle(`Your report has been ${isApproved ? "approved" : "rejected"}.`)
    .setDescription(
      formatFeedbackMessage(
        4096,
        report.fieldValues,
        isApproved ? report.guild.authorFeedbackApprovedMessage : report.guild.authorFeedbackRejectedMessage,
        report.targetId,
        report.createdAt,
      ),
    )
    .setFooter({ text: `Report #${report.number} in ${moderator.guild.name} (${moderator.guild.id})` });

  const dmMsg = await author.send({ embeds: [dmEmbed] }).catch(() => undefined);

  const notificationEmbed = new EmbedBuilder()
    .setColor(dmMsg ? colours.orange : colours.warning)
    .setAuthor({
      name: `${moderator.user.tag} (${moderator.id})`,
      iconURL: moderator.user.displayAvatarURL({ forceStatic: true }),
    })
    .setDescription(
      `${moderator} has sent feedback to ${author} for this ${isApproved ? "approved" : "rejected"} report.`,
    )
    .setTimestamp();

  if (!dmMsg) {
    notificationEmbed.setDescription(
      `${moderator} tried to send feedback to ${author} for this ${
        isApproved ? "approved" : "rejected"
      } report, but Reindeer couldn't send them a DM.`,
    );
  }

  const thread = moderator.guild.channels.cache.get(report.threadId);
  if (!thread?.isThread()) throw new Error("Thread not found.");

  await thread.send({ embeds: [notificationEmbed] }).catch(() => undefined);
  await prisma.report.update({ where: { id: report.id }, data: { reportFeedbackSent: true } });
  return;
}
