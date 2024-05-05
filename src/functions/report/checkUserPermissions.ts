import type { Guild as PrismaGuild } from "@prisma/client";
import { Guild, Message, User } from "discord.js";

import { prisma } from "../../index.js";

export async function checkUserPermissions(
  author: User,
  guild: Guild,
  guildData: PrismaGuild,
  target: User,
  message?: Message,
) {
  const authorMember = await guild.members.fetch(author.id).catch(() => undefined);
  const targetMember = await guild.members.fetch(target.id).catch(() => undefined);

  if (target.bot) {
    return "You cannot report bots.";
  }

  if (target.id === author.id) {
    return "You cannot report yourself.";
  }

  if (targetMember?.roles.cache.some((role) => guildData.disallowedTargetRoles.includes(role.id))) {
    return "You cannot report this user.";
  }

  if (authorMember?.roles.cache.some((role) => guildData.reportCooldownBypassRoles.includes(role.id))) return true;

  const duplicateReport = await prisma.report.findFirst({
    where: {
      guildId: guild.id,
      createdAt: { gte: new Date(Date.now() - guildData.duplicateReportCooldown * 1000) },
      OR: [{ messageId: message?.id }, { targetId: target.id }],
    },
  });

  if (duplicateReport) {
    return `This ${message ? "message" : "user"} has already been reported recently.`;
  }

  const recentReport = await prisma.report.findFirst({
    where: {
      guildId: guild.id,
      createdAt: { gte: new Date(Date.now() - guildData.reportCooldown * 1000) },
      authorId: author.id,
    },
  });

  if (recentReport) {
    return "You are reporting in this server too quickly.";
  }

  return true;
}
