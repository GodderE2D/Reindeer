import { Guild } from "@prisma/client";
import { GuildMember, Message, User } from "discord.js";

import { prisma } from "../../index.js";

export async function checkUserPermissions(author: GuildMember, guildData: Guild, target: User, message?: Message) {
  const targetMember = await author.guild.members.fetch(target.id).catch(() => undefined);

  if (target.bot) {
    return "You cannot report bots.";
  }

  if (target.id === author.id) {
    return "You cannot report yourself.";
  }

  if (targetMember?.roles.cache.some((role) => guildData.disallowedTargetRoles.includes(role.id))) {
    return "You cannot report this user.";
  }

  if (author.roles.cache.some((role) => guildData.reportCooldownBypassRoles.includes(role.id))) return true;

  const duplicateReport = await prisma.report.findFirst({
    where: {
      guildId: author.guild.id,
      createdAt: { gte: new Date(Date.now() - guildData.duplicateReportCooldown * 1000) },
      OR: [{ messageId: message?.id }, { targetId: target.id }],
    },
    take: 1,
  });

  if (duplicateReport) {
    return `This ${message ? "message" : "user"} has already been reported recently.`;
  }

  const recentReport = await prisma.report.findFirst({
    where: {
      guildId: author.guild.id,
      createdAt: { gte: new Date(Date.now() - guildData.reportCooldown * 1000) },
      authorId: author.id,
    },
  });

  if (recentReport) {
    return "You are reporting in this server too quickly.";
  }

  return true;
}
