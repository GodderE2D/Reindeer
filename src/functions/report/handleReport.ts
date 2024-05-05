import { Guild } from "@prisma/client";
import {
  ButtonInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  Message,
  User,
} from "discord.js";

import { basicAdsRow } from "../../constants/advertisements.js";
import { prisma } from "../../index.js";
import { disableComponents } from "../disableComponents.js";
import { checkUserPermissions } from "./checkUserPermissions.js";
import { confirmReport } from "./confirmReport.js";
import { createForumPost } from "./createForumPost.js";
import { createReportEntry } from "./createReportEntry.js";
import { selectGuild } from "./selectGuild.js";
import { showModal } from "./showModal.js";

export async function handleReport(
  author: User,
  target: User,
  interaction:
    | ChatInputCommandInteraction<"cached">
    | ContextMenuCommandInteraction<"cached">
    | ButtonInteraction<"cached">,
  message?: Message,
  dmReport = false,
) {
  let selectedGuild = interaction.guild;
  let guildData: Guild;

  if (dmReport && interaction.isContextMenuCommand()) {
    const { guild, guildData: gd, i } = await selectGuild(author, target, interaction);

    selectedGuild = guild;
    guildData = gd;
    interaction = i;
  } else {
    if (!target || !(author instanceof User)) {
      throw new Error("Target or author is not a User.");
    }

    const gd = await prisma.guild.findUnique({
      where: { guildId: interaction.guild.id },
    });

    if (!gd) {
      return interaction.reply({
        content:
          "The admins of this server have not set up Reindeer yet. Please ask them to run `/setup` to run this command.",
        ephemeral: true,
      });
    }

    guildData = gd;
  }

  const checkPermissionResult = await checkUserPermissions(author, selectedGuild, guildData, target, message);

  if (checkPermissionResult !== true) {
    if (interaction.isButton()) {
      return await interaction.update({ content: checkPermissionResult, embeds: [], components: [] });
    } else {
      return await interaction.reply({ content: checkPermissionResult, ephemeral: true });
    }
  }

  const modalResponse = await showModal(interaction, guildData, !!message);
  if (!modalResponse) return;

  const { confirmResponse, confirmRow } = (await confirmReport(target, guildData, modalResponse, message)) ?? {};
  if (!confirmResponse || !confirmRow) return;

  const forumChannel = selectedGuild.channels.cache.get(guildData.forumChannelId);

  if (forumChannel?.type !== ChannelType.GuildForum) {
    return void confirmResponse.editReply({
      content:
        "The admins of this server have deleted their report channel. Please ask them to run `/config` to add one.",
      components: [disableComponents(confirmRow)],
    });
  }

  const { forumPost, number, firstMessage } = await createForumPost(
    author,
    target,
    selectedGuild.id,
    forumChannel,
    confirmResponse,
    modalResponse,
    guildData,
    message,
  );

  if (!forumPost || !firstMessage) return;

  try {
    await createReportEntry(
      number,
      selectedGuild.id,
      forumPost,
      firstMessage.id,
      author,
      target,
      modalResponse,
      message,
    );
  } catch (err) {
    confirmResponse.editReply({
      content: "An error occurred while creating the report. Please try again.",
      components: [disableComponents(confirmRow)],
    });
    throw err;
  }

  return await confirmResponse.editReply({
    content: "Your report has been submitted. Thank you!",
    components: [basicAdsRow],
  });
}
