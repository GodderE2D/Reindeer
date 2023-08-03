import { ChatInputCommand, Command } from "@sapphire/framework";
import { EmbedBuilder, PermissionFlagsBits } from "discord.js";

import colours from "../../constants/colours.js";
import { setChannel } from "../../functions/config/setChannel.js";
import { setConfirmMessage } from "../../functions/config/setConfirmMessage.js";
import { setFields } from "../../functions/config/setFields.js";
import { setPermissionsAndCooldowns } from "../../functions/config/setPermissionsAndCooldowns.js";
import { prisma } from "../../index.js";

export class SetupChatInputCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "setup",
      description: "Setup Reindeer in this server.",
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName(this.name)
          .setDescription(this.description)
          .setDMPermission(false)
          .setDefaultMemberPermissions("0"),
      {
        idHints: ["1135945345579360276"],
      },
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction<"cached">) {
    const existingGuild = await prisma.guild.findUnique({ where: { guildId: interaction.guild.id } });

    if (existingGuild) {
      return interaction.reply({ content: "Reindeer is already setup in this server.", ephemeral: true });
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "Only members with the Administrator permission can setup Reindeer.",
        ephemeral: true,
      });
    }

    await interaction.reply({ content: "Initialising the setup...", ephemeral: true });

    const message = await interaction.channel?.send("Please wait...").catch(() => undefined);

    if (!message) {
      return await interaction.editReply(
        "Reindeer was unable to send a message in this channel, please check your permissions.",
      );
    }

    const { channel, createdTags } = (await setChannel(message, interaction.user.id)) ?? {};
    if (!channel || !createdTags) return;

    const fields = await setFields(message, interaction.user.id);

    const { messageReportMsg, userReportMsg } = await setConfirmMessage(message, interaction.user.id);

    const { disallowedTargetRoles, cooldownBypassRoles, reportCooldown, duplicateReportCooldown } =
      await setPermissionsAndCooldowns(message, interaction.user.id);

    await prisma.guild.create({
      data: {
        guildId: interaction.guild.id,
        forumChannelId: channel.id,

        messageTagId: createdTags.message?.id ?? "",
        userTagId: createdTags.user?.id ?? "",
        openTagId: createdTags.open?.id ?? "",
        approvedTagId: createdTags.approved?.id ?? "",
        rejectedTagId: createdTags.rejected?.id ?? "",

        fieldNames: fields.map((field) => field.name),
        fieldPlaceholders: fields.map((field) => field.placeholder ?? ""),
        fieldStyles: fields.map((field) => field.style),
        fieldMins: fields.map((field) => field.min),
        fieldMaxes: fields.map((field) => field.max),

        messageReportConfirmMessage: messageReportMsg,
        userReportConfirmMessage: userReportMsg,

        disallowedTargetRoles: disallowedTargetRoles,
        reportCooldown: reportCooldown,
        duplicateReportCooldown: duplicateReportCooldown,
        reportCooldownBypassRoles: cooldownBypassRoles,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(colours.primary)
      .setAuthor({
        name: "Reindeer Setup",
        iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
      })
      .setTitle("Reindeer has been setup in this server 🎉")
      .setDescription(
        "Congratulations! Reindeer has now been setup in this server. Members can now use the right-click context menu or `/report` to report messages and users.",
      )
      .addFields(
        {
          name: "Changing settings later",
          value: "You can use the `/config` command to change any of the settings you entered during the setup.",
        },
        {
          name: "Need help?",
          value:
            "If you need help using Reindeer, feel free to join our [support server](https://discord.gg/R2FDvcPXTK). Thanks for using Reindeer!",
        },
      );

    return await message.edit({
      embeds: [embed],
      components: [],
    });
  }
}
