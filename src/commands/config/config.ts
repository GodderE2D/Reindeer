import { ChatInputCommand } from "@sapphire/framework";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { EmbedBuilder, PermissionFlagsBits, User } from "discord.js";

import colours from "../../constants/colours.js";
import { setChannel } from "../../functions/config/setChannel.js";
import { setConfirmMessage } from "../../functions/config/setConfirmMessage.js";
import { setFields } from "../../functions/config/setFields.js";
import { setPermissionsAndCooldowns } from "../../functions/config/setPermissionsAndCooldowns.js";
import { prisma } from "../../index.js";

export class ConfigChatInputCommand extends Subcommand {
  public constructor(context: Subcommand.Context, options: Subcommand.Options) {
    super(context, {
      ...options,
      name: "config",
      description: "Configure Reindeer's settings for this server.",
      subcommands: [
        { name: "channel", chatInputRun: "chatInputChannel" },
        { name: "fields", chatInputRun: "chatInputFields" },
        { name: "confirmation-message", chatInputRun: "chatInputConfirmationMessage" },
        { name: "permissions-cooldowns", chatInputRun: "chatInputPermissionsCooldowns" },
      ],
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
          .addSubcommand((command) =>
            command.setName("channel").setDescription("Configure the report forum channel for this server."),
          )
          .addSubcommand((command) =>
            command.setName("fields").setDescription("Configure report fields/questions for this server."),
          )
          .addSubcommand((command) =>
            command
              .setName("confirmation-message")
              .setDescription("Configure report confirmation messages for this server."),
          )
          .addSubcommand((command) =>
            command
              .setName("permissions-cooldowns")
              .setDescription("Configure permissions and cooldowns for this server."),
          ),
      {
        idHints: ["1136553435802636338"],
      },
    );
  }

  private async checkPermissionsAndSendMessage(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return void (await interaction.reply({
        content: "Only members with the Administrator permission can setup Reindeer.",
        ephemeral: true,
      }));
    }

    const existingGuild = await prisma.guild.findUnique({ where: { guildId: interaction.guild.id } });

    if (!existingGuild) {
      return void (await interaction.reply({
        content: "Reindeer is not setup in this server yet. Please run `/setup` first.",
        ephemeral: true,
      }));
    }

    await interaction.reply({ content: "Initialising the setup...", ephemeral: true });

    const sent = await interaction.channel?.send("Please wait...").catch(() => undefined);

    if (!sent) {
      return void (await interaction.editReply(
        "Reindeer was unable to send a message in this channel, please check your permissions.",
      ));
    }

    return sent;
  }

  private generateEmbed(text: string, author: User) {
    return new EmbedBuilder()
      .setColor(colours.primary)
      .setAuthor({ name: `${author.tag} (${author.id})`, iconURL: author.displayAvatarURL({ forceStatic: true }) })
      .setDescription(text);
  }

  public async chatInputChannel(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const message = await this.checkPermissionsAndSendMessage(interaction);
    if (!message) return;

    const { channel, createdTags } = (await setChannel(message, interaction.user.id)) ?? {};
    if (!channel || !createdTags || !message) return;

    await prisma.guild.update({
      where: { guildId: interaction.guild.id },
      data: {
        forumChannelId: channel.id,
        messageTagId: createdTags.message?.id ?? "",
        userTagId: createdTags.user?.id ?? "",
        openTagId: createdTags.open?.id ?? "",
        approvedTagId: createdTags.approved?.id ?? "",
        rejectedTagId: createdTags.rejected?.id ?? "",
      },
    });

    return await message.edit({
      embeds: [
        this.generateEmbed(
          "Report channel updated.\n**Warning: This will break functionality in old reports.** If you haven't closed your reports in the old channel yet, please revert back to the old channel.",
          interaction.user,
        ),
      ],
      components: [],
    });
  }

  public async chatInputFields(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const message = await this.checkPermissionsAndSendMessage(interaction);
    if (!message) return;

    const fields = await setFields(message, interaction.user.id);

    await prisma.guild.update({
      where: { guildId: interaction.guild.id },
      data: {
        fieldNames: fields.map((field) => field.name),
        fieldPlaceholders: fields.map((field) => field.placeholder ?? ""),
        fieldStyles: fields.map((field) => field.style),
        fieldMins: fields.map((field) => field.min),
        fieldMaxes: fields.map((field) => field.max),
      },
    });

    return await message.edit({
      embeds: [this.generateEmbed("Report fields updated.", interaction.user)],
      components: [],
    });
  }

  public async chatInputConfirmationMessage(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const message = await this.checkPermissionsAndSendMessage(interaction);
    if (!message) return;

    const { messageReportMsg, userReportMsg } = await setConfirmMessage(message, interaction.user.id);

    await prisma.guild.update({
      where: { guildId: interaction.guild.id },
      data: {
        messageReportConfirmMessage: messageReportMsg,
        userReportConfirmMessage: userReportMsg,
      },
    });

    return await message.edit({
      embeds: [this.generateEmbed("Report confirmation message updated.", interaction.user)],
      components: [],
    });
  }

  public async chatInputPermissionsCooldowns(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const message = await this.checkPermissionsAndSendMessage(interaction);
    if (!message) return;

    const { disallowedTargetRoles, cooldownBypassRoles, reportCooldown, duplicateReportCooldown } =
      await setPermissionsAndCooldowns(message, interaction.user.id);

    await prisma.guild.update({
      where: { guildId: interaction.guild.id },
      data: {
        disallowedTargetRoles: disallowedTargetRoles,
        reportCooldown: reportCooldown,
        duplicateReportCooldown: duplicateReportCooldown,
        reportCooldownBypassRoles: cooldownBypassRoles,
      },
    });

    return await message.edit({
      embeds: [this.generateEmbed("Report permissions and cooldowns updated.", interaction.user)],
      components: [],
    });
  }
}
