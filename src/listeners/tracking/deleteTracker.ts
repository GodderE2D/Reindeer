import { isGuildMember } from "@sapphire/discord.js-utilities";
import { Events, Listener } from "@sapphire/framework";
import { EmbedBuilder, Interaction, PermissionFlagsBits } from "discord.js";

import { prisma } from "../../index.js";

export class DeleteTrackerListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.InteractionCreate,
    });
  }
  public async run(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("tracker_delete:")) return;
    if (!isGuildMember(interaction.member)) throw new Error("interaction.member is null.");

    const trackerId = interaction.customId.split(":")[1];

    const tracker = await prisma.trackedContent.findUnique({ where: { id: trackerId } });

    if (!tracker) {
      return interaction.reply({ content: "The associated tracker could not be found.", ephemeral: true });
    }

    if (
      interaction.user.id !== tracker.creatorId &&
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({
        content: "Only the tracker creator or administrators can delete trackers.",
        ephemeral: true,
      });
    }

    await prisma.trackedContent.delete({ where: { id: trackerId } });

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    embed
      .setColor(null)
      .setDescription(
        [
          `**Tracker deleted by ${interaction.user} (\`${interaction.user.tag}\`)**`,
          `~~${embed.data.description}~~`,
        ].join("\n"),
      );

    // Btw this is really dumb, TS doesn't like ActionRowBuilder.from()
    const actionRow = interaction.message.components[0].toJSON();
    actionRow.components[0].disabled = true;

    interaction.message.edit({
      embeds: [embed],
      components: [actionRow],
    });
    return await interaction.deferUpdate();
  }
}
