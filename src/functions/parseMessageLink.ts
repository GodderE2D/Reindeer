import { MessageLinkRegex } from "@sapphire/discord.js-utilities";
import { Client, Guild } from "discord.js";

export async function parseMessageLink(messageLink: string, client: Client, guild?: Guild | null) {
  const regexGroups = MessageLinkRegex.exec(messageLink);

  if (!regexGroups) {
    throw [
      "You supplied an invalid message link. A message link looks like this: <https://discord.com/channels/1234567890123456789/1234567890123456789/1234567890123456789>",
      "You can get the message link by right-clicking (desktop) or long-pressing (mobile) on the message you'd like to report, then selecting 'Copy Message Link'.",
    ].join("\n");
  }

  if (guild && regexGroups[1] !== guild.id) {
    throw "The message you supplied must be from this server. If you are trying to report a DM message, please use the command in DMs.";
  }

  const channel = client.channels.cache.get(regexGroups[2]);

  if (!channel?.isTextBased()) {
    throw "The channel for the message you supplied could not be found, or isn't text-based.";
  }

  const message = await channel.messages.fetch(regexGroups[3]).catch(() => undefined);

  if (!message) {
    throw "The message you supplied could not be found.";
  }

  return message;
}
