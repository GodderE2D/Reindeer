import { Guild } from "@prisma/client";
import {
  ActionRowBuilder,
  ButtonInteraction,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
} from "discord.js";

export async function showModal(
  interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction | ButtonInteraction,
  guildData: Guild,
  isMessageReport: boolean,
) {
  const modal = new ModalBuilder()
    .setCustomId(`report_modal:${interaction.id}`)
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
      .setRequired(!!min); // if minimum is 0 then it's optional

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  }

  await interaction.showModal(modal);

  const modalResponse = await interaction
    .awaitModalSubmit({
      time: 1000 * 60 * 14,
      filter: (i) => i.customId === `report_modal:${interaction.id}`,
    })
    .catch(() => {
      interaction.followUp({
        content: "You took longer than 14 minutes to respond. Please try again.",
        ephemeral: true,
      });
    });

  return modalResponse;
}
