import { Message, Snowflake } from "discord.js";

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
