import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const basicAdsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setLabel("Vote for Reindeer").setStyle(ButtonStyle.Link).setURL("https://reindeer.bsr.gg/vote"),
  new ButtonBuilder().setLabel("Invite Reindeer").setStyle(ButtonStyle.Link).setURL("https://reindeer.bsr.gg/invite"),
);
