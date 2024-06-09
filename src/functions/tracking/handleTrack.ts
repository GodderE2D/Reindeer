import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  User,
} from "discord.js";

import colours from "../../constants/colours.js";
import { prisma, trackedMessagesCache, trackedUsersCache } from "../../index.js";

export async function handleTracking(
  interaction: ChatInputCommandInteraction<"cached">,
  number: number,
  target: User,
  trackAuthor: boolean,
  message?: Message,
) {
  await interaction.deferReply({ ephemeral: true });

  if (target.bot) return interaction.editReply("You cannot track bots.");

  const report = await prisma.report.findUnique({
    where: { number_guildId: { number, guildId: interaction.guild?.id } },
  });

  if (!report) return interaction.editReply(`Report #${number} doesn't exist.`);

  if (!message && trackAuthor) trackAuthor = false;

  const existingTrackedUser = await prisma.trackedContent.findFirst({
    where: {
      reportId: report.id,
      type: "User",
      contentId: target.id,
    },
  });

  if (!message && existingTrackedUser) {
    return interaction.editReply(`${target} is already being tracked for report #${number}.`);
  }

  const existingTrackedMessage =
    message &&
    (await prisma.trackedContent.findFirst({
      where: {
        reportId: report.id,
        type: "Message",
        contentId: message.id,
      },
    }));

  if (existingTrackedMessage) {
    return interaction.editReply(`${message.url} is already being tracked for report #${number}.`);
  }

  const trackedContentCount = await prisma.trackedContent.count({ where: { reportId: report.id } });

  if (trackedContentCount >= 25) {
    return interaction.editReply("This report has reached the maximum of 25 tracked messages or users.");
  }

  const thread = interaction.guild.channels.cache.get(report.threadId);

  if (!thread?.isThread() || !thread.sendable || !thread.manageable) {
    return interaction.editReply(`The thread for report #${number} has been deleted or Reindeer cannot view it.`);
  }

  const messageTrackedContent =
    (message &&
      (await prisma.trackedContent.create({
        data: {
          contentId: message.id,
          channelId: message.channel.id,
          authorId: message.author.id,
          type: "Message",
          report: { connect: { id: report.id } },
          guild: { connect: { guildId: interaction.guild.id } },
          creator: {
            connectOrCreate: {
              where: { userId: interaction.user.id },
              create: { userId: interaction.user.id, guildId: interaction.guild.id },
            },
          },
        },
      }))) ||
    undefined;

  const userTrackedContent =
    ((!message || (trackAuthor && !existingTrackedUser)) &&
      (await prisma.trackedContent.create({
        data: {
          contentId: target.id,
          type: "User",
          report: { connect: { id: report.id } },
          guild: { connect: { guildId: interaction.guild.id } },
          creator: {
            connectOrCreate: {
              where: { userId: interaction.user.id },
              create: { userId: interaction.user.id, guildId: interaction.guild.id },
            },
          },
        },
      }))) ||
    undefined;

  const messageEmbed = new EmbedBuilder()
    .setColor(colours.blue)
    .setAuthor({
      name: `${interaction.user.tag} (${interaction.user.id})`,
      iconURL: interaction.user.displayAvatarURL({ forceStatic: true }),
    })
    .setDescription(
      `${interaction.user} has begun tracking ${message?.url} by ${target} (\`${message?.author.tag}\`).`,
    );

  const userEmbed = new EmbedBuilder()
    .setColor(colours.blue)
    .setAuthor({
      name: `${interaction.user.tag} (${interaction.user.id})`,
      iconURL: interaction.user.displayAvatarURL({ forceStatic: true }),
    })
    .setDescription(`${interaction.user} has begun tracking ${target} (\`${target.tag}\`).`);

  function createRow(id?: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`tracker_delete:${id}`).setLabel("Delete").setStyle(ButtonStyle.Danger),
    );
  }

  if (message) {
    const { id } = await thread.send({ embeds: [messageEmbed], components: [createRow(messageTrackedContent?.id)] });
    await prisma.trackedContent.update({ where: { id: messageTrackedContent?.id }, data: { notificationId: id } });

    trackedMessagesCache.add(message.id);
    message.fetch();
  }

  if (!message || (trackAuthor && !existingTrackedUser)) {
    const { id } = await thread.send({ embeds: [userEmbed], components: [createRow(userTrackedContent?.id)] });
    await prisma.trackedContent.update({ where: { id: userTrackedContent?.id }, data: { notificationId: id } });

    trackedUsersCache.add(target.id);
    target.fetch();
  }

  let trackedMessage = "";
  if (message) trackedMessage = `[this message](${message.url})`;
  if (trackAuthor && !existingTrackedUser) trackedMessage += " and ";
  if (!message || (trackAuthor && !existingTrackedUser)) trackedMessage += `${target}`;

  return interaction.editReply(`Now tracking ${trackedMessage} for report #${number}.`);
}
