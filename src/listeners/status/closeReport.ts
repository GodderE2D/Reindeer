import { Events, Listener } from "@sapphire/framework";
import { Interaction } from "discord.js";

import { setReportStatus } from "../../functions/setReportStatus.js";

export class CloseReportListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.InteractionCreate,
    });
  }
  public async run(interaction: Interaction) {
    if (!interaction.isButton() || !interaction.inCachedGuild()) return;
    if (!(interaction.customId.startsWith("report_approve:") || interaction.customId.startsWith("report_reject:"))) {
      return;
    }

    const status = interaction.customId.startsWith("report_approve") ? "Approved" : "Rejected";
    const number = parseInt(interaction.customId.split(":")[1]);

    await interaction.deferReply({ ephemeral: true });
    const result = await setReportStatus(status, number, interaction);

    if (result) {
      await interaction.editReply(`This report has been closed and its associated trackers have been deleted.`);
    }
  }
}
