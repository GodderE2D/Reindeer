import { ActionRowBuilder } from "discord.js";

export function disableComponents<T extends ActionRowBuilder>(row: T) {
  return row.setComponents(
    row.components.map((component) => ("setDisabled" in component ? component.setDisabled() : component)),
  );
}
