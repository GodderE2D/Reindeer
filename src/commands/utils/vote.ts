import { ChatInputCommand, Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

import colours from "../../constants/colours.js";
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

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Vote on Top.gg")
        .setStyle(ButtonStyle.Link)
        .setURL("https://top.gg/bot/1126157327746211840/vote"),
    );

    return await interaction.reply({ embeds: [embed], components: [row], ephemeral: hide });
  }
}
