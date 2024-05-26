import { ChatInputCommand, Command } from "@sapphire/framework";
import { ChannelType, EmbedBuilder, PermissionsBitField, time } from "discord.js";

import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { memberCache, prisma } from "../../index.js";

const REQUIRED_PERMISSIONS = new PermissionsBitField(1426466532566n);

export class DiagnoseChatInputCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "diagnose",
      description: "Diagnose Reindeer to check if the server is correctly set up.",
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
          .addBooleanOption((option) =>
            option.setName("hide").setDescription("Whether to hide the response (default: true)"),
          ),
      {
        idHints: [],
      },
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction<"cached">) {
    const hide = interaction.options.getBoolean("hide") ?? true;

    const guild = await prisma.guild.findUnique({ where: { guildId: interaction.guild.id } });
    const reportChannel = guild && interaction.guild.channels.cache.get(guild.forumChannelId);

    const command = (name: string) => {
      const id = interaction.client.application.commands.cache.find((cmd) => cmd.name === name.split(" ")[0])?.id;

      if (!command || !id) return `\`${name}\``;
      return `</${name}:${id}>`;
    };

    const embed = new EmbedBuilder().setTitle(`Diagnosis for ${interaction.guild.name}`).setTimestamp();
    let hasError = false;

    const reportsChannelField: string[] = [];

    if (guild) {
      if (reportChannel && reportChannel.type === ChannelType.GuildForum) {
        reportsChannelField.push(`${emojis.success} ${reportChannel} (\`${reportChannel.id}\`)\n`);

        // Permissions
        if (!interaction.guild.members.me) throw new Error("Bot's GuildMember is not cached.");
        const permissions = reportChannel.permissionsFor(interaction.guild.members.me);

        reportsChannelField.push(`**Reindeer's permissions**: \`${permissions.bitfield}\``);

        const missing = permissions.missing(REQUIRED_PERMISSIONS);

        if (missing.length) {
          reportsChannelField.push(
            `- ${emojis.error} Missing permissions (required: \`${REQUIRED_PERMISSIONS.bitfield}\`)`,
            `- Reindeer is missing the following permissions in ${reportChannel}: \`${missing.join("`, `")}\``,
            `${emojis.arrow} Check Reindeer's permission in the channel, category, and server.`,
          );

          hasError = true;
        } else {
          reportsChannelField.push(
            `- ${emojis.success} Has all required permissions (required: \`${REQUIRED_PERMISSIONS.bitfield}\`)`,
          );
        }

        // Tags
        const tags = {
          "Type: Message": reportChannel.availableTags.find((t) => t.id === guild.messageTagId),
          "Type: User": reportChannel.availableTags.find((t) => t.id === guild.userTagId),
          "Status: Open": reportChannel.availableTags.find((t) => t.id === guild.openTagId),
          "Status: Approved": reportChannel.availableTags.find((t) => t.id === guild.approvedTagId),
          "Status: Rejected": reportChannel.availableTags.find((t) => t.id === guild.rejectedTagId),
        };

        const missingTags = !Object.values(tags).every((tag) => tag);

        if (missingTags) {
          reportsChannelField.push(`\n**Tags**: ${emojis.error} Unable to fetch all configured tags`);
          hasError = true;
        } else {
          reportsChannelField.push(`\n**Tags**: ${emojis.success} Fetched configured tags`);
        }

        for (const [name, tag] of Object.entries(tags)) {
          reportsChannelField.push(`- ${name} ➔ ${tag ? `\`${tag.name}\` (\`${tag.id}\`)` : "N/A"}`);
        }

        if (missingTags) {
          reportsChannelField.push(
            `${emojis.arrow} Delete the non-configured tags in the channel, run ${command("config channel")}, and select the channel again.`,
          );
        }
      } else {
        reportsChannelField.push(
          `${emojis.error} Unable to fetch reports channel`,
          `${emojis.arrow} Re-select a reports channel using ${command("config channel")}.`,
        );
        hasError = true;
      }
    }

    const serverField = [
      `**ID**: \`${interaction.guild.id}\``,
      `**Bot joined at**: ${time(interaction.guild.joinedAt)}`,
      `**Members**: ${interaction.guild.memberCount} (${interaction.guild.members.cache.size} cached${
        guild?.dmReportsEnabled ? `, ${memberCache.get(interaction.guild.id)?.length} in DM reports cache` : ""
      })`,
      `**Features**: \`${interaction.guild.features.join("`, `")}\``,
    ];

    const isCommunity = interaction.guild.features.includes("COMMUNITY");
    serverField.push(`**Community**: ${isCommunity ? emojis.success : emojis.error} ${isCommunity ? "Yes" : "No"}`);

    if (!isCommunity) {
      serverField.push(
        `${emojis.arrow} Forum channels require a Community Server. Enable this in Server Settings > Enable Community.`,
      );

      hasError = true;
    }

    const available = interaction.guild.available;
    serverField.push(`**Available**: ${available ? emojis.success : emojis.error} ${available ? "Yes" : "No"}`);

    if (!available) {
      serverField.push(
        `${emojis.arrow} The server is unavailable right now. Check [Discord Status](https://discordstatus.com/) and try again later.`,
      );

      hasError = true;
    }

    if (guild) {
      embed.addFields({ name: "Reports channel", value: reportsChannelField.join("\n") });
    } else {
      embed.addFields({
        name: "⚠️ Reindeer is not set up yet",
        value: `Setup Reindeer in this server using ${command("setup")}. Until then, members will not be able submit reports.`,
      });

      hasError = true;
    }

    embed.addFields({ name: "Server", value: serverField.join("\n") });

    embed.setDescription(
      `${hasError ? "There may be errors preventing Reindeer from functioning." : "Everything seems to be set up correctly."} If you need help using Reindeer, try reading the [FAQ](https://reindeer.bsr.gg/docs/introduction/faq) or join our [support server](https://discord.gg/R2FDvcPXTK).`,
    );

    embed.setColor(hasError ? colours.error : colours.success);

    return await interaction.reply({ embeds: [embed], ephemeral: hide });
  }
}
