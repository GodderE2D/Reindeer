import dayjs from "dayjs";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  ModalBuilder,
  RoleSelectMenuBuilder,
  Snowflake,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import colours from "../../constants/colours.js";

export async function setPermissionsAndCooldowns(
  message: Message,
  userId: Snowflake,
  disallowedTargetRoles: Snowflake[] = [],
  cooldownBypassRoles: Snowflake[] = [],
  reportCooldown = 0,
  duplicateReportCooldown = 0,
): Promise<{
  disallowedTargetRoles: Snowflake[];
  cooldownBypassRoles: Snowflake[];
  reportCooldown: number;
  duplicateReportCooldown: number;
}> {
  function setEmbedFields(embed: EmbedBuilder) {
    return embed.setFields({
      name: "Current values",
      value: [
        `- **Disallowed target roles**: ${
          disallowedTargetRoles.length ? `<@&${disallowedTargetRoles.join(">, <@&")}>` : "None"
        }`,
        `- **Cooldown bypass roles**: ${
          cooldownBypassRoles.length ? `<@&${cooldownBypassRoles.join(">, <@&")}>` : "None"
        }`,
        `- **Report cooldown**: ${dayjs.duration({ seconds: reportCooldown }).humanize()}`,
        `- **Duplicate report cooldown**: ${dayjs.duration({ seconds: duplicateReportCooldown }).humanize()}`,
      ].join("\n"),
    });
  }

  const embed = new EmbedBuilder()
    .setColor(colours.primary)
    .setAuthor({
      name: "Reindeer Setup",
      iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
    })
    .setTitle("Configure permissions and cooldowns")
    .setDescription(
      [
        "You can configure permissions and cooldowns for Reindeer here. Most permissions can be configured through *Server Settings > Integrations > Reindeer*. All fields are optional.",
        "- **Disallowed target roles**: The report target (for both message & user reports) cannot have any of these roles",
        "- **Cooldown bypass roles**: Members with these roles can create reports without being affected by the cooldowns below",
        "- **Report cooldown**: The amount of time a member must wait before creating another report",
        "- **Duplicate report cooldown**: The amount of time anyone must wait before creating another report on the same message (for message reports) or target (for user reports)",
      ].join("\n"),
    );

  const disallowedTargetRolesRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`setup_permissions_disallowed_target_roles:${message.id}`)
      .setPlaceholder("Select disallowed target roles")
      .setMaxValues(25),
  );

  const cooldownBypassRolesRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`setup_permissions_cooldown_bypass_roles:${message.id}`)
      .setPlaceholder("Select cooldown bypass roles")
      .setMaxValues(25),
  );

  const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup_cooldowns_report_cooldown:${message.id}`)
      .setLabel("Set report cooldown")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`setup_cooldowns_duplicate_report_cooldown:${message.id}`)
      .setLabel("Set duplicate report cooldown")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`setup_permissions_cooldowns_continue:${message.id}`)
      .setLabel("Continue")
      .setStyle(ButtonStyle.Primary),
  );

  await message.edit({
    content: "",
    embeds: [setEmbedFields(embed)],
    components: [disallowedTargetRolesRow, cooldownBypassRolesRow, buttonsRow],
  });

  const collector = message.createMessageComponentCollector({ filter: (i) => i.user.id === userId, time: 890_000 });

  collector.on("end", async () => {
    if (collector.endReason !== "time") return;
    await message.edit({ content: "You took too long to respond.", embeds: [], components: [] });
  });

  return new Promise((resolve) => {
    collector.on("collect", async (componentInteraction) => {
      if (componentInteraction.isRoleSelectMenu()) {
        const isDisallowedTargetRoles = componentInteraction.customId.startsWith("setup_permissions_disallowed_target");

        if (isDisallowedTargetRoles) {
          disallowedTargetRoles = componentInteraction.values;
        } else {
          cooldownBypassRoles = componentInteraction.values;
        }

        return void (await componentInteraction.deferUpdate());
      }

      if (componentInteraction.isButton()) {
        if (componentInteraction.customId.startsWith(`setup_permissions_cooldowns_continue`)) {
          await componentInteraction.deferUpdate();
          collector.stop();
          return resolve({ disallowedTargetRoles, cooldownBypassRoles, reportCooldown, duplicateReportCooldown });
        }

        const isReportCooldown = componentInteraction.customId.startsWith(`setup_cooldowns_report_cooldown`);

        const modal = new ModalBuilder()
          .setCustomId("setup_cooldowns_modal")
          .setTitle(`Set ${isReportCooldown ? "report cooldown" : "duplicate report cooldown"}`)
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId(`setup_cooldowns_value:${message.id}`)
                .setLabel(`${isReportCooldown ? "Report cooldown" : "Duplicate report cooldown"} (in seconds)`)
                .setValue(`${isReportCooldown ? reportCooldown : duplicateReportCooldown}`)
                .setPlaceholder("For example, '1800' would be 30 minutes. Enter '0' for no cooldown.")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(15),
            ),
          );

        await componentInteraction.showModal(modal);

        const modalInteraction = await componentInteraction
          .awaitModalSubmit({ time: 890_000 })
          .catch(
            async () =>
              void (await componentInteraction.reply({ content: "You took too long to respond.", ephemeral: true })),
          );

        if (!modalInteraction) return;

        const parsed = Math.floor(
          Number(modalInteraction.fields.getTextInputValue(`setup_cooldowns_value:${message.id}`)),
        );

        if (isNaN(parsed)) {
          return void modalInteraction.reply({ content: "Invalid number. Please try again.", ephemeral: true });
        }

        if (parsed < 0) {
          return void modalInteraction.reply({
            content: "Number cannot be negative. Please try again.",
            ephemeral: true,
          });
        }

        if (isReportCooldown) {
          reportCooldown = parsed;
        } else {
          duplicateReportCooldown = parsed;
        }

        modalInteraction.reply({ content: "Cooldown set.", ephemeral: true });
        return void (await message.edit({
          embeds: [setEmbedFields(embed)],
          components: [disallowedTargetRolesRow, cooldownBypassRolesRow, buttonsRow],
        }));
      }
    });
  });
}
