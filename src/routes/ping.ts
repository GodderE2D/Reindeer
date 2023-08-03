import { FastifyPluginCallback } from "fastify";

export const Ping: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.get("/api/ping", (req, res) => {
    return res.status(200).send({ success: true });
  });

  done();
};
