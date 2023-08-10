import { FastifyPluginCallback } from "fastify";

import { env } from "../index.js";

export const authorised: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.get("/api/authorised", (req, res) => {
    if (req.headers.authorization !== env.API_KEY) {
      return res.status(401).send({ success: false, error: "UNAUTHORISED" });
    }

    return res.status(200).send({ success: true, authorised: true });
  });

  done();
};
