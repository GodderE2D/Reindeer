import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  ModalBuilder,
  SelectMenuComponentOptionData,
  Snowflake,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import colours from "../../constants/colours.js";

export type Field = {
  name: string;
  placeholder: string | null;
  style: 1 | 2; // 1: Short, 2: Paragraph
  min: number;
  max: number;
};

const DEFAULT_FIELDS: Field[] = [{ name: "Reason for the report", placeholder: null, style: 2, min: 1, max: 1024 }];

function formatFields(fields: Field[]) {
  return fields.map((field, index) => ({
    name: `#${index + 1}: ${field.name}`,
    value: [
      field.placeholder ? `**Placeholder**: ${field.placeholder}` : null,
      `**Style**: ${field.style === 1 ? "Short" : "Paragraph"}`,
      `**Min Length**: ${field.min || "This field is optional"}`,
      `**Max Length**: ${field.max}`,
    ]
      .filter(Boolean)
      .join("\n"),
  }));
}

export async function setFields(
  message: Message<true>,
  userId: Snowflake,
  fields = DEFAULT_FIELDS.slice(),
): Promise<Field[]> {
  function createMenuRow(fields: Field[], editOrDelete: "edit" | "delete") {
    const options: SelectMenuComponentOptionData[] = [
      ...fields.map((field, index) => ({
        label: `Field #${index + 1}`,
        description: field.name,
        value: `${index}`,
      })),
    ];

    if (editOrDelete === "edit" && fields.length < 5) {
      options.push({ label: "Add a new field", emoji: "↪️", value: "-1" });
    }

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`setup_fields_${editOrDelete}_menu:${message.id}`)
        .setPlaceholder(`Select a field to ${editOrDelete}`)
        .setOptions(options),
    );
  }

  const embed = new EmbedBuilder()
    .setColor(colours.primary)
    .setAuthor({
      name: "Reindeer Setup",
      iconURL: "https://cdn.discordapp.com/avatars/1126157327746211840/0cdcb588f96ec9cfc5d4f9685c8987f4.webp",
    })
    .setTitle("Configure your report fields")
    .setDescription(
      "Reindeer will present these fields to the user when they create a report. You can configure up to five (5) fields. Below is a preview of your chosen fields.",
    )
    .setFields(formatFields(fields));

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup_fields_continue:${message.id}`)
      .setLabel("Continue")
      .setStyle(ButtonStyle.Primary),
  );

  await message.edit({
    content: "",
    embeds: [embed],
    components: [createMenuRow(fields, "edit"), createMenuRow(fields, "delete"), buttonRow],
  });

  const collector = message.createMessageComponentCollector({
    filter: (i) => i.user.id === userId,
    time: 890_000,
  });

  collector.on("end", async () => {
    if (collector.endReason !== "time") return;
    await message
      .edit({
        content: "You took too long to respond.",
        embeds: [],
        components: [],
      })
      .catch(() => undefined);
  });

  return new Promise((resolve) => {
    collector.on("collect", async (componentInteraction) => {
      if (componentInteraction.isStringSelectMenu()) {
        if (componentInteraction.customId.startsWith("setup_fields_delete")) {
          fields = fields.filter((_, index) => index !== parseInt(componentInteraction.values[0]));

          componentInteraction.reply({ content: "Field deleted.", ephemeral: true });
          return void (await message.edit({
            embeds: [
              embed
                .setFields(formatFields(fields))
                .setFooter(!fields.length ? { text: "You need at least one field to continue." } : null),
            ],
            components: [
              createMenuRow(fields, "edit"),
              ...(fields.length ? [createMenuRow(fields, "delete"), buttonRow] : []),
            ],
          }));
        }

        const field = fields[parseInt(componentInteraction.values[0])];

        const modal = new ModalBuilder()
          .setCustomId(`setup_modal_edit_field:${componentInteraction.id}`)
          .setTitle(field ? `Edit field ${fields.indexOf(field) + 1}` : "Add new field")
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId(`setup_field_name`)
                .setLabel("Label")
                .setValue(field?.name ?? "")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(45),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId(`setup_field_placeholder`)
                .setLabel("Placeholder")
                .setValue(field?.placeholder ?? "")
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(100)
                .setRequired(false),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId(`setup_field_style`)
                .setLabel("Style")
                .setValue(field ? (field.style === 1 ? "short" : "paragraph") : "")
                .setPlaceholder("'short' or 'paragraph'")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(9),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId(`setup_field_min`)
                .setLabel("Minimum length")
                .setValue(field ? `${field.min}` : "1")
                .setPlaceholder("A number (max. 1024, 0 for optional, 1+ for required)")
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(4),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId(`setup_field_max`)
                .setLabel("Maximum length")
                .setValue(field ? `${field.max}` : "1024")
                .setPlaceholder("A number (min. 1, max. 1024)")
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(4),
            ),
          );

        await componentInteraction.showModal(modal);

        const modalInteraction = await componentInteraction
          .awaitModalSubmit({ filter: (i) => i.customId.endsWith(componentInteraction.id), time: 300_000 })
          .catch(
            async () =>
              void (await componentInteraction.followUp({ content: "You took too long to respond.", ephemeral: true })),
          );

        if (!modalInteraction?.isModalSubmit()) return;
        if (modalInteraction.replied) return;

        if (!["short", "paragraph"].includes(modalInteraction.fields.getTextInputValue("setup_field_style"))) {
          return void modalInteraction.reply({
            content: "The style must be either 'short' or 'paragraph'.",
            ephemeral: true,
          });
        }

        const min = parseInt(modalInteraction.fields.getTextInputValue("setup_field_min"));
        if (min < 0 || min > 1024) {
          return void modalInteraction.reply({
            content:
              "The minimum length must be (or between) 0 and 1024. Enter 0 if you want the field to be optional.",
            ephemeral: true,
          });
        }

        const max = parseInt(modalInteraction.fields.getTextInputValue("setup_field_max"));
        if (max < 1 || max > 1024) {
          return void modalInteraction.reply({
            content: "The maximum length must be (or between) 1 and 1024.",
            ephemeral: true,
          });
        }

        const newData = {
          name: modalInteraction.fields.getTextInputValue("setup_field_name"),
          placeholder: modalInteraction.fields.getTextInputValue("setup_field_placeholder"),
          style: (modalInteraction.fields.getTextInputValue("setup_field_style") === "short" ? 1 : 2) as 1 | 2,
          min,
          max,
        };

        if (componentInteraction.values[0] === "-1") {
          fields.push(newData);
        } else {
          fields[parseInt(componentInteraction.values[0])] = newData;
        }

        modalInteraction.reply({ content: "Field updated.", ephemeral: true });
        await message.edit({
          embeds: [embed.setFields(formatFields(fields))],
          components: [createMenuRow(fields, "edit"), createMenuRow(fields, "delete"), buttonRow],
        });
      } else if (componentInteraction.isButton()) {
        await componentInteraction.deferUpdate();
        collector.stop();
        return resolve(fields);
      }
    });
  });
}
