import { ChatInputCommand } from "@sapphire/framework";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { EmbedBuilder } from "discord.js";

import colours from "../../constants/colours.js";
import { commandsRan, env } from "../../index.js";

function formatNumber(number: number) {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
}

export class StatsChatInputCommand extends Subcommand {
  public constructor(context: Subcommand.Context, options: Subcommand.Options) {
    super(context, {
      ...options,
      name: "stats",
      description: "See statistics about Reindeer.",
      subcommands: [
        { name: "general", chatInputRun: "chatInputGeneral" },
        { name: "top-servers", chatInputRun: "chatInputTopServers" },
      ],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName(this.name)
          .setDescription(this.description)
          .addSubcommand((command) =>
            command
              .setName("general")
              .setDescription("See general statistics about Reindeer.")
              .addBooleanOption((option) =>
                option.setName("hide").setDescription("Whether to hide the reply (default: true)"),
              ),
          )
          .addSubcommand((command) =>
            command
              .setName("top-servers")
              .setDescription("See top servers Reindeer is in.")
              .addBooleanOption((option) =>
                option.setName("hide").setDescription("Whether to hide the reply (default: true)"),
              ),
          ),
      {
        idHints: ["1136582835231281192"],
        guildIds: [env.DEVELOPMENT_GUILD_ID],
      },
    );
  }

  public async chatInputGeneral(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const hide = interaction.options.getBoolean("hide") ?? true;
    const { client } = interaction;

    const commandsInPastDay = commandsRan.filter(({ createdAt }) => createdAt.getTime() > Date.now() - 86_400_000).size;

    const embed = new EmbedBuilder()
      .setColor(colours.pink)
      .setAuthor({
        name: "Reindeer Stats",
        iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
      })
      .setTitle("General Statistics")
      .setDescription(
        [
          `- **Server count**: \`${client.guilds.cache.size}\``,
          `- **Member count**: \`${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}\``,
          `- **Channel count**: \`${client.channels.cache.size}\``,
          `- **Commands recieved in last 24h**: \`${commandsInPastDay}\``,
        ].join("\n"),
      );

    return await interaction.reply({ embeds: [embed], ephemeral: hide });
  }

  public async chatInputTopServers(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const hide = interaction.options.getBoolean("hide") ?? true;

    const top10 = interaction.client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount).first(10);

    const embed = new EmbedBuilder()
      .setColor(colours.pink)
      .setAuthor({
        name: "Reindeer Stats",
        iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
      })
      .setTitle("Top servers with Reindeer")
      .setDescription(
        top10.map((guild, index) => `${index + 1}. **${guild.name}** (${formatNumber(guild.memberCount)})`).join("\n"),
      );

    return await interaction.reply({ embeds: [embed], ephemeral: hide });
  }
}
