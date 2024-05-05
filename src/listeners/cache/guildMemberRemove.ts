import { Events, Listener } from "@sapphire/framework";
import { GuildMember } from "discord.js";

import { memberCache } from "../../index.js";

export class CacheGuildMemberRemoveListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.GuildMemberRemove,
    });
  }

  public async run(member: GuildMember) {
    if (member.user.bot) return;
    if (!memberCache.has(member.guild.id)) return;

    memberCache.set(
      member.guild.id,
      memberCache.get(member.guild.id)!.filter((id) => id !== member.id),
    );
  }
}
