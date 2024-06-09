import { Options, SweeperOptions } from "discord.js";

import { trackedMessagesCache, trackedUsersCache } from "../index.js";

export const makeCache = Options.cacheWithLimits({
  ...Options.DefaultMakeCacheSettings,
  AutoModerationRuleManager: 0,
  BaseGuildEmojiManager: 0,
  GuildBanManager: 0,
  GuildEmojiManager: 0,
  GuildInviteManager: 0,
  GuildScheduledEventManager: 0,
  GuildStickerManager: 0,
  PresenceManager: 0,
  ReactionManager: 0,
  ReactionUserManager: 0,
  StageInstanceManager: 0,
  VoiceStateManager: 0,
  MessageManager: {
    maxSize: 0,
    keepOverLimit: (message) => message.author?.id === message.client.user.id || trackedMessagesCache.has(message.id),
  },
  UserManager: {
    maxSize: 0,
    keepOverLimit: (user) => user.id === user.client.user.id || trackedUsersCache.has(user.id),
  },
  GuildMemberManager: {
    maxSize: 0,
    keepOverLimit: (member) => member.id === member.client.user.id || trackedUsersCache.has(member.id),
  },
});

export const sweepers: SweeperOptions = {
  ...Options.DefaultSweeperSettings,
  messages: {
    interval: 3_600,
    // Sweep non-tracked messages older than 30 minutes (probably authored by the bot)
    filter: () => (message) => Date.now() - message.createdTimestamp > 1.8e6 && !trackedMessagesCache.has(message.id),
  },
};
