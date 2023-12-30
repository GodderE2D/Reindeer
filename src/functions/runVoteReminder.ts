import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

import colours from "../constants/colours.js";
import { client, logger, prisma } from "../index.js";

export async function runVoteReminder() {
  const votes = await prisma.vote.findMany({
    where: {
      AND: [
        { createdAt: { gt: new Date(Date.now() - 43_260_000) } },
        { createdAt: { lte: new Date(Date.now() - 43_200_000) } },
      ],
    },
  });

  for (const vote of votes) {
    const user = await client.users.fetch(vote.userId);

    if (!user) {
      logger.warn(`User ${vote.userId} not found for vote ${vote.id}`);
      continue;
    }

    const embed = new EmbedBuilder()
      .setColor(colours.pink)
      .setAuthor({
        name: "Vote Reminder",
        iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
      })
      .setDescription(
        `You have last voted for Reindeer <t:${Math.floor(
          vote.createdAt.getTime() / 1000,
        )}:R>, you can now vote again.`,
      )
      .setFooter({ text: "To disable reminders, run /vote and click on the button." });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Vote on Top.gg")
        .setStyle(ButtonStyle.Link)
        .setURL("https://top.gg/bot/1126157327746211840/vote"),
    );

    try {
      await user.send({ embeds: [embed], components: [row] });
    } catch (error) {
      logger.info(`Could not send a DM to ${vote.userId}, likely because of their privacy settings`);
    }
  }
}
