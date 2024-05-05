import { ChatInputCommand, Command } from "@sapphire/framework";
import {
  ApplicationCommandType,
  MessageApplicationCommandData,
  MessageContextMenuCommandInteraction,
} from "discord.js";

import { handleReport } from "../../../functions/report/handleReport.js";

export class ReportDMMessageContextMenuCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "Report DM message",
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerContextMenuCommand(
      {
        name: "Report DM message",
        type: ApplicationCommandType.Message,
        // @ts-expect-error missing typings
        integration_types: [1],
        contexts: [2], // only show in PRIVATE_CHANNELs (DMs and GDMs)
      } satisfies MessageApplicationCommandData,
      {
        idHints: [],
      },
    );
  }

  public override async contextMenuRun(interaction: MessageContextMenuCommandInteraction<"cached">) {
    // console.log(interaction.command);
    // console.log(interaction);
    // console.log(interaction.targetMessage);
    // return;

    let message = interaction.targetMessage;
    if (message.partial) message = await message.fetch();

    const target = message.author;
    const author = interaction.user;

    return await handleReport(author, target, interaction, message, true);
  }
}
