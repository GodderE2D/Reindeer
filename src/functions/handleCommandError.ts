import { randomBytes } from "node:crypto";

import { CommandInteraction, EmbedBuilder } from "discord.js";

import colours from "../constants/colours.js";
import emojis from "../constants/emojis.js";
import { env, logger } from "../index.js";

export async function handleCommandError(error: Error, interaction: CommandInteraction) {
  try {
    const reply = interaction.replied && (await interaction.fetchReply().catch(() => undefined));

    const errorCode = randomBytes(3).toString("hex");

    const logEmbed = new EmbedBuilder()
      .setColor(colours.error)
      .setAuthor({
        name: interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        error.toString().length > 4075 // 4096-21=4075, 21 is the length of text without error.toString()
          ? `\`\`\`js\n${error.toString().slice(0, 4075)}\`\`\`and more...`
          : `\`\`\`js\n${error.toString()}\`\`\``,
      )
      .addFields(
        {
          name: "Command",
          value: `\`${interaction}\``,
        },
        {
          name: "User",
          value: `${interaction.user} (\`${interaction.user.id}\`)`,
          inline: true,
        },
        {
          name: "Context",
          value: reply
            ? `[Message](${reply.url}) in ${interaction.channel}`
            : `${interaction.channel} (${interaction.replied ? "ephemeral/deleted" : "no"} reply)`,
          inline: true,
        },
        {
          name: "Error code",
          value: `\`${errorCode}\``,
        },
      )
      .setFooter({ text: "Uncaught exception" })
      .setTimestamp();

    const internalChannel = interaction.client.channels.cache.get(env.ERROR_LOGS_CHANNEL_ID);

    if (!internalChannel?.isTextBased()) {
      throw new Error("Fetched channel is not a text-based channel or is undefined.");
    }

    await internalChannel.send({ embeds: [logEmbed] });

    const replyEmbed = new EmbedBuilder()
      .setColor(colours.error)
      .setDescription(
        `${emojis.error} An unexpected error occurred, please try again later. If this issue persists, please [join our support server](https://discord.gg/R2FDvcPXTK).`,
      )
      .setFooter({
        text: `Error code: ${errorCode}`,
      });

    if (!interaction.replied) {
      return await interaction.reply({
        embeds: [replyEmbed],
        ephemeral: true,
      });
    } else if (interaction.deferred) {
      return await interaction.editReply({
        embeds: [replyEmbed],
      });
    } else {
      return await interaction.followUp({
        embeds: [replyEmbed],
        ephemeral: true,
      });
    }
  } catch (error) {
    return void logger.error(error);
  }
}
