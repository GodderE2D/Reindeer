import { isGuildMember } from "@sapphire/discord.js-utilities";
import { Events, Listener } from "@sapphire/framework";
import { EmbedBuilder, Interaction, messageLink, PermissionFlagsBits } from "discord.js";

import { prisma, trackedMessagesCache, trackedUsersCache } from "../../index.js";

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

    if (tracker.type === "User") trackedUsersCache.delete(tracker.contentId);
    else trackedMessagesCache.delete(tracker.contentId);

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

    const target = tracker.type === "User" ? await interaction.client.users.fetch(tracker.contentId) : null;

    const deletionEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${interaction.user.tag} (${interaction.user.id})`,
        iconURL: interaction.user.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        `${interaction.user} deleted a ${tracker.type === "Message" ? "message" : "user"} tracker for ${
          tracker.type === "Message"
            ? `${messageLink(tracker.channelId ?? "", tracker.contentId, tracker.guildId)}`
            : `<@${tracker.contentId}> (\`${target?.tag}\`)`
        }.`,
      );

    if (interaction.channel?.isTextBased()) await interaction.channel.send({ embeds: [deletionEmbed] });

    return await interaction.deferUpdate();
  }
}
