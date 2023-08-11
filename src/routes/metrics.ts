import { FastifyPluginCallback } from "fastify";
import { register } from "prom-client";

export const Metrics: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.get("/metrics", async (req, res) => {
    try {
      return res
        .status(200)
        .headers({ "Content-Type": register.contentType })
        .send(await register.metrics());
    } catch (error) {
      return res.status(500).send(error);
    }
  });

  done();
};
