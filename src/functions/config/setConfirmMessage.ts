import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  Message,
  ModalBuilder,
  Snowflake,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import colours from "../../constants/colours.js";
import { formatConfirmMessage } from "../formatConfirmMessage.js";

export const DEFAULT_MESSAGE_REPORT_MSG = `Are you sure you want to report [this message]({{message}}) to the server moderators?\n**Reason**: {{field1}}`;
export const DEFAULT_USER_REPORT_MSG = `Are you sure you want to report {{user}} to the server moderators?\n**Reason**: {{field1}}`;

const EXAMPLE_FIELDS = [
  "Example response",
  "Example response",
  "Example response",
  "Example response",
  "Example response",
];

export async function setConfirmMessage(
  message: Message<true>,
  userId: Snowflake,
  messageReportMsg = DEFAULT_MESSAGE_REPORT_MSG,
  userReportMsg = DEFAULT_USER_REPORT_MSG,
): Promise<{ messageReportMsg: string; userReportMsg: string }> {
  function setEmbedFields(embed: EmbedBuilder) {
    return embed.setFields(
      { name: "Message reports", value: formatConfirmMessage(1024, EXAMPLE_FIELDS, messageReportMsg, userId, message) },
      { name: "User reports", value: formatConfirmMessage(1024, EXAMPLE_FIELDS, userReportMsg, userId) },
    );
  }

  const embed = new EmbedBuilder()
    .setColor(colours.primary)
    .setAuthor({
      name: "Reindeer Setup",
      iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
    })
    .setTitle("Configure your confirmation messages")
    .setDescription(
      "After your members complete the questions you entered before, Reindeer will send a confirmation message before actually submitting the report. Below is a preview of your confirmation messages.",
    );

  const tipEmbed = new EmbedBuilder()
    .setColor(colours.secondary)
    .setAuthor({ name: "Using parameters" })
    .setDescription(
      [
        `- Use \`{{message}}\` to insert the message link like: ${message.url} (only for message reports)`,
        `- Use \`{{user}}\` to insert the target's mention like: <@${userId}>`,
        `- Use \`{{field1}}\`, \`{{field2}}\`, etc. to insert the field response for that field (if no response, '*No response*' is returned)`,
      ].join("\n"),
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup_confirm_message_report:${message.id}`)
      .setLabel("Edit for message reports")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`setup_confirm_user_report:${message.id}`)
      .setLabel("Edit for user reports")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`setup_confirm_continue:${message.id}`)
      .setLabel("Continue")
      .setStyle(ButtonStyle.Primary),
  );

  await message.edit({ content: "", embeds: [setEmbedFields(embed), tipEmbed], components: [row] });

  const collector = message.createMessageComponentCollector({
    time: 890_000,
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === userId,
  });

  return new Promise((resolve) => {
    collector.on("collect", async (button) => {
      if (button.customId.startsWith("setup_confirm_continue")) {
        await button.deferUpdate();
        collector.stop();
        return resolve({ messageReportMsg, userReportMsg });
      }

      const isMessage = button.customId.startsWith("setup_confirm_message");

      const modal = new ModalBuilder()
        .setCustomId(`setup_confirm_modal:${button.id}`)
        .setTitle(`Edit confirmation message for ${isMessage ? "message" : "user"} reports`) // exactly 45 chars :o
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId(`setup_confirm_message:${message.id}`)
              .setLabel(`${isMessage ? "Message" : "User"} report confirmation message`)
              .setValue(isMessage ? messageReportMsg : userReportMsg)
              .setPlaceholder(
                `${
                  isMessage ? "{{message}} for message link, " : ""
                }{{user}} for target's mention, {{field1}}, etc. for field responses`,
              )
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(2000),
          ),
        );

      await button.showModal(modal);

      const modalInteraction = await button
        .awaitModalSubmit({ filter: (i) => i.customId.endsWith(button.id), time: 890_000 })
        .catch(async () => void (await button.followUp({ content: "You took too long to respond.", ephemeral: true })));

      if (!modalInteraction) return;

      if (isMessage) {
        messageReportMsg = modalInteraction.fields.getTextInputValue(`setup_confirm_message:${message.id}`);
      } else {
        userReportMsg = modalInteraction.fields.getTextInputValue(`setup_confirm_message:${message.id}`);
      }

      modalInteraction.reply({ content: "Message updated.", ephemeral: true });
      await message.edit({ embeds: [setEmbedFields(embed), tipEmbed] });
    });
  });
}
