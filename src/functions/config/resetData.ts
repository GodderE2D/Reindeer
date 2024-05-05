import Sentry from "@sentry/node";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message, Snowflake } from "discord.js";

import colours from "../../constants/colours.js";
import { logger, memberCache, prisma } from "../../index.js";

export async function resetData(originalMessage: Message<true>, userId: Snowflake) {
  const embed = new EmbedBuilder()
    .setColor(colours.primary)
    .setAuthor({
      name: "Reindeer Setup",
      iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
    })
    .setTitle("Are you sure you want to delete all data associated with this server?")
    .setDescription(
      [
        `This action is permanent. By clicking Delete, you will delete all data associated with "${originalMessage.guild.name}".`,
        "- Existing reports cannot be edited anymore.",
        "- All configuration values will be lost.",
        "- All trackers will be deleted.",
        "- Members cannot create new reports until you run `/setup` again.",
      ].join("\n"),
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup_reset_data_cancel:${originalMessage.id}`)
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`setup_reset_data_delete:${originalMessage.id}`)
      .setLabel("Delete")
      .setStyle(ButtonStyle.Danger),
  );

  const message = await originalMessage.edit({ content: "", embeds: [embed], components: [row] });

  const buttonInteraction = await message
    .awaitMessageComponent({
      filter: (i) => i.customId.startsWith("setup_reset_data") && i.user.id === userId,
      time: 890_000,
    })
    .catch(() => {
      originalMessage.edit({ content: "You took too long to respond.", embeds: [], components: [] });
    });

  if (!buttonInteraction) return;

  if (buttonInteraction.customId.startsWith("setup_reset_data_delete")) {
    try {
      await prisma.guild.delete({ where: { guildId: originalMessage.guild.id } });

      const successEmbed = new EmbedBuilder()
        .setColor(colours.primary)
        .setAuthor({
          name: "Reindeer Setup",
          iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
        })
        .setTitle("Data deletion successful")
        .setDescription("Data for this server has been deleted. If you want to setup Reindeer again, run `/setup`.");

      await originalMessage.edit({ embeds: [successEmbed], components: [] });

      memberCache.delete(originalMessage.guild.id);
    } catch (error) {
      logger.error("An error occurred while trying to reset a server:", error);
      Sentry.captureException(error, { extra: { type: "reset-data" } });

      const errorEmbed = new EmbedBuilder()
        .setColor(colours.error)
        .setAuthor({
          name: "Reindeer Setup",
          iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
        })
        .setTitle("Data deletion failed")
        .setDescription(
          "Data for this server could not be deleted. This is likely due to an internal error, please [join our support server](https://discord.gg/R2FDvcPXTK).",
        );

      await originalMessage.edit({ embeds: [errorEmbed], components: [] });
    }
  } else {
    await originalMessage.edit({ content: "Data deletion cancelled.", embeds: [], components: [] });
  }
}
