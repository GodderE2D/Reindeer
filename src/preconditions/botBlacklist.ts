import { $Enums } from "@prisma/client";
import { AllFlowsPrecondition, Piece } from "@sapphire/framework";
import { ChatInputCommandInteraction, ContextMenuCommandInteraction } from "discord.js";

import { botBlacklistCache } from "../index.js";

export class BotBlacklistPrecondition extends AllFlowsPrecondition {
  public constructor(context: Piece.Context, options: AllFlowsPrecondition.Options) {
    super(context, {
      ...options,
      position: 15,
    });
  }

  private formatReply(type: $Enums.BotBlacklistType) {
    return `${
      type === "Guild" ? "This server is" : "You are"
    } blacklisted from using Reindeer in violation of our [Terms of Service](https://reindeer.bsr.gg/terms). Please open a ticket in our [support server](https://discord.gg/R2FDvcPXTK) if you have any questions.`;
  }

  private async checkForBlacklist(interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction) {
    if (botBlacklistCache.has(interaction.user.id)) {
      await interaction.reply({ content: this.formatReply("User"), ephemeral: true });
      return this.error();
    }

    if (interaction.inGuild() && botBlacklistCache.has(interaction.guildId)) {
      await interaction.reply({ content: this.formatReply("Guild"), ephemeral: true });
      return this.error();
    }

    return this.ok();
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    return await this.checkForBlacklist(interaction);
  }

  public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return await this.checkForBlacklist(interaction);
  }

  public override messageRun() {
    return this.ok();
  }
}
