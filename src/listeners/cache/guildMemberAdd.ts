import { Events, Listener } from "@sapphire/framework";
import { GuildMember } from "discord.js";

import { memberCache } from "../../index.js";

export class CacheGuildMemberAddListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: Events.GuildMemberAdd,
    });
  }

  public async run(member: GuildMember) {
    if (member.user.bot) return;
    if (!memberCache.has(member.guild.id)) return;

    memberCache.get(member.guild.id)?.push(member.id);
  }
}
