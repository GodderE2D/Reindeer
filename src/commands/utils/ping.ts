import { ChatInputCommand, Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

import colours from "../../constants/colours.js";

export class PingChatInputCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "ping",
      description: "Is Reindeer awake?",
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
      },
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const checkingEmbed = new EmbedBuilder()
      .setColor(colours.primary)
      .setDescription(
        [
          `**Websocket heartbeat:** ${interaction.client.ws.ping}ms`,
          "**Roundtrip latency:** Checking...",
          `**Uptime**: Since <t:${Math.floor((Date.now() - interaction.client.uptime) / 1000)}:R>`,
        ].join("\n"),
      );

    const sent = await interaction.reply({
      embeds: [checkingEmbed],
      fetchReply: true,
    });

    const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;

    const successEmbed = new EmbedBuilder()
      .setColor(colours.primary)
      .setDescription(
        [
          `**Websocket heartbeat:** ${interaction.client.ws.ping}ms`,
          `**Roundtrip latency:** ${roundtripLatency}ms`,
          `**Uptime**: Since <t:${Math.floor((Date.now() - interaction.client.uptime) / 1000)}:R>`,
        ].join("\n"),
      );

    return interaction.editReply({ embeds: [successEmbed] });
  }
}
