import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  RoleSelectMenuBuilder,
  Snowflake,
} from "discord.js";

import colours from "../../constants/colours.js";

export type MiscSettings = {
  newReportPingRoles: string[];
};

function formatSettings(settings: MiscSettings) {
  return [
    {
      name: "New report ping roles",
      value: [
        "These roles will be pinged when a new report is created.",
        `- **New report ping roles**: ${
          settings.newReportPingRoles.length ? `<@&${settings.newReportPingRoles.join(">, <@&")}>` : "None"
        }`,
      ].join("\n"),
    },
  ];
}

export async function setMisc(
  message: Message<true>,
  userId: Snowflake,
  settings: MiscSettings,
): Promise<MiscSettings> {
  function generateNewReportPingsRow(defaultRoles: string[]) {
    return new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId(`setup_misc_new_report_ping_roles:${message.id}`)
        .setPlaceholder("Select new report ping roles")
        .setMinValues(0)
        .setMaxValues(5)
        .setDefaultRoles(defaultRoles),
    );
  }

  const embed = new EmbedBuilder()
    .setColor(colours.primary)
    .setAuthor({
      name: "Reindeer Setup",
      iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
    })
    .setTitle("Configure miscellaneous settings")
    .setDescription(
      "This is the miscellaneous settings menu. Here you can configure settings that don't fit into any other category.",
    )
    .setFields(formatSettings(settings));

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup_misc_continue:${message.id}`)
      .setLabel("Continue")
      .setStyle(ButtonStyle.Primary),
  );

  await message.edit({
    content: "",
    embeds: [embed],
    components: [generateNewReportPingsRow(settings.newReportPingRoles), buttonRow],
  });

  const collector = message.createMessageComponentCollector({
    filter: (i) => i.user.id === userId,
    time: 890_000,
  });

  collector.on("end", async () => {
    if (collector.endReason !== "time") return;
    await message
      .edit({
        content: "You took too long to respond.",
        embeds: [],
        components: [],
      })
      .catch(() => undefined);
  });

  return new Promise((resolve) => {
    collector.on("collect", async (componentInteraction) => {
      if (
        componentInteraction.customId.startsWith("setup_misc_new_report_ping_roles") &&
        componentInteraction.isRoleSelectMenu()
      ) {
        settings.newReportPingRoles = [...componentInteraction.roles.keys()];

        await message.edit({
          embeds: [embed.setFields(formatSettings(settings))],
          components: [generateNewReportPingsRow(settings.newReportPingRoles), buttonRow],
        });
        await componentInteraction.reply({
          content: `New report ping roles updated: ${
            settings.newReportPingRoles.length ? `<@&${settings.newReportPingRoles.join(">, <@&")}>` : "None"
          }`,
          ephemeral: true,
        });
      } else if (componentInteraction.customId.startsWith("setup_misc_continue")) {
        await componentInteraction.deferUpdate();
        collector.stop();
        return resolve(settings);
      }
    });
  });
}
