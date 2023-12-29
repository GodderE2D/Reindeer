import { ChatInputCommand, Command } from "@sapphire/framework";
import { EmbedBuilder, PermissionFlagsBits } from "discord.js";

import { basicAdsRow } from "../../constants/advertisements.js";
import colours from "../../constants/colours.js";
import { prisma } from "../../index.js";

export class InviteCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "help",
      description: "See information and commands about Reindeer.",
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

    const guild = interaction.guild && (await prisma.guild.findUnique({ where: { guildId: interaction.guild.id } }));
    const reportChannel = guild && interaction.guild.channels.cache.get(guild.forumChannelId);

    const command = (name: string) => {
      const id = interaction.client.application.commands.cache.find((cmd) => cmd.name === name.split(" ")[0])?.id;

      if (!command || !id) return `\`${name}\``;
      return `</${name}:${id}>`;
    };

    const embed = new EmbedBuilder()
      .setColor(colours.primary)
      .setImage("https://reindeer.bsr.gg/report-message-command.png")
      .setAuthor({
        name: "About Reindeer",
        iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
      })
      .setDescription(
        [
          "Reindeer is a Discord bot that helps server admins manage user reports more efficiently and organised.",
          "- Uses modern Discord features such as forum channels, modals, and context menu commands",
          "- Easily customisable to each server's needs",
          "- Can track messages and users in case they leave or a message gets edited/deleted",
        ].join("\n"),
      );

    const canAccessReports = !!(
      interaction.inCachedGuild() &&
      (interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
        reportChannel?.permissionsFor(interaction.member)?.has(PermissionFlagsBits.ViewChannel))
    );

    if (canAccessReports || !interaction.inCachedGuild()) {
      embed.addFields(
        {
          name: "Closing reports",
          value: `Whenever a user submits a report, a new thread will be created in ${
            reportChannel ?? "the channel you created during setup"
          }. Review the report, and then use the buttons or ${command("close")} to close the report.`,
        },
        {
          name: "Add a tracker",
          value: `You can add a tracker using ${command("track message")} and ${command(
            "track user",
          )}. Manage and delete trackers using ${command("trackers")}`,
        },
        {
          name: "Configure Reindeer",
          value: `Use one of the \`/config\` commands to configure Reindeer. If you want to delete this server's data, use ${command(
            "config reset",
          )}.`,
        },
      );
    }

    embed.addFields(
      {
        name: "Report a message or user",
        value: `You can report a message or user by right-clicking a message/user and clicking on Apps > Report message/user. Alternatively, you can use ${command(
          "report message",
        )} and ${command("report user")}.`,
      },
      {
        name: "Need help?",
        value:
          "If you need help using Reindeer, feel free to join our [support server](https://discord.gg/R2FDvcPXTK). Thanks for using Reindeer!",
      },
      {
        name: "Privacy Notice",
        value:
          "Reindeer records message content of reported messages and sends them back to Discord, but does not store them. For more information, see our [privacy policy](https://reindeer.bsr.gg/privacy).",
      },
    );

    let setupEmbed: EmbedBuilder | undefined = undefined;

    if (
      interaction.inCachedGuild() &&
      !reportChannel &&
      interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      setupEmbed = new EmbedBuilder()
        .setColor(colours.warning)
        .setTitle("⚠️ Setup Reindeer in your server")
        .setDescription(
          `Setup Reindeer in this server using ${command(
            "setup",
          )}. Until then, members will not be able to submit reports.`,
        );
    } else if (!reportChannel) {
      setupEmbed = new EmbedBuilder()
        .setColor(colours.warning)
        .setTitle("⚠️ Reindeer cannot be used yet")
        .setDescription(`The admins of this server has not setup Reindeer yet. Please ask them to run \`/setup\`.`);
    }

    return await interaction.reply({
      embeds: setupEmbed ? [embed, setupEmbed] : [embed],
      components: [basicAdsRow],
      ephemeral: hide,
    });
  }
}
