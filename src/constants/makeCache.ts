import { Options } from "discord.js";

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
  GuildMemberManager: {
    maxSize: 20,
    keepOverLimit: (member) => member.id === member.client.user.id,
  },
});
