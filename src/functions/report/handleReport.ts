import { isGuildMember } from "@sapphire/discord.js-utilities";
import {
  APIInteractionGuildMember,
  ChannelType,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  GuildMember,
  Message,
  User,
} from "discord.js";

import { prisma } from "../../index.js";
import { disableComponents } from "../disableComponents.js";
import { checkUserPermissions } from "./checkUserPermissions.js";
import { confirmReport } from "./confirmReport.js";
import { createForumPost } from "./createForumPost.js";
import { createReportEntry } from "./createReportEntry.js";
import { showModal } from "./showModal.js";

export async function handleReport(
  author: GuildMember | APIInteractionGuildMember | null,
  target: User,
  interaction: ChatInputCommandInteraction<"cached"> | ContextMenuCommandInteraction<"cached">,
  message?: Message,
) {
  if (!target || !isGuildMember(author)) {
    throw new Error("Target or author is not a GuildMember.");
  }

  const guildData = await prisma.guild.findUnique({
    where: { guildId: interaction.guild.id },
  });

  if (!guildData) {
    return interaction.reply({
      content:
        "The admins of this server have not set up Reindeer yet. Please ask them to run `/setup` to run this command.",
      ephemeral: true,
    });
  }

  const checkPermissionResult = await checkUserPermissions(author, guildData, target, message);

  if (checkPermissionResult !== true) {
    return interaction.reply({
      content: checkPermissionResult,
      ephemeral: true,
    });
  }

  const modalResponse = await showModal(interaction, guildData, !!message);
  if (!modalResponse) return;

  const { confirmResponse, confirmRow } = (await confirmReport(target, guildData, modalResponse, message)) ?? {};
  if (!confirmResponse || !confirmRow) return;

  const forumChannel = interaction.guild.channels.cache.get(guildData.forumChannelId);

  if (forumChannel?.type !== ChannelType.GuildForum) {
    return void confirmResponse.edit({
      content:
        "The admins of this server have deleted their report channel. Please ask them to run `/config` to add one.",
      components: [disableComponents(confirmRow)],
    });
  }

  const { forumPost, number, firstMessage } = await createForumPost(
    author.user,
    target,
    interaction.guild.id,
    forumChannel,
    confirmResponse,
    modalResponse,
    guildData,
    message,
  );

  if (!forumPost || !firstMessage) return;

  try {
    await createReportEntry(number, interaction.guild.id, forumPost, firstMessage.id, author.user, target, message);
  } catch (err) {
    confirmResponse.edit({
      content: "An error occurred while creating the report. Please try again.",
      components: [disableComponents(confirmRow)],
    });
    throw err;
  }

  return await confirmResponse.edit({
    content: "Your report has been submitted. Thank you!",
    components: [disableComponents(confirmRow)],
  });
}
