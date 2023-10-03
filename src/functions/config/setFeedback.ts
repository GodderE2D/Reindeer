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
  time,
} from "discord.js";

import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { formatFeedbackMessage } from "../formatConfigMessages.js";

export const DEFAULT_FEEDBACK_APPROVED_MSG = `You recently reported {{user}} for "{{field1}}" {{time}}. Your report has been reviewed and appropriate action has been taken. Thank you!`;
export const DEFAULT_FEEDBACK_REJECTED_MSG = `You recently reported {{user}} for "{{field1}}" {{time}}. Your report has been reviewed and it has been determined that no action is necessary.`;

const EXAMPLE_FIELDS = new Array(5).fill("Example response");

export async function setFeedback(
  message: Message<true>,
  userId: Snowflake,
  feedbackApprovedMsg = DEFAULT_FEEDBACK_APPROVED_MSG,
  feedbackRejectedMsg = DEFAULT_FEEDBACK_REJECTED_MSG,
  feedbackEnabled = true,
  feedbackAutoSend = false,
): Promise<{
  feedbackApprovedMsg: string;
  feedbackRejectedMsg: string;
  feedbackEnabled: boolean;
  feedbackAutoSend: boolean;
}> {
  function setEmbedFields(embed: EmbedBuilder) {
    return embed.setFields(
      {
        name: "Author feedback enabled",
        value: `**${
          feedbackEnabled ? `${emojis.success} Enabled` : `${emojis.error} Disabled`
        }**: Whether author feedback is enabled at all.`,
      },
      {
        name: "Auto-send enabled",
        value: `**${
          feedbackAutoSend ? `${emojis.success} Enabled` : `${emojis.error} Disabled`
        }**: Whether feedback is automatically sent when the report is closed. If disabled, moderators will be prompted to send feedback after closing.`,
      },
      {
        name: "Feedback message for approved reports",
        value: formatFeedbackMessage(1024, EXAMPLE_FIELDS, feedbackApprovedMsg, userId, new Date()),
      },
      {
        name: "Feedback message for rejected reports",
        value: formatFeedbackMessage(1024, EXAMPLE_FIELDS, feedbackRejectedMsg, userId, new Date()),
      },
    );
  }

  const embed = new EmbedBuilder()
    .setColor(colours.primary)
    .setAuthor({
      name: "Reindeer Setup",
      iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
    })
    .setTitle("Configure author feedback settings")
    .setDescription(
      "Reindeer can send a feedback message to the author when the report has been closed. Below are your current settings.",
    );

  const tipEmbed = new EmbedBuilder()
    .setColor(colours.secondary)
    .setAuthor({ name: "Using parameters" })
    .setDescription(
      [
        `- Use \`{{user}}\` to insert the target's mention like: <@${userId}>`,
        `- Use \`{{field1}}\`, \`{{field2}}\`, etc. to insert the field response for that field (if no response, 'N/A' is returned)`,
        `- Use \`{{time}}\` to insert a timestamp of when the report was created like: ${time(new Date(), "R")}`,
      ].join("\n"),
    );

  function createTogglesRow() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`setup_toggle_feedback:${message.id}`)
        .setLabel("Author feedback enabled")
        .setEmoji(feedbackEnabled ? emojis.onswitch.replace(/\D/g, "") : emojis.offswitch.replace(/\D/g, ""))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`setup_toggle_auto_send:${message.id}`)
        .setLabel("Feedback auto-send")
        .setEmoji(feedbackAutoSend ? emojis.onswitch.replace(/\D/g, "") : emojis.offswitch.replace(/\D/g, ""))
        .setStyle(ButtonStyle.Secondary),
    );
  }

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup_feedback_approved_report:${message.id}`)
      .setLabel("Edit message for approved reports")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`setup_feedback_rejected_report:${message.id}`)
      .setLabel("Edit message for rejected reports")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`setup_feedback_continue:${message.id}`)
      .setLabel("Continue")
      .setStyle(ButtonStyle.Primary),
  );

  await message.edit({
    content: "",
    embeds: [setEmbedFields(embed), tipEmbed],
    components: [createTogglesRow(), row2],
  });

  const collector = message.createMessageComponentCollector({
    time: 890_000,
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === userId,
  });

  return new Promise((resolve) => {
    collector.on("collect", async (button) => {
      if (button.customId.startsWith("setup_feedback_continue")) {
        await button.deferUpdate();
        collector.stop();
        return resolve({ feedbackApprovedMsg, feedbackRejectedMsg, feedbackEnabled, feedbackAutoSend });
      }

      if (button.customId.startsWith("setup_toggle")) {
        switch (button.customId) {
          case `setup_toggle_feedback:${message.id}`:
            feedbackEnabled = !feedbackEnabled;
            break;
          case `setup_toggle_auto_send:${message.id}`:
            feedbackAutoSend = !feedbackAutoSend;
            break;
        }

        await button.update({ embeds: [setEmbedFields(embed), tipEmbed], components: [createTogglesRow(), row2] });
        return;
      }

      const isApproved = button.customId.startsWith("setup_feedback_approved");

      const modal = new ModalBuilder()
        .setCustomId(`setup_feedback_modal:${button.id}`)
        .setTitle(`Edit feedback message for ${isApproved ? "approved" : "rejected"} reports`)
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId(`setup_feedback_message:${message.id}`)
              .setLabel(`Message for ${isApproved ? "approved" : "rejected"} reports`)
              .setValue(isApproved ? feedbackApprovedMsg : feedbackRejectedMsg)
              .setPlaceholder(
                "{{user}} for target's mention, {{field1}}, etc. for field responses, {{time}} for creation timestamp",
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

      if (isApproved) {
        feedbackApprovedMsg = modalInteraction.fields.getTextInputValue(`setup_feedback_message:${message.id}`);
      } else {
        feedbackRejectedMsg = modalInteraction.fields.getTextInputValue(`setup_feedback_message:${message.id}`);
      }

      modalInteraction.reply({ content: "Message updated.", ephemeral: true });
      await message.edit({ embeds: [setEmbedFields(embed), tipEmbed], components: [createTogglesRow(), row2] });
    });
  });
}
