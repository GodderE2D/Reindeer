import { ChatInputCommand, Command } from "@sapphire/framework";
import { EmbedBuilder, PermissionFlagsBits } from "discord.js";

import { basicAdsRow } from "../../constants/advertisements.js";
import colours from "../../constants/colours.js";
import { setChannel } from "../../functions/config/setChannel.js";
import { DEFAULT_MESSAGE_REPORT_MSG, DEFAULT_USER_REPORT_MSG } from "../../functions/config/setConfirmMessage.js";
import { DEFAULT_FIELDS } from "../../functions/config/setFields.js";
import { prisma } from "../../index.js";

export class SetupChatInputCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "setup",
      description: "Setup Reindeer in this server. Note: This will send a message in the current channel.",
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
        idHints: [],
      },
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction<"cached">) {
    const existingGuild = await prisma.guild.findUnique({ where: { guildId: interaction.guild.id } });

    if (existingGuild) {
      return interaction.reply({
        content: "Reindeer is already setup in this server. Use one of the `/config` commands instead.",
        ephemeral: true,
      });
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

    await prisma.guild.create({
      data: {
        guildId: interaction.guild.id,
        forumChannelId: channel.id,

        messageTagId: createdTags.message?.id ?? "",
        userTagId: createdTags.user?.id ?? "",
        openTagId: createdTags.open?.id ?? "",
        approvedTagId: createdTags.approved?.id ?? "",
        rejectedTagId: createdTags.rejected?.id ?? "",

        fieldNames: DEFAULT_FIELDS.map((field) => field.name),
        fieldPlaceholders: DEFAULT_FIELDS.map((field) => field.placeholder ?? ""),
        fieldStyles: DEFAULT_FIELDS.map((field) => field.style),
        fieldMins: DEFAULT_FIELDS.map((field) => field.min),
        fieldMaxes: DEFAULT_FIELDS.map((field) => field.max),

        messageReportConfirmMessage: DEFAULT_MESSAGE_REPORT_MSG,
        userReportConfirmMessage: DEFAULT_USER_REPORT_MSG,

        disallowedTargetRoles: [],
        reportCooldown: 0,
        duplicateReportCooldown: 0,
        reportCooldownBypassRoles: [],
      },
    });

    const embed = new EmbedBuilder()
      .setColor(colours.primary)
      .setImage("https://reindeer.bsr.gg/report-message-command.png")
      .setAuthor({
        name: "Reindeer Setup",
        iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
      })
      .setTitle("Reindeer has been setup in this server 🎉")
      .setDescription("Members can now use the right-click context menu or `/report` to report messages and users.")
      .addFields(
        {
          name: "Configure advanced settings",
          value: [
            "**You can use one of the `/config` commands to customise Reindeer further.**",
            "- Use `/config fields` to change the questions asked when a member creates a report.",
            "- Use `/config confirmation-message` to change the confirmation message sent before submitting a report.",
            "- Use `/config permissions-cooldowns` to change permissions and cooldowns for reports.",
            // "- Use `/config logs` to set where logs will be sent.",
            // "- Use `/config automod` to enable and change automod settings.",
            // "- Use `/config global-alert` to enable Global Alert (a global ban system).",
            "- Use `/config channel` to change the report channel you just set.",
          ].join("\n"),
        },
        {
          name: "Need help?",
          value:
            "If you need help using Reindeer, feel free to join our [support server](https://discord.gg/R2FDvcPXTK). Thanks for using Reindeer!",
        },
      );

    return await message.edit({
      embeds: [embed],
      components: [basicAdsRow],
    });
  }
}
