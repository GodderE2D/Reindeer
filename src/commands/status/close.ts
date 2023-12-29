import { ChatInputCommand, Command } from "@sapphire/framework";

import { setReportStatus } from "../../functions/setReportStatus.js";

export class CloseChatInputCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "close",
      description: "Close a report.",
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
          .addStringOption((option) =>
            option
              .setName("status")
              .setDescription("Whether the report should be approved or rejected")
              .setChoices({ name: "Approve", value: "Approved" }, { name: "Reject", value: "Rejected" })
              .setRequired(true),
          )
          .addIntegerOption((option) =>
            option.setName("report_number").setDescription("The report number to close").setRequired(true),
          ),
      {
        idHints: [],
      },
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction<"cached">) {
    const number = interaction.options.getInteger("report_number", true);
    const status = interaction.options.getString("status", true) as "Approved" | "Rejected";

    await interaction.deferReply({ ephemeral: true });
    const result = await setReportStatus(status, number, interaction);

    if (result) {
      await interaction.editReply(`Report #${number} has been closed and its associated trackers have been deleted.`);
    }
  }
}
