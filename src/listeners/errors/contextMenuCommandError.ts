import { ContextMenuCommandErrorPayload, Events, Listener } from "@sapphire/framework";

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
    return await handleCommandError(error, interaction);
  }
}
