import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
  MessageFlags,
  ChatInputCommandInteraction,
  ButtonInteraction,
  Interaction,
  InteractionContextType,
  ApplicationIntegrationType,
  StringSelectMenuInteraction,
} from "discord.js";
import mercari from "../../mercari/mercari";
import {
  MercariURLs,
  MercariSearchOrder,
  MercariSearchSort,
  MercariSearchResult,
  MercariSearchCondition,
  MercariSearchCategoryID,
} from "../../mercari/types";
import itemCommand from "./item";
import logger from "../../utils/logger";

// Add missing enums for sort and order

const pageSize = 5;

function createEmbedForItems(items: MercariSearchResult["items"]) {
  return items.map((item) => {
    const embed: any = {
      title:
        item.name.length > 97 ? item.name.substring(0, 97) + "..." : item.name,
      url: MercariURLs.ROOT_PRODUCT + item.id,
      color: 0x0099ff,
      fields: [
        { name: "id", value: `\`${item.id}\``, inline: true },
        { name: "price", value: item.price + "¥", inline: true },
        { name: "\n", value: "\n" },
        { name: "created", value: `<t:${item.created}:R>`, inline: true },
        { name: "updated", value: `<t:${item.updated}:R>`, inline: true },
      ],
      thumbnail: { url: item.thumbnails[0] },
    };
    return embed;
  });
}

function SearchResultViewModel(
  results: MercariSearchResult,
  interaction: ChatInputCommandInteraction
) {
  if (!results.items?.length) {
    return {
      embeds: [
        {
          title: "Did not find any item",
          color: 0xff0000,
        },
      ],
      components: [], // Always include components for consistent typing
    };
  }
  const embedItems = createEmbedForItems(results.items);

  const prevPageButton = new ButtonBuilder()
    .setCustomId(`prev-page:${interaction.id}`)
    .setLabel("Previous Page")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!results.meta.previousPageToken ? true : false);

  const nextPageButton = new ButtonBuilder()
    .setCustomId(`next-page:${interaction.id}`)
    .setLabel("Next Page")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!results.meta.nextPageToken ? true : false);

  const select = new StringSelectMenuBuilder()
    .setCustomId(`select-item:${interaction.id}`)
    .setPlaceholder("Get item details")
    .addOptions(
      results.items.map((item) => {
        return new StringSelectMenuOptionBuilder()
          .setLabel(item.id)
          .setDescription(item.name.substring(0, 100))
          .setValue(item.id);
      })
    );
  const paginationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    prevPageButton,
    nextPageButton
  );
  const selectItemRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  const replyObject = {
    embeds: embedItems,
    components: [selectItemRow, paginationRow],
  };
  return replyObject;
}

async function getSearchResultViewModel(
  interaction: ChatInputCommandInteraction,
  requestData: Partial<MercariSearchCondition>,
  pageSize = 5,
  pageToken = ""
) {
  try {
    const results = await mercari.search({
      ...requestData,
      pageSize: pageSize,
      pageToken: pageToken,
    });
    const replyObject = SearchResultViewModel(results, interaction);
    const meta = results.meta;
    return {
      replyObject: replyObject,
      meta: meta,
    };
  } catch (error) {
    await interaction.editReply({
      content:
        "Something went wrong while searching for items. Please try again later. " +
        error,
    });
    throw error;
  }
}

async function runSearch(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  params: Partial<MercariSearchCondition> & {
    itemConditionUsed?: boolean;
  }
) {
  const {
    keyword = "",
    excludeKeyword = "",
    priceMin = 300,
    priceMax = 9999999,
    categoryId = [],
    sort = MercariSearchSort.CREATED_TIME,
    order = MercariSearchOrder.DESC,
    itemConditionUsed = false,
    createdAfterDate = "0",
    createdBeforeDate = "0",
  } = params;

  const isButton = (i: any): i is ButtonInteraction =>
    i && typeof i.isButton === "function" && i.isButton();
  const isChatInput = (i: any): i is ChatInputCommandInteraction =>
    i && typeof i.isChatInputCommand === "function" && i.isChatInputCommand();

  if (isChatInput(interaction)) {
    await interaction.deferReply({ ephemeral: false });
  }
  const requestData = {
    keyword,
    excludeKeyword,
    priceMin,
    priceMax,
    categoryId,
    sort,
    order,
    itemConditionId: itemConditionUsed ? [2, 3, 4, 5, 6] : [],
    createdAfterDate,
    createdBeforeDate,
  };
  logger.log(JSON.stringify(requestData));
  let selectedItem = "";
  let pageToken = "";

  let { replyObject, meta } = await getSearchResultViewModel(
    interaction as any,
    requestData,
    pageSize,
    pageToken
  );

  if (isChatInput(interaction)) {
    await interaction.editReply({
      ...replyObject,
      content: `Search results for "${keyword}"`,
      components: replyObject.components.map((row: any) => row.toJSON()),
    });
  } else if (isButton(interaction)) {
    // For button, send a new message (do not edit original)
    await interaction.followUp({
      ...replyObject,
      content: `Search results for "${keyword}"`,
      components: replyObject.components.map((row: any) => row.toJSON()),
      ephemeral: false,
    });
  }

  const collectorFilter = (i: any) =>
    (i.customId.startsWith(`prev-page:${interaction.id}`) ||
      i.customId.startsWith(`next-page:${interaction.id}`) ||
      i.customId.startsWith(`select-item:${interaction.id}`)) &&
    i.user.id === interaction.user.id;
  if (
    interaction.channel &&
    typeof interaction.channel.createMessageComponentCollector === "function"
  ) {
    const collector = interaction.channel.createMessageComponentCollector({
      filter: collectorFilter,
      time: 600000, //10 minutes
    });

    collector.on(
      "collect",
      async (
        buttonInteraction: ButtonInteraction | StringSelectMenuInteraction
      ) => {
        await buttonInteraction.deferUpdate();
        logger.log(`Button ${buttonInteraction.customId} clicked`);
        const buttonCustomId = buttonInteraction.customId.replace(
          `:${interaction.id}`,
          ""
        );
        switch (buttonCustomId) {
          case "prev-page": {
            const prevResults = await getSearchResultViewModel(
              interaction as any,
              requestData,
              pageSize,
              meta.previousPageToken
            );
            replyObject = prevResults.replyObject;
            meta = prevResults.meta;

            await buttonInteraction.editReply({
              ...replyObject,
              content: `Search results for "${keyword}"`,
              components: replyObject.components.map((row: any) =>
                row.toJSON()
              ),
            });
            break;
          }
          case "next-page": {
            const nextResults = await getSearchResultViewModel(
              interaction as any,
              requestData,
              pageSize,
              meta.nextPageToken
            );
            replyObject = nextResults.replyObject;
            meta = nextResults.meta;

            await buttonInteraction.editReply({
              ...replyObject,
              content: `Search results for "${keyword}"`,
              components: replyObject.components.map((row: any) =>
                row.toJSON()
              ),
            });
            pageToken = meta.nextPageToken;
            break;
          }
          case "select-item": {
            if (buttonInteraction.isStringSelectMenu()) {
              const selectedItemId = buttonInteraction.values[0] || "";
              logger.log(`Item ${selectedItemId} selected`);
              const result = await itemCommand.getItemDetailViewModel(
                selectedItemId
              );
              await buttonInteraction.editReply({
                content: `Item Details for \`${selectedItemId}\`:`,
                embeds: result.embeds,
              });
            }
            break;
          }
          default:
            break;
        }
      }
    );

    collector.on("end", async (collected: any) => {
      if (isChatInput(interaction)) {
        await interaction.editReply({
          ...replyObject,
          components: [],
        });
      } else if (isButton(interaction)) {
        await interaction.editReply({
          ...replyObject,
          components: [],
        });
      }
    });
  } else {
    if (isChatInput(interaction)) {
      await interaction.editReply({
        content:
          "Interactive buttons are not supported in this context. Please make sure you have not disabled DMs from this bot, and that you are not using ephemeral replies.",
        components: [],
      });
    } else if (isButton(interaction)) {
      await interaction.reply({
        content:
          "Interactive buttons are not supported in this context. Please make sure you have not disabled DMs from this bot, and that you are not using ephemeral replies.",
        components: [],
      });
    }
  }
}

const searchCommand = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search for items on Mercari")
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall)
    .addStringOption((option) =>
      option
        .setName("keyword")
        .setDescription("Keyword to search for")
        .setMaxLength(100)
        .setMinLength(1)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("exclude_keyword")
        .setDescription("Exclude keyword")
        .setMaxLength(100)
        .setMinLength(0)
    )
    .addNumberOption((option) =>
      option
        .setName("price_min")
        .setDescription("Minimum item price")
        .setMinValue(0)
    )
    .addNumberOption((option) =>
      option
        .setName("created_after_date")
        .setDescription(
          "Search for items created after this date (in days ago)"
        )
        .setMaxValue(999)
    )
    .addNumberOption((option) =>
      option
        .setName("created_before_date")
        .setDescription(
          "Search for items created before this date (in days ago)"
        )
        .setMaxValue(999)
    )
    .addNumberOption((option) =>
      option
        .setName("price_max")
        .setDescription("Maximum item price")
        .setMaxValue(9999999)
    )
    .addStringOption((option) =>
      option
        .setName("sort")
        .setDescription("sort items by default/date/likes/score/price")
        .addChoices(
          (
            Object.keys(MercariSearchSort) as Array<
              keyof typeof MercariSearchSort
            >
          ).map((key) => ({
            name: key,
            value: MercariSearchSort[key],
          }))
        )
    )
    .addStringOption((option) =>
      option
        .setName("order")
        .setDescription("order items in ascending/descending")
        .addChoices(
          (
            Object.keys(MercariSearchOrder) as Array<
              keyof typeof MercariSearchOrder
            >
          ).map((key) => ({
            name: key,
            value: MercariSearchOrder[key],
          }))
        )
    )
    .addBooleanOption((option) =>
      option
        .setName("item_condition_used")
        .setDescription("search for used items only")
    )
    .addNumberOption((option) =>
      option
        .setName("category")
        .setDescription("Select a category to search in")
        .addChoices(
          (
            Object.keys(MercariSearchCategoryID).filter((key) => isNaN(Number(key))) as Array<
              keyof typeof MercariSearchCategoryID
            >
          ).map((key) => ({
            name: key,
            value: MercariSearchCategoryID[key],
          }))
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const keyword = interaction.options.getString("keyword", true);
    const excludeKeyword =
      interaction.options.getString("exclude_keyword") || "";
    const priceMin = interaction.options.getNumber("price_min") || 300;
    const priceMax = interaction.options.getNumber("price_max") || 9999999;
    const sort =
      (interaction.options.getString("sort") as MercariSearchSort) ||
      MercariSearchSort.CREATED_TIME;
    const order =
      (interaction.options.getString("order") as MercariSearchOrder) ||
      MercariSearchOrder.DESC;
    const categoryId = [
      interaction.options.getNumber("category") as MercariSearchCategoryID,
    ];
    const createdAfterDate = String(
      Math.floor(
        Date.now() / 1000 -
          (interaction.options.getNumber("created_after_date") || 10) * 86400
      )
    ); // Default to 10 days ago
    const createdBeforeDate = String(
      Math.floor(
        Date.now() / 1000 -
          (interaction.options.getNumber("created_before_date") || 0) * 86400
      )
    ); // Default to now
    const itemConditionUsed =
      interaction.options.getBoolean("item_condition_used") || false;

    if (priceMin > priceMax) {
      return interaction.editReply({
        content:
          "⚠️ Minimum price cannot be greater than maximum price. Please adjust your price range.",
      });
    }
    await runSearch(interaction, {
      keyword,
      excludeKeyword,
      priceMin,
      priceMax,
      categoryId,
      sort,
      order,
      itemConditionUsed,
      createdAfterDate,
      createdBeforeDate,
    });
  },
  getSearchResultViewModel: getSearchResultViewModel,
  runSearch: runSearch,
  createEmbedForItems: createEmbedForItems,
};

export default searchCommand;
