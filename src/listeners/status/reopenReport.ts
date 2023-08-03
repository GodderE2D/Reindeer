import { Events, Listener } from "@sapphire/framework";
import { Interaction } from "discord.js";

import { setReportStatus } from "../../functions/setReportStatus.js";

export class ReopenReportListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.InteractionCreate,
    });
  }
  public async run(interaction: Interaction) {
    if (!interaction.isButton() || !interaction.inCachedGuild()) return;
    if (!interaction.customId.startsWith("report_reopen:")) return;

    const number = parseInt(interaction.customId.split(":")[1]);

    await interaction.deferReply({ ephemeral: true });
    const result = await setReportStatus("Open", number, interaction);

    if (result) {
      await interaction.editReply(
        `This report has been re-opened. Please note that previous trackers cannot be recovered.`,
      );
    }
  }
}
