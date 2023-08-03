import { ColorResolvable } from "discord.js";

// Comments beside colours are TailwindCSS default colour palette values.
// https://tailwindcss.com/docs/customizing-colors#default-color-palette

export type Colours = {
  primary: ColorResolvable;
  secondary: ColorResolvable;
  success: ColorResolvable;
  error: ColorResolvable;
  warning: ColorResolvable;
  orange: ColorResolvable;
  brown: ColorResolvable;
  green: ColorResolvable;
  cyan: ColorResolvable;
  blue: ColorResolvable;
  violet: ColorResolvable;
  fuchsia: ColorResolvable;
  pink: ColorResolvable;
  darkModeBg: ColorResolvable;
};

const colours: Colours = {
  primary: "#fe2828", // Reindeer Red
  secondary: "#060937", // Reindeer Navy
  success: "#22c55e", // Green 500
  error: "#ef4444", // Red 600
  warning: "#facc15", // Yellow 400
  orange: "#f97316", // Orange 500
  brown: "#78350f", // Amber 900
  green: "#10b981", // Green 500
  cyan: "#22d3ee", // Cyan 400
  blue: "#2563eb", // Blue 600
  violet: "#7c3aed", // Violet 600
  fuchsia: "#d946ef", // Fuchsia 500
  pink: "#db2777", // Pink 600
  darkModeBg: "#2b2d31", // Discord dark mode embed background colour
} as const;

export default colours;
