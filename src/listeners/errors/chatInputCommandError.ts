import { ChatInputCommandErrorPayload, Events, Listener } from "@sapphire/framework";

import { handleCommandError } from "../../functions/handleCommandError.js";

export class ChatInputCommandErrorListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.ChatInputCommandError,
    });
  }
  public async run(error: Error, { interaction }: ChatInputCommandErrorPayload) {
    return await handleCommandError(error, interaction);
  }
}
