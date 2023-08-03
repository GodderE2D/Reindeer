import { Guild } from "@prisma/client";
import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
} from "discord.js";

export async function showModal(
  interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction,
  guildData: Guild,
  isMessageReport: boolean,
) {
  const modal = new ModalBuilder()
    .setCustomId("report_modal")
    .setTitle(`Report ${isMessageReport ? "Message" : "User"}`);

  for (const [index, fieldName] of guildData.fieldNames.entries()) {
    const placeholder = guildData.fieldPlaceholders[index];
    const style = guildData.fieldStyles[index];
    const min = guildData.fieldMins[index];
    const max = guildData.fieldMaxes[index];

    const input = new TextInputBuilder()
      .setCustomId(`report_modal_field_${index}`)
      .setLabel(fieldName)
      .setPlaceholder(placeholder)
      .setStyle(style)
      .setMinLength(min)
      .setMaxLength(max)
      .setRequired();

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  }

  await interaction.showModal(modal);

  const modalResponse = await interaction
    .awaitModalSubmit({
      time: 1000 * 60 * 15,
    })
    .catch(() => {
      interaction.followUp({
        content: "You took longer than 15 minutes to respond. Please try again.",
        ephemeral: true,
      });
    });

  return modalResponse;
}
