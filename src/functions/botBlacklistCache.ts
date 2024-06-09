import { prisma } from "../index.js";

export async function fetchBotBlacklist(cache: Set<string>) {
  cache.clear();
  for (const entry of await prisma.botBlacklist.findMany()) {
    cache.add(entry.id);
  }
}
