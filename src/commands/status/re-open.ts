import { ChatInputCommand, Command } from "@sapphire/framework";

import { setReportStatus } from "../../functions/setReportStatus.js";

export class ReopenChatInputCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "re-open",
      description: "Reopen a report.",
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName(this.name)
          .setDescription(this.description)
          .setDMPermission(false)
          .setDefaultMemberPermissions("0")
          .addIntegerOption((option) =>
            option.setName("report_number").setDescription("The report number to re-open").setRequired(true),
          ),
      {
        idHints: ["1135872700527693935"],
      },
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction<"cached">) {
    const number = interaction.options.getInteger("report_number", true);

    await interaction.deferReply({ ephemeral: true });
    const result = await setReportStatus("Open", number, interaction);

    if (result) {
      await interaction.editReply(
        `Report #${number} has been re-opened. Please note that previous trackers cannot be recovered.`,
      );
    }
  }
}
