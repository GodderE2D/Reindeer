import { ChatInputCommand } from "@sapphire/framework";
import { Subcommand } from "@sapphire/plugin-subcommands";

import { parseMessageLink } from "../../functions/parseMessageLink.js";
import { handleTracking } from "../../functions/tracking/handleTrack.js";

export class TrackChatInputCommand extends Subcommand {
  public constructor(context: Subcommand.Context, options: Subcommand.Options) {
    super(context, {
      ...options,
      name: "track",
      description: "Track a message or user relating to a report.",
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
          .setDefaultMemberPermissions("0")
          .addSubcommand((command) =>
            command
              .setName("message")
              .setDescription("Track a message relating to a report.")
              .addStringOption((option) =>
                option
                  .setName("message_link")
                  .setDescription(
                    "The message link for the message you want to track (right-click > Copy Message Link)",
                  )
                  .setRequired(true),
              )
              .addIntegerOption((option) =>
                option
                  .setName("report_number")
                  .setDescription("The report number you want to link this message to")
                  .setRequired(true),
              )
              .addBooleanOption((option) =>
                option
                  .setName("track_author")
                  .setDescription("Whether to track the author of the message as well (default: false)"),
              ),
          )
          .addSubcommand((command) =>
            command
              .setName("user")
              .setDescription("Track a user relating to a report.")
              .addUserOption((option) =>
                option.setName("user").setDescription("The user you want to track").setRequired(true),
              )
              .addIntegerOption((option) =>
                option
                  .setName("report_number")
                  .setDescription("The report number you want to link this user to")
                  .setRequired(true),
              ),
          ),
      {
        idHints: [],
      },
    );
  }

  public async chatInputMessage(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const messageLink = interaction.options.getString("message_link", true);
    const number = interaction.options.getInteger("report_number", true);
    const trackAuthor = interaction.options.getBoolean("track_author") ?? false;

    const message = await parseMessageLink(messageLink, interaction.client, interaction.guild).catch((errorMessage) => {
      interaction.reply({ content: errorMessage, ephemeral: true });
    });

    if (!message) return;

    return await handleTracking(interaction, number, message.author, trackAuthor, message);
  }

  public async chatInputUser(interaction: Subcommand.ChatInputCommandInteraction<"cached">) {
    const target = interaction.options.getUser("user", true);
    const number = interaction.options.getInteger("report_number", true);

    return await handleTracking(interaction, number, target, false);
  }
}
