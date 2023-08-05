import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  ForumChannel,
  Message,
  OverwriteType,
  PermissionFlagsBits,
  Snowflake,
} from "discord.js";

import colours from "../../constants/colours.js";
import { disableComponents } from "../disableComponents.js";

export async function setChannel(originalMessage: Message<true>, userId: Snowflake) {
  let TAGS = [
    { name: "t: message", emoji: { id: null, name: "🗨️" } },
    { name: "t: user", emoji: { id: null, name: "👥" } },
    { name: "s: open", emoji: { id: null, name: "🔵" } },
    { name: "s: approved", emoji: { id: null, name: "🟢" } },
    { name: "s: rejected", emoji: { id: null, name: "🔴" } },
  ];

  const embed = new EmbedBuilder()
    .setColor(colours.primary)
    .setAuthor({
      name: "Reindeer Setup",
      iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
    })
    .setTitle("Configure your reports forum channel")
    .setDescription(
      "When a member creates a report, Reindeer will send information about the report to a new thread in this (usually private) forum channel with appropriate tags. Your staff team can then discuss about this report and eventually close it. This channel will also be used to send notifications on trackers, such as when a member deletes their message or leaves the server.\n\nYou can either let Reindeer create a private forum channel for you, or choose an existing channel to use. If you choose to use an existing channel, Reindeer will add five tags to the channel.",
    );

  const menuRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(`setup_select_channel:${originalMessage.id}`)
      .setPlaceholder("Select a forum channel to use")
      .setChannelTypes(ChannelType.GuildForum),
  );

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup_create_channel:${originalMessage.id}`)
      .setLabel("Create a channel for me")
      .setStyle(ButtonStyle.Primary),
  );

  const message = await originalMessage.edit({ content: "", embeds: [embed], components: [menuRow, buttonRow] });

  const componentInteraction = await message
    .awaitMessageComponent({
      filter: (i) => i.user.id === userId,
      time: 890_000,
    })
    .catch(
      async () =>
        void (await message.edit({
          content: "You took too long to respond.",
          components: [disableComponents(menuRow), disableComponents(buttonRow)],
        })),
    );

  if (!componentInteraction) return;
  componentInteraction.deferUpdate();

  if (componentInteraction.isChannelSelectMenu()) {
    const channel = componentInteraction.channels.first();
    if (!(channel instanceof ForumChannel)) throw new Error("Channel is not a ForumChannel");

    if (!message.member) throw new Error("message.member is null");
    if (!channel.manageable) {
      return void (await message.edit({
        content: "Reindeer does not have access to manage the channel you selected. Please try again.",
        embeds: [],
        components: [disableComponents(menuRow), disableComponents(buttonRow)],
      }));
    }

    if (channel.availableTags.length > 15) {
      return void (await message.edit({
        content: "The channel you have selected has more than 15 tags. Please try again.",
        embeds: [],
        components: [disableComponents(menuRow), disableComponents(buttonRow)],
      }));
    }

    for (const tag of channel.availableTags) {
      if (TAGS.map((t) => t.name).includes(tag.name)) {
        TAGS = TAGS.filter((t) => t.name !== tag.name);
      }
    }

    await channel.setAvailableTags([...channel.availableTags, ...TAGS]);

    return {
      channel,
      createdTags: {
        message: channel.availableTags.find((tag) => tag.name === "t: message"),
        user: channel.availableTags.find((tag) => tag.name === "t: user"),
        open: channel.availableTags.find((tag) => tag.name === "s: open"),
        approved: channel.availableTags.find((tag) => tag.name === "s: approved"),
        rejected: channel.availableTags.find((tag) => tag.name === "s: rejected"),
      },
    };
  } else if (componentInteraction.isButton()) {
    if (!message.guild.features.includes("COMMUNITY")) {
      return void (await message.edit({
        content:
          "In order to create a forum channel, your server must have be a community server. Please enable Community in your server's settings and try again.",
        embeds: [],
        components: [disableComponents(menuRow), disableComponents(buttonRow)],
      }));
    }

    let channel = await message.guild.channels
      .create({
        name: "reports",
        type: ChannelType.GuildForum,
        permissionOverwrites: [
          // Deny @everyone permission to view the channel
          { id: message.guild.id, type: OverwriteType.Role, deny: PermissionFlagsBits.ViewChannel },
          // Allow Reindeer to manage the channel
          {
            id: message.author.id,
            type: OverwriteType.Member,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.SendMessages,
            ],
          },
        ],
        availableTags: TAGS,
      })
      .catch(() => undefined);

    if (!channel) {
      channel = await message.guild.channels.create({
        name: "reports",
        type: ChannelType.GuildForum,
        permissionOverwrites: [],
        availableTags: TAGS,
      });
    }

    return {
      channel,
      createdTags: {
        message: channel.availableTags.find((tag) => tag.name === "t: message"),
        user: channel.availableTags.find((tag) => tag.name === "t: user"),
        open: channel.availableTags.find((tag) => tag.name === "s: open"),
        approved: channel.availableTags.find((tag) => tag.name === "s: approved"),
        rejected: channel.availableTags.find((tag) => tag.name === "s: rejected"),
      },
    };
  }

  throw new Error("Collected interaction is not a button or channel select menu");
}
