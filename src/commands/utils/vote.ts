import { ChatInputCommand, Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { ComponentType } from "discord.js";

import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { findOrCreateUser } from "../../functions/findOrCreateUser.js";
import { prisma } from "../../index.js";

export class VoteCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "vote",
      description: "See your Top.gg vote status for Reindeer.",
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName(this.name)
          .setDescription(this.description)
          .addBooleanOption((option) =>
            option.setName("hide").setDescription("Whether to hide the response (default: true)"),
          ),
      {
        idHints: [],
      },
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const hide = interaction.options.getBoolean("hide") ?? true;

    const user = await findOrCreateUser(interaction.user.id);

    const votes = await prisma.vote.findMany({
      where: { userId: interaction.user.id },
      orderBy: { createdAt: "desc" },
    });

    const latestVote = votes.at(0);
    const voteActive = !!latestVote?.createdAt && Date.now() - latestVote.createdAt.getTime() < 43_200_000;

    const embed = new EmbedBuilder()
      .setColor(colours.primary)
      .setTitle("Vote for Reindeer on Top.gg")
      .setURL("https://top.gg/bot/1126157327746211840/vote")
      .setDescription(
        [
          "Support the development of Reindeer by voting on Top.gg! In the future, voters will get access to special features.",
          `- **Vote active**: ${voteActive ? "Active" : "Inactive"} (last vote: ${
            latestVote?.createdAt ? `<t:${Math.floor(latestVote.createdAt.getTime() / 1000)}:R>` : "never"
          })`,
        ].join("\n"),
      )
      .addFields({
        name: `Your voting history (${votes.length > 10 ? "10" : votes.length}/${votes.length} shown)`,
        value:
          votes
            .slice(0, 10)
            .map(
              (vote) =>
                `- <t:${Math.floor(
                  vote.createdAt.getTime() / 1000,
                )}:R> on [Top.gg](https://top.gg/bot/1126157327746211840/vote)`,
            )
            .join("\n") || "No votes yet 🥲",
      });

    const linkButton = new ButtonBuilder()
      .setLabel("Vote on Top.gg")
      .setStyle(ButtonStyle.Link)
      .setURL("https://top.gg/bot/1126157327746211840/vote");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      linkButton,
      new ButtonBuilder()
        .setCustomId(`vote_toggle_reminders:${user.voteRemindersEnabled}`)
        .setLabel("Vote Reminders")
        .setEmoji(user.voteRemindersEnabled ? emojis.onswitch.replace(/\D/g, "") : emojis.offswitch.replace(/\D/g, ""))
        .setStyle(ButtonStyle.Secondary),
    );

    const msg = await interaction.reply({ embeds: [embed], components: [row], ephemeral: hide, fetchReply: true });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 890_000,
    });

    collector.on("collect", async (button) => {
      if (button.user.id !== interaction.user.id) {
        await button.reply({ content: "Please run `/vote` yourself to control your vote reminders.", ephemeral: true });
        return;
      }

      const enabled = button.customId.split(":")[1] === "true";
      await prisma.user.update({ where: { userId: interaction.user.id }, data: { voteRemindersEnabled: !enabled } });

      const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        linkButton,
        new ButtonBuilder()
          .setCustomId(`vote_toggle_reminders:${!enabled}`)
          .setLabel("Vote Reminders")
          .setEmoji(!enabled ? emojis.onswitch.replace(/\D/g, "") : emojis.offswitch.replace(/\D/g, ""))
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.editReply({ components: [newRow] });

      const enabledText =
        "You have enabled vote reminders; Reindeer will send you a DM once you can vote again. Ensure that you can receive DMs from Reindeer for this to work.";
      const disabledText = "You have disabled vote reminders.";

      await button.reply({ content: !enabled ? enabledText : disabledText, ephemeral: true });
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        linkButton,
        new ButtonBuilder()
          .setCustomId("vote_toggle_reminders")
          .setLabel("Vote Reminders")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      );

      await interaction.editReply({ components: [disabledRow] });
    });
  }
}
