import { exit } from "node:process";

import { ChatInputCommand, Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

import colours from "../../constants/colours.js";
import { env } from "../../index.js";

export class RestartCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "restart",
      description: "Restart the bot.",
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName(this.name)
          .setDescription(this.description),
      {
        idHints: [],
        guildIds: [env.DEVELOPMENT_GUILD_ID],
      },
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (interaction.user.id !== env.BOT_OWNER_ID) {
      return interaction.reply({
        content: `Only the bot owner <@${env.BOT_OWNER_ID}> can use this command.`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(colours.primary)
      .setAuthor({
        name: "See you next Christmas! 🚀",
        iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
      })
      .setDescription("Restarting...");

    await interaction.reply({ embeds: [embed] });
    exit(0);
  }
}
