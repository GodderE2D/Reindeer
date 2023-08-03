import { ChatInputCommand } from "@sapphire/framework";
import { Subcommand } from "@sapphire/plugin-subcommands";

import { parseMessageLink } from "../../../functions/parseMessageLink.js";
import { handleReport } from "../../../functions/report/handleReport.js";

export class ReportChatInputCommand extends Subcommand {
  public constructor(context: Subcommand.Context, options: Subcommand.Options) {
    super(context, {
      ...options,
      name: "report",
      description: "Report a user or message to the server moderators.",
      subcommands: [
        { name: "message", chatInputRun: "chatInputMessage" },
        { name: "user", chatInputRun: "chatInputUser" },
      ],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName(this.name)
          .setDescription(this.description)
          .setDMPermission(false)
          .addSubcommand((command) =>
            command
              .setName("message")
              .setDescription("Report a message to the server moderators.")
              .addStringOption((option) =>
                option
                  .setName("message_link")
                  .setDescription(
                    "The message link for the message you want to report (right-click > Copy Message Link)",
                  )
                  .setRequired(true),
              ),
          )
          .addSubcommand((command) =>
            command
              .setName("user")
              .setDescription("Report a user to the server moderators.")
              .addUserOption((option) =>
                option.setName("user").setDescription("The user you want to report").setRequired(true),
              ),
          ),
      {
        idHints: [],
      },
    );
  }

  public async chatInputMessage(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const messageLink = interaction.options.getString("message_link", true);

    const message = await parseMessageLink(messageLink, interaction.client, interaction.guild).catch((errorMessage) => {
      interaction.reply({ content: errorMessage, ephemeral: true });
    });

    if (!message) return;

    const target = message.author;
    const author = interaction.member;

    return await handleReport(author, target, interaction, message);
  }

  public async chatInputUser(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const target = interaction.options.getUser("user", true);
    const author = interaction.member;

    return await handleReport(author, target, interaction);
  }
}
