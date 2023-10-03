import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  messageLink,
} from "discord.js";

import { basicAdsRow } from "../constants/advertisements.js";
import colours from "../constants/colours.js";
import { prisma } from "../index.js";
import { sendFeedback } from "./sendFeedback.js";

export async function setReportStatus(
  status: "Open" | "Approved" | "Rejected",
  number: number,
  interaction: ChatInputCommandInteraction<"cached"> | ButtonInteraction<"cached">,
) {
  let report = await prisma.report.findUnique({
    where: {
      number_guildId: { number, guildId: interaction.guild.id },
    },
    include: { guild: true },
  });

  if (!report) {
    return void interaction.editReply(`Report #${number} does not exist.`);
  }

  if (report.status === status) {
    return void interaction.editReply(
      `Report #${number} is already ${
        status === "Open" ? "open" : status === "Approved" ? "marked as approved" : "marked as rejected"
      }.`,
    );
  }

  const thread = interaction.guild.channels.cache.get(report.threadId);

  if (!thread?.isThread()) {
    return void interaction.editReply(`The thread for report #${number} has been deleted or Reindeer cannot view it.`);
  }

  try {
    await thread.setAppliedTags([
      report.type === "Message" ? report.guild.messageTagId : report.guild.userTagId,
      status === "Rejected"
        ? report.guild.rejectedTagId
        : status === "Approved"
        ? report.guild.approvedTagId
        : report.guild.openTagId,
    ]);
  } catch (error) {
    return void interaction.editReply(
      `Reindeer cannot manage this channel or a tag on this channel have been deleted and must be re-configured using \`/config\`.\nDoes Reindeer have the Send Messages in Threads permission in ${thread.parent}?`,
    );
  }

  const firstMessage = await thread.messages.fetch(report.startMessageId).catch(() => undefined);

  if (firstMessage) {
    const openedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`report_approve:${number}`)
        .setLabel("Approve & Close")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder() //
        .setCustomId(`report_reject:${number}`)
        .setLabel("Reject & Close")
        .setStyle(ButtonStyle.Danger),
    );

    if (report.messageId && report.channelId) {
      openedRow.addComponents(
        new ButtonBuilder()
          .setURL(messageLink(report.channelId, report.messageId, report.guildId))
          .setLabel("View Message")
          .setStyle(ButtonStyle.Link),
      );
    }

    const closedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`report_reopen:${report.number}`)
        .setLabel("Re-open")
        .setStyle(ButtonStyle.Secondary),
    );

    await firstMessage.edit({ components: [status === "Open" ? openedRow : closedRow] });
  }

  const notificationEmbed = new EmbedBuilder()
    .setColor(status === "Open" ? colours.blue : status === "Approved" ? colours.green : colours.error)
    .setAuthor({
      name: `${interaction.user.tag} (${interaction.user.id})`,
      iconURL: interaction.user.displayAvatarURL({ forceStatic: true }),
    })
    .setDescription(
      `${interaction.user} has ${
        status === "Open" ? "re-opened" : status === "Approved" ? "approved & closed" : "rejected & closed"
      } this report.`,
    )
    .setTimestamp();

  const authorFeedbackRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`send_feedback:${report.number}`)
      .setLabel("Send feedback to author")
      .setStyle(ButtonStyle.Primary),
  );

  const components = [];
  if (
    report.guild.authorFeedbackEnabled &&
    !report.guild.authorFeedbackAutoSend &&
    !report.reportFeedbackSent &&
    status !== "Open"
  ) {
    components.push(authorFeedbackRow);
  }
  if (status !== "Open") components.push(basicAdsRow);

  await thread.send({ embeds: [notificationEmbed], components }).catch(() => undefined);
  await thread.setArchived(status !== "Open");

  report = await prisma.report.update({ where: { id: report.id }, data: { status }, include: { guild: true } });
  if (status !== "Open") await prisma.trackedContent.deleteMany({ where: { reportId: report.id } });

  if (status !== "Open" && report.guild.authorFeedbackEnabled && report.guild.authorFeedbackAutoSend) {
    const author = await interaction.client.users.fetch(report.authorId).catch(() => undefined);
    if (!author) return;
    await sendFeedback(report, author, interaction.member);
  }

  return true;
}
