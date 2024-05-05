import { ChatInputCommand } from "@sapphire/framework";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { EmbedBuilder, PermissionFlagsBits, User } from "discord.js";

import colours from "../../constants/colours.js";
import { cacheMembers } from "../../functions/cacheMembers.js";
import { resetData } from "../../functions/config/resetData.js";
import { setChannel } from "../../functions/config/setChannel.js";
import { setConfirmMessage } from "../../functions/config/setConfirmMessage.js";
import { setFeedback } from "../../functions/config/setFeedback.js";
import { Field, setFields } from "../../functions/config/setFields.js";
import { MiscSettings, setMisc } from "../../functions/config/setMisc.js";
import { setPermissionsAndCooldowns } from "../../functions/config/setPermissionsAndCooldowns.js";
import { prisma } from "../../index.js";

export class ConfigChatInputCommand extends Subcommand {
  public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
    super(context, {
      ...options,
      name: "config",
      description: "Configure Reindeer's settings for this server.",
      subcommands: [
        { name: "channel", chatInputRun: "chatInputChannel" },
        { name: "fields", chatInputRun: "chatInputFields" },
        { name: "confirmation-message", chatInputRun: "chatInputConfirmationMessage" },
        { name: "permissions-cooldowns", chatInputRun: "chatInputPermissionsCooldowns" },
        { name: "feedback", chatInputRun: "chatInputFeedback" },
        { name: "misc", chatInputRun: "chatInputMisc" },
        { name: "reset", chatInputRun: "chatInputReset" },
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
          )
          .addSubcommand((command) =>
            command.setName("feedback").setDescription("Configure author feedback for this server."),
          )
          .addSubcommand((command) =>
            command
              .setName("misc")
              .setDescription(
                "Configure miscellaneous settings for this server, like DM reports and new report pings.",
              ),
          )
          .addSubcommand((command) =>
            command.setName("reset").setDescription("Delete all associated data with this server."),
          ),
      {
        idHints: [],
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

    const guild = await prisma.guild.findUnique({ where: { guildId: interaction.guild.id } });

    if (!guild) {
      return void (await interaction.reply({
        content: "Reindeer is not setup in this server yet. Please run `/setup` first.",
        ephemeral: true,
      }));
    }

    await interaction.reply({ content: "Initialising the config...", ephemeral: true });

    const message = await interaction.channel?.send("Please wait...").catch(() => undefined);

    if (!message) {
      return void (await interaction.editReply(
        "Reindeer was unable to send a message in this channel, please check your permissions.",
      ));
    }

    return { message, guild };
  }

  private generateEmbed(text: string, author: User) {
    return new EmbedBuilder()
      .setColor(colours.primary)
      .setAuthor({ name: `${author.tag} (${author.id})`, iconURL: author.displayAvatarURL({ forceStatic: true }) })
      .setDescription(text);
  }

  public async chatInputChannel(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const { message } = (await this.checkPermissionsAndSendMessage(interaction)) ?? {};
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
    const { message, guild } = (await this.checkPermissionsAndSendMessage(interaction)) ?? {};
    if (!message || !guild) return;

    const existingFields: Field[] = guild.fieldNames.map((name, index) => ({
      name,
      placeholder: guild.fieldPlaceholders[index],
      style: guild.fieldStyles[index] as 1 | 2,
      min: guild.fieldMins[index],
      max: guild.fieldMaxes[index],
    }));

    const fields = await setFields(message, interaction.user.id, existingFields);

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
    const { message, guild } = (await this.checkPermissionsAndSendMessage(interaction)) ?? {};
    if (!message || !guild) return;

    const { messageReportMsg, userReportMsg } = await setConfirmMessage(
      message,
      interaction.user.id,
      guild.messageReportConfirmMessage,
      guild.userReportConfirmMessage,
    );

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
    const { message, guild } = (await this.checkPermissionsAndSendMessage(interaction)) ?? {};
    if (!message || !guild) return;

    const { disallowedTargetRoles, cooldownBypassRoles, reportCooldown, duplicateReportCooldown } =
      await setPermissionsAndCooldowns(
        message,
        interaction.user.id,
        guild.disallowedTargetRoles,
        guild.reportCooldownBypassRoles,
        guild.reportCooldown,
        guild.duplicateReportCooldown,
      );

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

  public async chatInputFeedback(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const { message, guild } = (await this.checkPermissionsAndSendMessage(interaction)) ?? {};
    if (!message || !guild) return;

    const { feedbackApprovedMsg, feedbackRejectedMsg, feedbackEnabled, feedbackAutoSend } = await setFeedback(
      message,
      interaction.user.id,
      guild.authorFeedbackApprovedMessage,
      guild.authorFeedbackRejectedMessage,
      guild.authorFeedbackEnabled,
      guild.authorFeedbackAutoSend,
    );

    await prisma.guild.update({
      where: { guildId: interaction.guild.id },
      data: {
        authorFeedbackApprovedMessage: feedbackApprovedMsg,
        authorFeedbackRejectedMessage: feedbackRejectedMsg,
        authorFeedbackEnabled: feedbackEnabled,
        authorFeedbackAutoSend: feedbackAutoSend,
      },
    });

    return await message.edit({
      embeds: [this.generateEmbed("Author feedback settings updated.", interaction.user)],
      components: [],
    });
  }

  public async chatInputMisc(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const { message, guild } = (await this.checkPermissionsAndSendMessage(interaction)) ?? {};
    if (!message || !guild) return;

    const existingSettings: MiscSettings = {
      newReportPingRoles: guild.newReportPingRoles,
      dmReportsEnabled: guild.dmReportsEnabled,
    };

    const settings = await setMisc(message, interaction.user.id, existingSettings);

    await prisma.guild.update({
      where: { guildId: interaction.guild.id },
      data: {
        newReportPingRoles: settings.newReportPingRoles,
        dmReportsEnabled: settings.dmReportsEnabled,
      },
    });

    await message.edit({
      embeds: [this.generateEmbed("Miscellaneous settings updated.", interaction.user)],
      components: [],
    });

    if (settings.dmReportsEnabled) await cacheMembers(interaction.guild);
  }

  public async chatInputReset(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const { message, guild } = (await this.checkPermissionsAndSendMessage(interaction)) ?? {};
    if (!message || !guild) return;

    await resetData(message, interaction.user.id);
  }
}
