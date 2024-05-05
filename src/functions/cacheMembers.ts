import { Guild } from "discord.js";

import { memberCache } from "../index.js";

export async function cacheMembers(guild: Guild) {
  if (memberCache.has(guild.id)) return;

  const members = (await guild.members.fetch()).filter((m) => !m.user.bot).map((m) => m.id);
  memberCache.set(guild.id, members);

  return members.length;
}
