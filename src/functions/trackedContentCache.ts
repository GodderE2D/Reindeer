import { Snowflake } from "discord.js";

import { prisma } from "../index.js";

export async function fetchTrackedContent(userCache: Set<Snowflake>, messageCache: Set<Snowflake>) {
  const trackedContent = await prisma.trackedContent.findMany({ select: { type: true, contentId: true } });

  userCache.clear();
  messageCache.clear();

  for (const { type, contentId } of trackedContent) {
    switch (type) {
      case "User":
        userCache.add(contentId);
        break;
      case "Message":
        messageCache.add(contentId);
        break;
    }
  }
}
