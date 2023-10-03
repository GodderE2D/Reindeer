import { Message, Snowflake, time } from "discord.js";

export function formatConfirmMessage(
  limit: number,
  fields: string[],
  confirmMessage: string,
  targetId: Snowflake,
  message?: Message,
) {
  confirmMessage = confirmMessage.replaceAll("{{user}}", `<@${targetId}>`);
  if (message) confirmMessage = confirmMessage.replaceAll("{{message}}", message.url);

  for (const [index, value] of fields.entries()) {
    confirmMessage = confirmMessage.replaceAll(`{{field${index + 1}}}`, value || "No response.");
  }

  if (confirmMessage.length > limit) {
    confirmMessage = confirmMessage.slice(0, limit - 1) + "…";
  }

  return confirmMessage;
}

export function formatFeedbackMessage(
  limit: number,
  fields: string[],
  feedbackMessage: string,
  targetId: Snowflake,
  timestamp: Date,
) {
  feedbackMessage = feedbackMessage
    .replaceAll("{{user}}", `<@${targetId}>`)
    .replaceAll("{{time}}", time(timestamp, "R"));

  for (const [index, value] of fields.entries()) {
    feedbackMessage = feedbackMessage.replaceAll(`{{field${index + 1}}}`, value || "N/A");
  }

  if (feedbackMessage.length > limit) {
    feedbackMessage = feedbackMessage.slice(0, limit - 1) + "…";
  }

  return feedbackMessage;
}
