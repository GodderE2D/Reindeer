import { FastifyPluginCallback } from "fastify";
import { z } from "zod";

import { env, prisma } from "../index.js";

export const vote: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.post("/api/vote", async (req, res) => {
    if (req.headers.authorization !== env.API_KEY) {
      return res.status(401).send({ success: false, error: "UNAUTHORISED" });
    }

    const schema = z.object({
      bot: z.string(),
      user: z.string(),
      type: z.enum(["upvote", "test"]),
      isWeekend: z.boolean().optional(),
      query: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).send({ success: false, error: parsed.error });
    }

    await prisma.vote.create({ data: { userId: parsed.data.user } });
    return res.status(200).send({ success: true });
  });

  done();
};
