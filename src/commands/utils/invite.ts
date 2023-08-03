import { ChatInputCommand, Command } from "@sapphire/framework";
import { EmbedBuilder, OAuth2Scopes, PermissionFlagsBits } from "discord.js";

import colours from "../../constants/colours.js";

export class InviteCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "invite",
      description: "Woah! Another Christmas already? Get a link to invite Reindeer to your server.",
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
    const inviteLink = interaction.client.generateInvite({
      permissions: [
        PermissionFlagsBits.ViewAuditLog,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ManageThreads,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.UseExternalEmojis,
      ],
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
    });

    const embed = new EmbedBuilder()
      .setColor(colours.primary)
      .setAuthor({
        name: "Thanks for using Reindeer! 💖",
        iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
      })
      .setDescription(
        `**[Click here](${inviteLink} 'Invite link') to invite Reindeer to your server.**\nCommand permissions can be natively configured through *Server Settings > Integrations > Bots & Apps*.`,
      )
      .setFooter({
        text: "Tip: Please don't invite public bots with the Administrator permission! Administrator is a dangerous permission to grant and is a recipe for disaster. Please fine-tune your bot's permissions!",
      });

    return await interaction.reply({ embeds: [embed], ephemeral: hide });
  }
}
