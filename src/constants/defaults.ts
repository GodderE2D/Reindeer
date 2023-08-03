// i18n? What's that?
// This file isn't actually being used anywhere right now

import { TextInputStyle } from "discord.js";

export const FIELD_NAMES = ["Reason"];
export const FIELD_PLACEHOLDERS = [""];
export const FIELD_VALUES = [""];
export const FIELD_STYLES = [TextInputStyle.Paragraph];
export const FIELD_OPTIONALS = [false];
export const FIELD_MINS = [1];
export const FIELD_MAXES = [500];

export const DISALLOWED_AUTHOR_ROLES = [];
export const DISALLOWED_TARGET_ROLES = [];
export const DISALLOWED_REPORT_CHANNELS = [];

export const MESSAGE_REPORT_CONFIRM_MESSAGE = [
  "Are you sure you want to report [this message]({{message}}) to the server moderators?",
  "**Reason**:",
  ">>> {{field1}}",
].join("\n");
export const USER_REPORT_CONFIRM_MESSAGE = [
  "Are you sure you want to report {{user}} to the server moderators?",
  "**Reason**:",
  ">>> {{field1}}",
].join("\n");

export const REPORT_COOLDOWN = 0;
export const DUPLICATE_REPORT_COOLDOWN = 0;
export const REPORT_COOLDOWN_BYPASS_ROLES = [];
