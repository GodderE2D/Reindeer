import { ChatInputCommand, Command } from "@sapphire/framework";
import { ApplicationCommandType, MessageContextMenuCommandInteraction } from "discord.js";

import { handleReport } from "../../../functions/report/handleReport.js";

export class ReportMessageContextMenuCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "Report message",
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerContextMenuCommand(
      (builder) =>
        builder //
          .setName("Report message")
          .setType(ApplicationCommandType.Message)
          .setDMPermission(false),
      {
        idHints: [],
      },
    );
  }

  public override async contextMenuRun(interaction: MessageContextMenuCommandInteraction<"cached">) {
    let message = interaction.targetMessage;
    if (message.partial) message = await message.fetch();

    const target = message.author;
    const author = interaction.member;

    return await handleReport(author, target, interaction, message);
  }
}
