import prometheus from "prom-client";

import { client, prisma } from "../index.js";

// For some very strange reason, this errors:
// malloc(): unaligned fastbin chunk detected
// whenever there's more than 9 metrics below.

export default function registerMetrics() {
  prometheus.collectDefaultMetrics({ prefix: "reindeer_" });

  const metrics = [
    new prometheus.Gauge({
      name: "reindeer_ws_ping",
      help: "The webscoket ping of the bot.",
      async collect() {
        this.set(client.ws.ping);
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_guild_count",
      help: "The number of guilds the bot is in.",
      async collect() {
        this.set(client.guilds.cache.size);
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_member_count",
      help: "The total members in all guilds the bot is in.",
      async collect() {
        this.set(client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0));
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_channel_count",
      help: "The total number of channels in all guilds the bot is in.",
      async collect() {
        this.set(client.channels.cache.size);
      },
    }),
    // new prometheus.Gauge({
    //   name: "reindeer_cached_messages_count",
    //   help: "The total number of messages the bot has cached.",
    //   async collect() {
    //     this.set(
    //       client.channels.cache.reduce(
    //         (acc, channel) => acc + ("messages" in channel ? channel.messages.cache.size : 0),
    //         0,
    //       ),
    //     );
    //   },
    // }),
    // new prometheus.Gauge({
    //   name: "reindeer_cached_users_count",
    //   help: "The total number of users the bot has cached.",
    //   async collect() {
    //     this.set(client.users.cache.size);
    //   },
    // }),
    // new prometheus.Gauge({
    //   name: "reindeer_cached_members_count",
    //   help: "The total number of members the bot has cached.",
    //   async collect() {
    //     this.set(client.guilds.cache.reduce((acc, guild) => acc + guild.members.cache.size, 0));
    //   },
    // }),
    new prometheus.Gauge({
      name: "reindeer_report_count",
      help: "The total number of reports.",
      async collect() {
        this.set(await prisma.report.count());
      },
    }),
    // new prometheus.Gauge({
    //   name: "reindeer_message_report_count",
    //   help: "The total number of message reports.",
    //   async collect() {
    //     this.set(await prisma.report.count({ where: { type: "Message" } }));
    //   },
    // }),
    // new prometheus.Gauge({
    //   name: "reindeer_user_report_count",
    //   help: "The total number of user reports.",
    //   async collect() {
    //     this.set(await prisma.report.count({ where: { type: "User" } }));
    //   },
    // }),
    new prometheus.Gauge({
      name: "reindeer_registered_guild_count",
      help: "The total number of registered guilds.",
      async collect() {
        this.set(await prisma.guild.count());
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_registered_member_count",
      help: "The total number of registered guild members.",
      async collect() {
        this.set(await prisma.guildMember.count());
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_tracker_count",
      help: "The total number of trackers.",
      async collect() {
        this.set(await prisma.trackedContent.count());
      },
    }),
    // new prometheus.Gauge({
    //   name: "reindeer_message_tracker_count",
    //   help: "The total number of message trackers.",
    //   async collect() {
    //     this.set(await prisma.trackedContent.count({ where: { type: "Message" } }));
    //   },
    // }),
    // new prometheus.Gauge({
    //   name: "reindeer_user_tracker_count",
    //   help: "The total number of user trackers.",
    //   async collect() {
    //     this.set(await prisma.trackedContent.count({ where: { type: "User" } }));
    //   },
    // }),
    new prometheus.Gauge({
      name: "reindeer_votes_count",
      help: "The total number of Top.gg votes.",
      async collect() {
        this.set(await prisma.vote.count());
      },
    }),
    // new prometheus.Gauge({
    //   name: "reindeer_monthly_votes_count",
    //   help: "The monthly count of Top.gg votes.",
    //   async collect() {
    //     this.set(
    //       await prisma.vote.count({
    //         where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
    //       }),
    //     );
    //   },
    // }),
  ];

  for (const metric of metrics) prometheus.register.registerMetric(metric);
}
