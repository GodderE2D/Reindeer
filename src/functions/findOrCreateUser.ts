import { prisma } from "../index.js";

export async function findOrCreateUser(userId: string) {
  return await prisma.user.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}
