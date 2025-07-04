import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ApplicationIntegrationType,
  InteractionContextType,
  ButtonInteraction,
  StringSelectMenuInteraction,
} from "discord.js";
import Query, { IQuery } from "../../models/Query";
import searchCommand from "./search";
import {
  MercariItemConditionId,
  MercariSearchOrder,
  MercariSearchSort,
} from "../../mercari/types";
import logger from "../../utils/logger";

function buildQueryEmbedAndSelectRow(
  queries: IQuery[],
  selectedQueryId: string,
  interaction: ChatInputCommandInteraction,
  embedTitle = "Your Saved Queries"
) {
  if (queries.length === 0) {
    throw new Error("No queries found for the user.");
  }
  const embed = new EmbedBuilder()
    .setTitle(embedTitle)
    .setColor(0x0099ff)
    .setDescription(
      "Select a query and use the buttons below to manage your queries."
    );

  // Only show basic query info if no query is selected
  if (!selectedQueryId) {
    queries.forEach((query: IQuery) => {
      const { keyword, excludeKeyword, priceMin, priceMax } =
        query.searchParams;
      let fieldValue = `Keyword: ${keyword}`;
      if (excludeKeyword) fieldValue += `\nExclude: ${excludeKeyword}`;
      if (priceMin) fieldValue += `\nMin Price: ${priceMin}¥`;
      if (priceMax) fieldValue += `\nMax Price: ${priceMax}¥`;
      if(query.lastRun) {
        fieldValue += `\nLast Run: <t:${Math.floor(query.lastRun.getTime()/1000)}:R>`;
      }
      fieldValue += `\nTracked: ${query.isTracked ? "✅" : "❌"}`;
      embed.addFields({ name: query.name, value: fieldValue });
    });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_query:${interaction.id}`)
    .setPlaceholder("Select a query")
    .addOptions(
      queries.map((query) => {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(query.name)
          .setValue(query._id.toString()) // Use unique _id as value
          .setDescription(
            `Keyword: ${
              query.searchParams.keyword?.substring(0, 90) || "No keyword"
            }`
          );
        if (query._id.toString() === selectedQueryId) {
          option.setDefault(true);
        }
        return option;
      })
    );
  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  return { embed, selectRow };
}

async function handleSelectQuery(
  interaction: ChatInputCommandInteraction,
  queries: IQuery[],
  buttonRow: ActionRowBuilder<ButtonBuilder>,
  selectedQueryId: string
) {
  const query = queries.find((q) => q._id.toString() === selectedQueryId);
  if (query) {
    // Create a detailed view of the selected query's search parameters
    const { embed, selectRow } = buildQueryEmbedAndSelectRow(
      queries,
      selectedQueryId,
      interaction,
      `Selected Query: ${query.name}`
    );

    // Add a field showing all search parameters
    const params = query.searchParams;
    let paramsText = "";

    if (params.keyword) paramsText += `**Keyword:** \`${params.keyword}\`\n`;
    if (params.excludeKeyword)
      paramsText += `**Exclude:** \`${params.excludeKeyword}\`\n`;
    if (params.priceMin) paramsText += `**Min Price:** ${params.priceMin}¥\n`;
    if (params.priceMax) paramsText += `**Max Price:** ${params.priceMax}¥\n`;
    if (params.sort) paramsText += `**Sort:** ${params.sort}\n`;
    if (params.order) paramsText += `**Order:** ${params.order}\n`;
    if (params.itemConditionId && params.itemConditionId.length > 0) {
      const conditionNames = params.itemConditionId.map((id) => {
        switch (id) {
          case MercariItemConditionId.NEW:
            return "New";
          case MercariItemConditionId.ALMOSTNEW:
            return "Almost New";
          case MercariItemConditionId.NOSCRATCHES:
            return "No Scratches";
          case MercariItemConditionId.SMALLSCRATCHES:
            return "Small Scratches";
          case MercariItemConditionId.SCRATCHED:
            return "Scratched";
          case MercariItemConditionId.BAD:
            return "Bad";
          default:
            return `ID: ${id}`;
        }
      });
      paramsText += `**Item Conditions:** ${conditionNames.join(", ")}\n`;
    }
    if (params.createdAfterDate && params.createdAfterDate !== "0") {
      paramsText += `**Created After:** <t:${params.createdAfterDate}:R>\n`;
    }
    if (params.createdBeforeDate && params.createdBeforeDate !== "0") {
      paramsText += `**Created Before:** <t:${params.createdBeforeDate}:R>\n`;
    }
    paramsText += `**Tracked:** ${query.isTracked ? "✅" : "❌"}`;

    embed.addFields({
      name: "Search Parameters",
      value: paramsText || "No parameters set",
    });

    await interaction.editReply({
      embeds: [embed],
      components: [selectRow, buttonRow],
    });
  }
  return selectedQueryId;
}

async function handleRunQuery(
  componentInteraction: ButtonInteraction,
  selectedQueryId: string,
  queries: IQuery[]
) {
  if (selectedQueryId) {
    const query = queries.find((q) => q._id.toString() === selectedQueryId);
    if (!query) {
      await componentInteraction.followUp({
        content: "Query not found.",
        flags: "Ephemeral",
      });
      return;
    }
    // Use the search command's logic to run the search
    try {
      const {
        keyword = "",
        excludeKeyword = "",
        priceMin = 300,
        priceMax = 9999999,
        sort = MercariSearchSort.CREATED_TIME,
        order = MercariSearchOrder.DESC,
        itemConditionId = [],
      } = query.searchParams || {};
      // Convert itemConditionId to boolean for itemConditionUsed
      const itemConditionUsed =
        Array.isArray(itemConditionId) && itemConditionId.length > 0;
      // Pass the componentInteraction instead of the original interaction
      await searchCommand.runSearch(componentInteraction, {
        keyword,
        excludeKeyword,
        priceMin,
        priceMax,
        sort,
        order,
              itemConditionUsed,
      });
    } catch (err) {
      logger.error(`Failed to run search: ${err}`);
      await componentInteraction.followUp({
        content: "Failed to run search." + err,
        flags: "Ephemeral",
      });
    }
  } else {
    await componentInteraction.followUp({
      content: "Query not selected or not found.",
      flags: "Ephemeral",
    });
  }
}

async function handleToggleTrackQuery(
  queries: IQuery[],
  componentInteraction: ButtonInteraction,
  selectedQueryId: string,
  interaction: ChatInputCommandInteraction,
  buttonRow: ActionRowBuilder<ButtonBuilder>
) {
  const query = await Query.findOne({ _id: selectedQueryId });
  if (selectedQueryId && query) {
    query.isTracked = !query.isTracked;
    query.lastRun = new Date(Date.now());
    await query.save();
    await componentInteraction.followUp({
      content: `Tracking for "${query.name}" is now ${
        query.isTracked ? "enabled ✅" : "disabled ❌"
      }.`,
    });

    const updatedQueries = queries.map((q) => {
      if (q._id.toString() === selectedQueryId) {
        q.isTracked = query.isTracked;
      }
      return q;
    });

    return await handleSelectQuery(
      interaction,
      updatedQueries,
      buttonRow,
      selectedQueryId
    );
  } else if (!selectedQueryId) {
    await componentInteraction.followUp({
      content: "No query selected.",
      flags: "Ephemeral",
    });
    return "";
  } else {
    await componentInteraction.followUp({
      content: "Query not found.",
      flags: "Ephemeral",
    });
    return "";
  }
}

async function handleDeleteQuery(
  componentInteraction: ButtonInteraction,
  interaction: ChatInputCommandInteraction,
  queries: IQuery[],
  buttonRow: ActionRowBuilder<ButtonBuilder>,
  selectedQueryId: string
) {
  if (selectedQueryId) {
    const result = await Query.deleteOne({ _id: selectedQueryId });
    if (result.deletedCount > 0) {
      const updatedQueries = queries.filter(
        (q) => q._id.toString() !== selectedQueryId
      );
      if (updatedQueries.length === 0) {
        await interaction.editReply({
          content:
            "You have no saved queries. Use `/create-query` to create one.",
          embeds: [],
          components: [],
        });
        return "";
      }

      const { embed: updatedEmbed, selectRow: updatedSelectRow } =
        buildQueryEmbedAndSelectRow(
          updatedQueries,
          "",
          interaction,
          "Your Saved Queries"
        );
      await interaction.editReply({
        embeds: [updatedEmbed],
        components: [updatedSelectRow, buttonRow],
      });
      return ""; // Reset selectedQueryId after successful deletion
    } else {
      await componentInteraction.followUp({
        content: "Query not found or already deleted.",
      });
    }
  } else {
    await componentInteraction.followUp({
      content: "No query selected.",
      flags: "Ephemeral",
    });
  }
  return selectedQueryId; // Return unchanged if deletion failed or no query selected
}

export default {
  data: new SlashCommandBuilder()
    .setName("list-queries")
    .setDescription("List your saved search queries")
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ])
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const userId = interaction.user.id;
      let selectedQueryId: string = "";

      const queries: IQuery[] = await Query.find({ userId });

      if (queries.length === 0) {
        return interaction.editReply({
          content:
            "You don't have any saved queries yet. Use `/create-query` to create one.",
        });
      }

      // Build initial embed and select menu
      const { embed, selectRow } = buildQueryEmbedAndSelectRow(
        queries,
        selectedQueryId,
        interaction
      );

      // Buttons for managing queries
      const runButton = new ButtonBuilder()
        .setCustomId(`run_query:${interaction.id}`)
        .setLabel("Run query")
        .setStyle(ButtonStyle.Primary);

      const trackButton = new ButtonBuilder()
        .setCustomId(`toggle_track_query:${interaction.id}`)
        .setLabel("Toggle Tracking")
        .setStyle(ButtonStyle.Primary);

      const deleteButton = new ButtonBuilder()
        .setCustomId(`delete_query:${interaction.id}`)
        .setLabel("Delete Query")
        .setStyle(ButtonStyle.Danger);

      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        runButton,
        trackButton,
        deleteButton
      );

      await interaction.editReply({
        embeds: [embed],
        components: [selectRow, buttonRow],
      });

      const collectorFilter = (i: any) =>
        (i.customId.startsWith(`select_query:${interaction.id}`) ||
          i.customId.startsWith(`run_query:${interaction.id}`) ||
          i.customId.startsWith(`toggle_track_query:${interaction.id}`) ||
          i.customId.startsWith(`delete_query:${interaction.id}`)) &&
        i.user.id === interaction.user.id;

      if (
        interaction.channel &&
        typeof interaction.channel.createMessageComponentCollector ===
          "function"
      ) {
        const collector = interaction.channel.createMessageComponentCollector({
          filter: collectorFilter,
          time: 600000,
        });

        collector.on(
          "collect",
          async (
            componentInteraction:
              | ButtonInteraction
              | StringSelectMenuInteraction
          ) => {
            await componentInteraction.deferUpdate();
            logger.info(`Component ${componentInteraction.customId} clicked`);
            const customId = componentInteraction.customId.replace(
              `:${interaction.id}`,
              ""
            );
            switch (customId) {
              case "select_query": {
                if (componentInteraction.isStringSelectMenu()) {
                  const value = componentInteraction.values[0];

                  if (value) {
                    selectedQueryId = value;
                    selectedQueryId = await handleSelectQuery(
                      interaction,
                      queries,
                      buttonRow,
                      selectedQueryId
                    );
                  }
                }
                break;
              }
              case "run_query": {
                if (componentInteraction.isButton()) {
                  await handleRunQuery(
                    componentInteraction,
                    selectedQueryId,
                    queries
                  );
                }
                break;
              }
              case "toggle_track_query": {
                if (componentInteraction.isButton()) {
                  selectedQueryId = await handleToggleTrackQuery(
                    queries,
                    componentInteraction,
                    selectedQueryId,
                    interaction,
                    buttonRow
                  );
                }
                break;
              }
              case "delete_query": {
                if (componentInteraction.isButton()) {
                  selectedQueryId = await handleDeleteQuery(
                    componentInteraction,
                    interaction,
                    queries,
                    buttonRow,
                    selectedQueryId
                  );
                }
                break;
              }
              default:
                break;
            }
          }
        );

        collector.on("end", async () => {
          await interaction.editReply({
            components: [],
          });
        });
      }
    } catch (error) {
      logger.error(`Error in list-queries command: ${error}`);
      await interaction.editReply({
        content: "There was an error while executing this command!",
      });
    }
  },
};
