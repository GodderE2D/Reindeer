import { Guild } from "@prisma/client";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ForumChannel,
  Message,
  ModalSubmitInteraction,
  Snowflake,
  User,
} from "discord.js";

import colours from "../../constants/colours.js";
import { prisma } from "../../index.js";

export async function createForumPost(
  author: User,
  target: User,
  guildId: Snowflake,
  forumChannel: ForumChannel,
  confirmMessage: ModalSubmitInteraction,
  modalResponse: ModalSubmitInteraction,
  guildData: Guild,
  message?: Message,
) {
  let number =
    (
      await prisma.report.findFirst({
        where: { guildId },
        orderBy: { number: "desc" },
        take: 1,
        select: { number: true },
      })
    )?.number ?? 0;

  number++;

  const forumEmbed = new EmbedBuilder()
    .setAuthor({
      name: `${target.tag} (${target.id})`,
      iconURL: target.displayAvatarURL({ forceStatic: true }),
    })
    .setTitle(`#${number} - ${message ? "Message" : "User"} report for **${target.tag}** (\`${target.id}\`)`)
    .addFields(
      {
        name: "Author",
        value: `${author}\n(\`${author.tag}\`)`,
        inline: true,
      },
      {
        name: "Target",
        value: `${target}\n(\`${target.tag}\`)`,
        inline: true,
      },
    )
    .setColor(colours.primary);

  if (message) {
    forumEmbed.addFields({
      name: "Channel",
      value: `${message.channel || "[DM report](https://reindeer.bsr.gg/docs/features/dm-reporting)"}`,
      inline: true,
    });
  }

  forumEmbed.addFields(
    guildData.fieldNames.map((fieldName, index) => ({
      name: `${index + 1}. ${fieldName}`,
      value: modalResponse.fields.fields.at(index)?.value || "*No response.*",
    })),
  );

  const messagePreviewEmbed =
    message &&
    new EmbedBuilder()
      .setAuthor({
        name: `${target.tag} (${target.id})`,
        iconURL: target.displayAvatarURL({ forceStatic: true }),
        url: message.url,
      })
      .setDescription(message.content || "*No message content.*")
      .setImage(
        message.attachments.filter((attachment) => attachment.contentType?.startsWith("image")).first()?.url ?? null,
      );

  const forumRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`report_approve:${number}`)
      .setLabel("Approve & Close")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder() //
      .setCustomId(`report_reject:${number}`)
      .setLabel("Reject & Close")
      .setStyle(ButtonStyle.Danger),
  );

  if (message) {
    forumRow.addComponents(new ButtonBuilder().setURL(message.url).setLabel("View Message").setStyle(ButtonStyle.Link));
  }

  const forumPost = await forumChannel.threads
    .create({
      name: `Report #${number} - ${target.tag} (${target.id})`,
      message: {
        content: guildData.newReportPingRoles.length ? `<@&${guildData.newReportPingRoles.join(">, <@&")}>` : "",
        embeds: messagePreviewEmbed ? [forumEmbed, messagePreviewEmbed] : [forumEmbed],
        components: [forumRow],
      },
      appliedTags: [message ? guildData.messageTagId : guildData.userTagId, guildData.openTagId],
    })
    .catch(() => {
      return void confirmMessage.editReply(
        "The admins of this server have denied Reindeer from creating a post in the report channel or deleted one of the tags. Please ask them to configure the permissions and tags properly.",
      );
    });

  if (!forumPost) return { number };
  const firstMessage = (await forumPost.messages.fetch({ limit: 1 })).first();
  if (!firstMessage) return { number };

  await firstMessage?.pin();

  return {
    forumPost,
    firstMessage,
    number,
  };
}
