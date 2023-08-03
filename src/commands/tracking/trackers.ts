import { Report, TrackedContent } from "@prisma/client";
import { isGuildMember } from "@sapphire/discord.js-utilities";
import { ChatInputCommand, Command } from "@sapphire/framework";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} from "discord.js";
import { messageLink } from "discord.js";

import colours from "../../constants/colours.js";
import { disableComponents } from "../../functions/disableComponents.js";
import { prisma } from "../../index.js";

export class TrackerChatInputCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "trackers",
      description: "Manage existing trackers in a report.",
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName(this.name)
          .setDescription(this.description)
          .setDMPermission(false)
          .setDefaultMemberPermissions("0")
          .addIntegerOption((option) =>
            option
              .setName("report_number")
              .setDescription("The report number to manage trackers for")
              .setRequired(true),
          ),
      {
        idHints: [],
      },
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction<"cached">) {
    function canDelete(tracker?: TrackedContent) {
      if (!isGuildMember(interaction.member)) throw new Error("interaction.member is not a GuildMember.");

      return (
        interaction.user.id === tracker?.creatorId ||
        interaction.member?.permissions.has(PermissionFlagsBits.Administrator)
      );
    }

    const number = interaction.options.getInteger("report_number", true);

    const report = await prisma.report.findUnique({
      where: { number_guildId: { number, guildId: interaction.guild.id } },
    });

    if (!report) {
      return interaction.reply({ content: `Report #${number} does not exist.`, ephemeral: true });
    }

    let trackers = await prisma.trackedContent.findMany({
      where: { reportId: report.id },
      orderBy: { createdAt: "desc" },
      include: { report: true },
    });

    const createEmbed = (embedTrackers: Array<TrackedContent & { report: Report }>) => {
      return new EmbedBuilder()
        .setColor(colours.warning)
        .setDescription(
          embedTrackers
            .slice(0, 25)
            .map(
              (tracker) =>
                `- \`${tracker.id.slice(-7)}\` <t:${Math.floor(tracker.createdAt.getTime() / 1000)}:R> ${
                  tracker.notificationId
                    ? `[Tracking](${messageLink(tracker.report.threadId, tracker.notificationId, report.guildId)})`
                    : "Tracking"
                } ${
                  tracker.type === "Message"
                    ? `${messageLink(tracker.channelId ?? "", tracker.contentId, report.guildId)}`
                    : `<@${tracker.contentId}>`
                } ${tracker.creatorId ? `by <@${tracker.creatorId}>` : "(auto-added)"}`,
            )
            .join("\n") || "*No trackers found.*",
        )
        .setTitle(`Trackers for report #${number}`)
        .setFooter({
          text: `Showing ${embedTrackers.length} trackers.${
            canDelete() ? "" : `\nYou can only delete trackers you created.`
          }`,
        });
    };

    const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`select_menu_tracker_delete:${report.id}`)
        .setPlaceholder("Delete trackers")
        .setMaxValues(trackers.slice(0, 25).length)
        .addOptions(
          trackers
            .filter(canDelete)
            .slice(0, 25)
            .map((tracker) => ({
              label: `${tracker.id.slice(-7)} - ${tracker.type} ${!tracker.creatorId ? "(auto-added)" : ""}`,
              value: tracker.id,
            })),
        ),
    );

    await interaction.reply({
      embeds: [createEmbed(trackers)],
      components: trackers.length ? [actionRow] : [],
      ephemeral: true,
    });

    if (!interaction.channel) throw new Error("interaction.channel is undefined.");

    const collector = interaction.channel.createMessageComponentCollector<ComponentType.StringSelect>({
      filter: (i) => i.customId === `select_menu_tracker_delete:${report.id}`,
      time: 1000 * 60 * 15,
    });

    collector.on("collect", async (menuInteraction) => {
      const reportThread = interaction.guild?.channels.cache.get(report.threadId);

      if (!reportThread?.isThread()) {
        return void menuInteraction.reply({
          content: `The thread for report #${number} has been deleted or Reindeer cannot view it.`,
          ephemeral: true,
        });
      }

      Promise.allSettled([
        menuInteraction.deferUpdate(),
        prisma.trackedContent.deleteMany({ where: { OR: menuInteraction.values.map((id) => ({ id })) } }),
        ...menuInteraction.values
          .map(async (id) => {
            const thisTracker = trackers.find((t) => t.id === id);
            if (!thisTracker) return;

            const target =
              thisTracker.type === "User" ? await interaction.client.users.fetch(thisTracker.contentId) : null;

            if (!thisTracker?.notificationId || !thisTracker.creatorId) {
              const embed = new EmbedBuilder()
                .setAuthor({
                  name: `${interaction.user.tag} (${interaction.user.id})`,
                  iconURL: interaction.user.displayAvatarURL({ forceStatic: true }),
                })
                .setDescription(
                  `${interaction.user} deleted an auto-added ${
                    thisTracker.type === "Message" ? "message" : "user"
                  } tracker for ${
                    thisTracker.type === "Message"
                      ? `[this message](${messageLink(
                          thisTracker.channelId ?? "",
                          thisTracker.contentId,
                          thisTracker.guildId,
                        )})`
                      : `<@${thisTracker.contentId}> (\`${target?.tag}\`)`
                  }.`,
                );

              return reportThread.send({ embeds: [embed] });
            }

            const creator = await interaction.client.users.fetch(thisTracker.creatorId);
            const author = thisTracker.authorId ? await interaction.client.users.fetch(thisTracker.authorId) : null;

            const messageEmbed = new EmbedBuilder()
              .setAuthor({
                name: `${creator.tag} (${creator.id})`,
                iconURL: creator.displayAvatarURL({ forceStatic: true }),
              })
              .setDescription(
                [
                  `**Tracker deleted by ${interaction.user} (${interaction.user.tag})**`,
                  `~~<@${thisTracker.creatorId}> has begun tracking [this message](${messageLink(
                    thisTracker.channelId ?? "",
                    thisTracker.contentId,
                    thisTracker.guildId,
                  )}) by <@${thisTracker.authorId}> (\`${author?.tag}\`).~~`,
                ].join("\n"),
              );

            const userEmbed = new EmbedBuilder()
              .setAuthor({
                name: `${creator.tag} (${creator.id})`,
                iconURL: creator.displayAvatarURL({ forceStatic: true }),
              })
              .setDescription(
                [
                  `**Tracker deleted by ${interaction.user} (${interaction.user.tag})**`,
                  `~~${interaction.user} has begun tracking <@${thisTracker.contentId}> (\`${target?.tag}\`).~~`,
                ].join("\n"),
              );

            const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId("dummy")
                .setLabel("Delete")
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),
            );

            return reportThread.messages.edit(thisTracker.notificationId, {
              embeds: [thisTracker.type === "Message" ? messageEmbed : userEmbed],
              components: [disabledRow],
            });
          })
          .filter(Boolean),
      ]);

      trackers = trackers.filter((t) => !menuInteraction.values.includes(t.id));

      const newActionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select_menu_tracker_delete:${report.id}`)
          .setPlaceholder("Delete trackers")
          .setMaxValues(trackers.filter((t) => !menuInteraction.values.includes(t.id)).slice(0, 25).length)
          .addOptions(
            trackers
              .filter((t) => !menuInteraction.values.includes(t.id))
              .slice(0, 25)
              .map((tracker) => ({
                label: `${tracker.id.slice(-7)} ${!tracker.creatorId ? "(auto-added)" : ""}`,
                value: tracker.id,
              })),
          ),
      );

      await interaction.editReply({
        embeds: [createEmbed(trackers)],
        components: trackers.some((t) => !menuInteraction.values.includes(t.id)) ? [newActionRow] : [],
      });
    });

    collector.once("end", async () => {
      await interaction
        .editReply({ content: "Tracker deletion menu timed out.", components: [disableComponents(actionRow)] })
        .catch(() => undefined);
    });

    return;
  }
}
