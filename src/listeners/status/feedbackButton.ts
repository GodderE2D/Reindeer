import { Events, Listener } from "@sapphire/framework";
import { Interaction } from "discord.js";

import { sendFeedback } from "../../functions/sendFeedback.js";
import { prisma } from "../../index.js";

export class SendFeedbackListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.InteractionCreate,
    });
  }

  public async run(interaction: Interaction) {
    if (!interaction.isButton() || !interaction.inCachedGuild()) return;
    if (!interaction.customId.startsWith("send_feedback")) return;

    const number = parseInt(interaction.customId.split(":")[1]);
    const report = await prisma.report.findUnique({
      where: { number_guildId: { number, guildId: interaction.guild.id } },
      include: { guild: true },
    });

    if (!report) {
      return await interaction.reply({ content: `Report #${number} does not exist.`, ephemeral: true });
    }

    if (report.reportFeedbackSent) {
      return await interaction.reply({
        content: `Feedback for report #${number} has already been sent.`,
        ephemeral: true,
      });
    }

    if (report.status === "Open") {
      return await interaction.reply({
        content: `Report #${number} is still opened. Please close it before sending feedback.`,
        ephemeral: true,
      });
    }

    const author = await interaction.client.users.fetch(report.authorId).catch(() => undefined);
    if (!author) {
      return await interaction.reply({
        content: `The author for report #${number} no longer exists.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    await sendFeedback(report, author, interaction.member);
    return await interaction.editReply(`Report feedback has been sent to ${author}.`);
  }
}
