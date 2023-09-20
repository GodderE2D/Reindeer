import { prisma } from "../index.js";

export async function fetchBotBlacklist(cache: Set<string>) {
  for (const entry of await prisma.botBlacklist.findMany()) {
    cache.clear();
    cache.add(entry.id);
  }
}
