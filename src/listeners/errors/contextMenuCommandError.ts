import { ContextMenuCommandErrorPayload, Events, Listener } from "@sapphire/framework";
import Sentry from "@sentry/node";

import { handleCommandError } from "../../functions/handleCommandError.js";

export class ContextMenuCommandErrorListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.ContextMenuCommandError,
    });
  }
  public async run(error: Error, { interaction }: ContextMenuCommandErrorPayload) {
    await handleCommandError(error, interaction);
    Sentry.captureException(error, {
      extra: {
        commandName: interaction.commandName,
        commandSyntax: interaction.toString(),
        userTag: interaction.user.tag,
        userId: interaction.user.id,
      },
    });
  }
}
