import { Guild as PrismaGuild } from "@prisma/client";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  Message,
  ModalSubmitInteraction,
  User,
} from "discord.js";

import { disableComponents } from "../disableComponents.js";
import { formatConfirmMessage } from "../formatConfigMessages.js";

export async function confirmReport(
  target: User,
  guildData: PrismaGuild,
  modalResponse: ModalSubmitInteraction,
  message?: Message,
) {
  const confirmEmbed =
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

  const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`report_confirm_${modalResponse.id}`)
      .setLabel("Report")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`report_cancel_${modalResponse.id}`)
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary),
  );

  if (message) {
    confirmRow.addComponents(
      new ButtonBuilder().setLabel("Message Link").setURL(message.url).setStyle(ButtonStyle.Link),
    );
  }

  let confirmMessage = guildData[message ? "messageReportConfirmMessage" : "userReportConfirmMessage"];
  confirmMessage = formatConfirmMessage(
    2000,
    modalResponse.fields.fields.map((f) => f.value),
    confirmMessage,
    target.id,
    message,
  );

  const confirmResponse = await modalResponse.reply({
    content: confirmMessage,
    embeds: confirmEmbed && [confirmEmbed],
    components: [confirmRow],
    ephemeral: true,
    fetchReply: true,
  });

  const buttonResponse = await confirmResponse
    .awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.customId.endsWith(modalResponse.id),
      time: 1000 * 60 * 5,
    })
    .catch(() => {
      modalResponse.editReply({
        content: "You took longer than 5 minutes to respond. Please try again.",
        components: [disableComponents(confirmRow)],
      });
    });

  if (!buttonResponse) return;

  if (buttonResponse.customId.startsWith("report_cancel")) {
    buttonResponse.deferUpdate();
    return void modalResponse.editReply({
      content: "Report has been cancelled.",
      components: [disableComponents(confirmRow)],
    });
  }

  await buttonResponse.deferUpdate();

  return { confirmResponse: modalResponse, confirmRow };
}
