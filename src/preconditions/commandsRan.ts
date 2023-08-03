import { AllFlowsPrecondition, Piece } from "@sapphire/framework";
import { ChatInputCommandInteraction, ContextMenuCommandInteraction } from "discord.js";

import { commandsRan } from "../index.js";

export class CommandsRanPrecondition extends AllFlowsPrecondition {
  public constructor(context: Piece.Context, options: AllFlowsPrecondition.Options) {
    super(context, {
      ...options,
      position: 20,
    });
  }

  private addCommand(interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction) {
    commandsRan.set(interaction.id, { createdAt: new Date(), name: interaction.commandName });

    return this.ok();
  }

  public override chatInputRun(interaction: ChatInputCommandInteraction) {
    return this.addCommand(interaction);
  }

  public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return this.addCommand(interaction);
  }

  public override messageRun() {
    return this.ok();
  }
}
