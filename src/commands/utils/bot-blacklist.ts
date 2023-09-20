import { SnowflakeRegex } from "@sapphire/discord-utilities";
import { ChatInputCommand } from "@sapphire/framework";
import { Subcommand } from "@sapphire/plugin-subcommands";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  DiscordAPIError,
  EmbedBuilder,
  Routes,
  time,
} from "discord.js";

import colours from "../../constants/colours.js";
import { botBlacklistCache, env, prisma } from "../../index.js";

export class BotBlacklistChatInputCommand extends Subcommand {
  public constructor(context: Subcommand.Context, options: Subcommand.Options) {
    super(context, {
      ...options,
      name: "bot-blacklist",
      description: "Manage global blacklists for Reindeer.",
      subcommands: [
        { name: "add", chatInputRun: "chatInputAdd" },
        { name: "remove", chatInputRun: "chatInputRemove" },
        { name: "list", chatInputRun: "chatInputList" },
      ],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName(this.name)
          .setDescription(this.description)
          .setDefaultMemberPermissions("0")
          .addSubcommand((command) =>
            command
              .setName("add")
              .setDescription("Add a blacklisted user or server to Reindeer.")
              .addStringOption((option) =>
                option
                  .setName("id")
                  .setDescription("The ID of the user/server to add to the blacklist")
                  .setMaxLength(17)
                  .setMaxLength(20)
                  .setRequired(true),
              )
              .addStringOption((option) =>
                option.setName("reason").setDescription("The reason for the blacklist").setRequired(true),
              )
              .addBooleanOption((option) =>
                option.setName("hide").setDescription("Whether to hide the reply (default: true)"),
              ),
          )
          .addSubcommand((command) =>
            command
              .setName("remove")
              .setDescription("Remove a blacklisted user or server to Reindeer.")
              .addStringOption((option) =>
                option
                  .setName("id")
                  .setDescription("The ID of the user/server to remove from the blacklist")
                  .setMaxLength(17)
                  .setMaxLength(20)
                  .setRequired(true),
              )
              .addBooleanOption((option) =>
                option.setName("hide").setDescription("Whether to hide the reply (default: true)"),
              ),
          )
          .addSubcommand((command) =>
            command
              .setName("list")
              .setDescription("List all blacklisted users and server from Reindeer.")
              .addStringOption((option) =>
                option
                  .setName("id")
                  .setDescription("The ID of the user/server to see from the blacklist")
                  .setMaxLength(17)
                  .setMaxLength(20),
              )
              .addBooleanOption((option) =>
                option.setName("hide").setDescription("Whether to hide the reply (default: true)"),
              ),
          ),
      {
        idHints: [],
        guildIds: [env.DEVELOPMENT_GUILD_ID],
      },
    );
  }

  public async isGuild(id: string) {
    try {
      await this.container.client.rest.get(Routes.guildAuditLog(id));
      return true;
    } catch (error_) {
      const error = error_ as DiscordAPIError;
      return error.code === 50_013; // Missing Permissions
    }
  }

  public async isUser(id: string) {
    try {
      await this.container.client.users.fetch(id);
      return true;
    } catch {
      return false;
    }
  }

  public async chatInputAdd(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const id = interaction.options.getString("id", true).trim();
    const reason = interaction.options.getString("reason", true);
    const hide = interaction.options.getBoolean("hide") ?? true;

    await interaction.deferReply({ ephemeral: hide });

    if (!SnowflakeRegex.test(id)) {
      return await interaction.editReply("The provided ID is invalid.");
    }

    if (id === env.DEVELOPMENT_GUILD_ID) {
      return await interaction.editReply("You cannot blacklist the development guild.");
    }

    if (id === env.BOT_OWNER_ID) {
      return await interaction.editReply("You cannot blacklist the bot owner.");
    }

    if (id === interaction.client.id) {
      return await interaction.editReply("You cannot blacklist Reindeer.");
    }

    const existingBlacklist = await prisma.botBlacklist.findUnique({ where: { id } });
    if (existingBlacklist) {
      return await interaction.editReply("This user or server is already blacklisted.");
    }

    const type = (await this.isGuild(id)) ? "Guild" : (await this.isUser(id)) ? "User" : undefined;
    if (!type) {
      return await interaction.editReply("The provided ID is not a user or server.");
    }

    await prisma.botBlacklist.create({ data: { id, type, reason } });
    botBlacklistCache.add(id);

    return await interaction.editReply(
      `${type === "Guild" ? "Server" : "User"} \`${id}\` has been blacklisted from using Reindeer for: ${reason}`,
    );
  }

  public async chatInputRemove(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const id = interaction.options.getString("id", true).trim();
    const hide = interaction.options.getBoolean("hide") ?? true;

    await interaction.deferReply({ ephemeral: hide });

    if (!SnowflakeRegex.test(id)) {
      return await interaction.editReply("The provided ID is invalid.");
    }

    const existingBlacklist = await prisma.botBlacklist.findUnique({ where: { id } });
    if (!existingBlacklist) {
      return await interaction.editReply("This user or server is not been blacklisted.");
    }

    await prisma.botBlacklist.delete({ where: { id } });
    botBlacklistCache.delete(id);

    return await interaction.editReply(
      `The blacklist for ${existingBlacklist.type === "Guild" ? "server" : "user"} \`${id}\` has been removed.`,
    );
  }

  public async chatInputList(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const id = interaction.options.getString("id")?.trim();
    const hide = interaction.options.getBoolean("hide") ?? true;

    if (id && !SnowflakeRegex.test(id)) {
      return await interaction.reply({ content: "The provided ID is invalid.", ephemeral: hide });
    }

    let currentPage = 1;
    const totalCount = await prisma.botBlacklist.count({ where: { id } });
    const initialEntries = await prisma.botBlacklist.findMany({
      where: { id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    function generateEmbed(entries: typeof initialEntries) {
      return new EmbedBuilder()
        .setColor(colours.primary)
        .setTitle(`${totalCount} blacklisted users and servers found`)
        .setDescription(
          entries
            .map((entry) =>
              [
                `- ${time(entry.createdAt, "R")} **${entry.type === "Guild" ? "Server" : "User"}** \`${entry.id}\``,
                `  - **Reason**: ${entry.reason}`,
              ].join("\n"),
            )
            .join("\n") || "*No blacklisted users or servers found.*",
        )
        .setFooter({
          text: `Page ${currentPage}/${Math.ceil(totalCount / 10)} | ${entries.length}/${totalCount} entries shown`,
        });
    }

    function generateRow(disableAll = false) {
      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`bot_blacklist:back`)
          .setEmoji("⬅️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disableAll || currentPage === 1),
        new ButtonBuilder()
          .setCustomId(`bot_blacklist:forward`)
          .setEmoji("➡️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disableAll || currentPage === Math.ceil(totalCount / 10)),
      );
    }

    const msg = await interaction.reply({
      embeds: [generateEmbed(initialEntries)],
      components: [generateRow()],
      ephemeral: hide,
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      time: 890_000,
      componentType: ComponentType.Button,
    });

    collector.on("collect", async (btnInteraction) => {
      if (btnInteraction.user.id !== interaction.user.id) {
        await btnInteraction.reply({ content: "You cannot use this button.", ephemeral: true });
        return;
      }

      btnInteraction.customId.endsWith("forward") ? currentPage++ : currentPage--;

      const entries = await prisma.botBlacklist.findMany({
        where: { id },
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * 10,
        take: 10,
      });

      await btnInteraction.update({
        embeds: [generateEmbed(entries)],
        components: [generateRow()],
      });
    });

    collector.on("end", async () => {
      if (collector.endReason !== "time") return;
      await msg.edit({ components: [generateRow(true)] }).catch(() => undefined);
    });

    return;
  }
}
