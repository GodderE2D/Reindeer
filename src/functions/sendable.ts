import { Channel, ChannelType, PermissionsBitField } from "discord.js";

export default function sendable(channel: Channel) {
  if (!channel.isTextBased()) return false;
  if (channel.type === ChannelType.DM) return true;

  const { me } = channel.guild.members;
  if (!me) throw new Error("channel.guild.members.me is null.");

  return channel
    .permissionsFor(me)
    .has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]);
}
