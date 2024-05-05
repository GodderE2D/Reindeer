import type { Guild as PrismaGuild } from "@prisma/client";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  EmbedBuilder,
  Guild,
  ModalBuilder,
  SelectMenuComponentOptionData,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  User,
} from "discord.js";
import { ComponentType } from "discord.js";

import colours from "../../constants/colours.js";
import { memberCache, prisma } from "../../index.js";
import { disableComponents } from "../disableComponents.js";

async function getMutualGuilds(user: User, target: User) {
  const guilds: SelectMenuComponentOptionData[] = [];

  for (const [guildId, members] of memberCache.entries()) {
    if (!members.includes(user.id)) continue;

    const guild = user.client.guilds.cache.get(guildId);
    if (!guild) continue;

    const guildData = await prisma.guild.findUnique({ where: { guildId: guild.id } });
    if (!guildData?.dmReportsEnabled) continue;

    if (!members.includes(target.id)) continue;

    guilds.push({ label: `${guild.name} (${guild.id})`, value: guild.id });
  }

  return guilds;
}

export async function selectGuild(
  author: User,
  target: User,
  interaction: ChatInputCommandInteraction<"cached"> | ContextMenuCommandInteraction<"cached">,
): Promise<{
  guild: Guild;
  guildData: PrismaGuild;
  i: ButtonInteraction<"cached">;
}> {
  const embed = new EmbedBuilder()
    .setColor(colours.pink)
    .setTitle("Select a server for this report")
    .setDescription(
      [
        `Please select the server you want to report this DM message in. You can only report this message in servers with Reindeer, ${target}, and you.`,
        "If you don't see the server you're looking for, try selecting manually. Otherwise, the server may not have Reindeer set up or have disabled reports from DMs.",
      ].join("\n\n"),
    );

  const mutualGuilds = await getMutualGuilds(author, target);

  const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`guild-select:${interaction.id}`)
      .setPlaceholder(mutualGuilds.length ? "Select a server" : "Unable to find any servers")
      .setOptions(mutualGuilds.length ? mutualGuilds : [{ label: "--", value: "--" }])
      .setDisabled(!mutualGuilds.length),
  );

  function createButtonRow(confirm: boolean) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`manual-guild-select:${interaction.id}`)
        .setStyle(ButtonStyle.Secondary)
        .setLabel("Select manually by server ID"),
      new ButtonBuilder()
        .setCustomId(`confirm-guild:${interaction.id}`)
        .setStyle(ButtonStyle.Primary)
        .setLabel("Continue & add reason")
        .setDisabled(!confirm),
    );
  }

  const msg = await interaction.reply({
    embeds: [embed],
    components: [menuRow, createButtonRow(false)],
    ephemeral: true,
    fetchReply: true,
  });

  const collector = msg.createMessageComponentCollector({ time: 890_000 });

  collector.on("end", () => {
    if (collector.endReason !== "time") return;

    interaction
      .editReply({ content: "You took too long to respond.", embeds: [], components: [] })
      .catch(() => undefined);
  });

  return new Promise((resolve) => {
    let final: { guild: Guild; guildData: PrismaGuild };

    function generateConfirmEmbed(guild: Guild) {
      return new EmbedBuilder()
        .setColor(colours.primary)
        .setTitle(`Selected server: ${guild.name}`)
        .setThumbnail(guild.iconURL())
        .setDescription(
          `Are you sure you want to continue reporting this message in **${guild.name}** (\`${guild.id}\`)? If not, please select another server.`,
        );
    }

    collector.on("collect", async (i) => {
      if (i.customId === `manual-guild-select:${interaction.id}`) {
        if (i.componentType !== ComponentType.Button) throw new Error("Expected button component");

        const modal = new ModalBuilder()
          .setCustomId(`guild-select-modal:${i.id}`)
          .setTitle("Select server manually")
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId("guild-id")
                .setStyle(TextInputStyle.Paragraph)
                .setLabel("Server ID")
                .setPlaceholder(
                  "Enable Developer Mode and right-click or long-press on the server icon and select 'Copy Server ID'.",
                )
                .setMinLength(17)
                .setMaxLength(20)
                .setRequired(true),
            ),
          );

        await i.showModal(modal);
        const modalInteraction = await i
          .awaitModalSubmit({ filter: (m) => m.customId.endsWith(i.id), time: 890_000 })
          .catch(() => undefined);
        if (!modalInteraction) return;

        const guildId = modalInteraction.fields.getTextInputValue("guild-id");
        const guild = interaction.client.guilds.cache.get(guildId);

        if (!guild) {
          return await modalInteraction.reply({
            content:
              "The server ID you provided was invalid, the server wasn't found, the target isn't in the server, the server hasn't set up Reindeer yet, or the server disabled reports from DMs. Please try again.",
            ephemeral: true,
          });
        }

        const guildData = await prisma.guild.findUnique({ where: { guildId: guild.id } });

        if (!guildData?.dmReportsEnabled) {
          return await modalInteraction.reply({
            content:
              "The server ID you provided was invalid, that server wasn't found, the target isn't in the server, the server hasn't set up Reindeer yet, or the server disabled reports from DMs. Please try again.",
            ephemeral: true,
          });
        }

        if (!(await guild?.members.fetch(target.id).catch(() => undefined))) {
          return await modalInteraction.reply({
            content:
              "The server ID you provided was invalid, that server wasn't found, the target isn't in the server, the server hasn't set up Reindeer yet, or the server disabled reports from DMs. Please try again.",
            ephemeral: true,
          });
        }

        await modalInteraction.deferUpdate();
        await i.editReply({
          embeds: [generateConfirmEmbed(guild)],
          components: [menuRow, createButtonRow(true)],
        });

        final = { guild, guildData };
      } else if (i.customId === `guild-select:${interaction.id}`) {
        if (i.componentType !== ComponentType.StringSelect) throw new Error("Expected string select component");

        const guildId = i.values[0];
        const guild = interaction.client.guilds.cache.get(guildId);

        if (!guild) {
          return await i.reply({
            content:
              "The server you selected was invalid, that server wasn't found, the target isn't in the server, the server hasn't set up Reindeer yet, or the server disabled reports from DMs. Please try again.",
            ephemeral: true,
          });
        }

        const guildData = await prisma.guild.findUnique({ where: { guildId: guild.id } });

        if (!guildData?.dmReportsEnabled) {
          return await i.reply({
            content:
              "The server you selected was invalid, that server wasn't found, the target isn't in the server, the server hasn't set up Reindeer yet, or the server disabled reports from DMs. Please try again.",
            ephemeral: true,
          });
        }

        if (!(await guild?.members.fetch(target.id))) {
          return await i.reply({
            content:
              "The server ID you provided was invalid, that server wasn't found, the target isn't in the server, the server hasn't set up Reindeer yet, or the server disabled reports from DMs. Please try again.",
            ephemeral: true,
          });
        }

        await i.update({ embeds: [generateConfirmEmbed(guild)], components: [menuRow, createButtonRow(true)] });

        final = { guild, guildData };
      } else if (i.customId === `confirm-guild:${interaction.id}` && i.componentType === ComponentType.Button) {
        interaction.editReply({ components: [disableComponents(menuRow), disableComponents(createButtonRow(false))] });

        collector.stop();
        resolve({ ...final, i });
      }

      return;
    });
  });
}
