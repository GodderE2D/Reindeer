import { Events, Listener, ListenerErrorPayload } from "@sapphire/framework";
import Sentry from "@sentry/node";

export class ContextMenuCommandErrorListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.ListenerError,
    });
  }
  public async run(error: Error, { piece }: ListenerErrorPayload) {
    Sentry.captureException(error, { extra: { listenerName: piece.name } });
  }
}
