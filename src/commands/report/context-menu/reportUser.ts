import { ChatInputCommand, Command } from "@sapphire/framework";
import { ApplicationCommandType, UserContextMenuCommandInteraction } from "discord.js";

import { handleReport } from "../../../functions/report/handleReport.js";

export class ReportUserContextMenuCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "Report user",
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerContextMenuCommand(
      (builder) =>
        builder //
          .setName("Report user")
          .setType(ApplicationCommandType.User)
          .setDMPermission(false),
      {
        idHints: ["1134447489769025606"],
      },
    );
  }

  public override async contextMenuRun(interaction: UserContextMenuCommandInteraction<"cached">) {
    const target = interaction.targetUser;
    const author = interaction.member;

    return await handleReport(author, target, interaction);
  }
}
