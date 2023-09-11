import prometheus from "prom-client";

import { client, commandsRan, prisma } from "../index.js";

// For some very strange reason, this errors:
// malloc(): unaligned fastbin chunk detected
// and prisma is related to it, so we are caching it

let reportCount = 0;
let messageReportCount = 0;
let userReportCount = 0;
let registeredGuildCount = 0;
let registeredMemberCount = 0;
let trackerCount = 0;
let messageTrackerCount = 0;
let userTrackerCount = 0;
let voteCount = 0;
let monthlyVoteCount = 0;

export async function cacheStats() {
  reportCount = await prisma.report.count();
  messageReportCount = await prisma.report.count({ where: { type: "Message" } });
  userReportCount = await prisma.report.count({ where: { type: "User" } });
  registeredGuildCount = await prisma.guild.count();
  registeredMemberCount = await prisma.guildMember.count();
  trackerCount = await prisma.trackedContent.count();
  messageTrackerCount = await prisma.trackedContent.count({ where: { type: "Message" } });
  userTrackerCount = await prisma.trackedContent.count({ where: { type: "User" } });
  voteCount = await prisma.vote.count();
  monthlyVoteCount = await prisma.vote.count({
    where: { createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) } },
  });
}

export function registerMetrics() {
  prometheus.collectDefaultMetrics({ prefix: "reindeer_" });

  const metrics = [
    new prometheus.Gauge({
      name: "reindeer_ws_ping",
      help: "The websocket ping of the bot.",
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
    new prometheus.Gauge({
      name: "reindeer_daily_command_count",
      help: "The total number of commands ran in the past 24 hours.",
      async collect() {
        this.set(commandsRan.filter(({ createdAt }) => createdAt.getTime() > Date.now() - 86_400_000).size);
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_cached_messages_count",
      help: "The total number of messages the bot has cached.",
      async collect() {
        this.set(
          client.channels.cache.reduce(
            (acc, channel) => acc + ("messages" in channel ? channel.messages.cache.size : 0),
            0,
          ),
        );
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_cached_users_count",
      help: "The total number of users the bot has cached.",
      async collect() {
        this.set(client.users.cache.size);
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_cached_members_count",
      help: "The total number of members the bot has cached.",
      async collect() {
        this.set(client.guilds.cache.reduce((acc, guild) => acc + guild.members.cache.size, 0));
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_report_count",
      help: "The total number of reports.",
      async collect() {
        this.set(reportCount);
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_message_report_count",
      help: "The total number of message reports.",
      async collect() {
        this.set(messageReportCount);
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_user_report_count",
      help: "The total number of user reports.",
      async collect() {
        this.set(userReportCount);
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_registered_guild_count",
      help: "The total number of registered guilds.",
      async collect() {
        this.set(registeredGuildCount);
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_registered_member_count",
      help: "The total number of registered guild members.",
      async collect() {
        this.set(registeredMemberCount);
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_tracker_count",
      help: "The total number of trackers.",
      async collect() {
        this.set(trackerCount);
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_message_tracker_count",
      help: "The total number of message trackers.",
      async collect() {
        this.set(messageTrackerCount);
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_user_tracker_count",
      help: "The total number of user trackers.",
      async collect() {
        this.set(userTrackerCount);
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_votes_count",
      help: "The total number of Top.gg votes.",
      async collect() {
        this.set(voteCount);
      },
    }),
    new prometheus.Gauge({
      name: "reindeer_monthly_votes_count",
      help: "The monthly count of Top.gg votes.",
      async collect() {
        this.set(monthlyVoteCount);
      },
    }),
  ];

  for (const metric of metrics) prometheus.register.registerMetric(metric);
}
