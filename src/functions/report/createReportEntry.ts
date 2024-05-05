import { Prisma } from "@prisma/client";
import { Message, ModalSubmitInteraction, Snowflake, ThreadChannel, User } from "discord.js";

import { prisma } from "../../index.js";

export async function createReportEntry(
  number: number,
  guildId: Snowflake,
  forumPost: ThreadChannel,
  firstMessageId: Snowflake,
  author: User,
  target: User,
  modalResponse: ModalSubmitInteraction,
  message?: Message,
) {
  const trackedContent: Prisma.TrackedContentCreateManyReportInput[] = [
    {
      contentId: target.id,
      type: "User",
      guildId,
    },
  ];

  if (message?.channel) {
    trackedContent.push({
      contentId: message.id,
      channelId: message.channel.id,
      type: "Message",
      guildId,
    });
  }

  return await prisma.report.create({
    data: {
      number,
      type: message ? "Message" : "User",
      threadId: forumPost.id,
      startMessageId: firstMessageId,
      messageId: message?.id,
      channelId: message?.channel?.id,
      fieldValues: modalResponse.fields.fields.map((f) => f.value),
      trackedContent: { createMany: { data: trackedContent } },
      guild: { connect: { guildId } },
      author: {
        connectOrCreate: { where: { userId: author.id }, create: { userId: author.id, guildId } },
      },
      target: {
        connectOrCreate: { where: { userId: target.id }, create: { userId: target.id, guildId } },
      },
    },
  });
}
