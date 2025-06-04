"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getItemEmbeds = getItemEmbeds;
const discord_js_1 = require("discord.js");
const mercari_1 = __importDefault(require("../../mercari/mercari"));
const utils_1 = require("../../mercari/utils");
const pageSize = 5; // Default page size for search results
// Export a function to get item details and translation and return the embed objects
async function getItemEmbeds(itemId, interaction) {
    try {
        const data = await mercari_1.default.getItemDetails(itemId);
        if (!data || !data.data) {
            return {
                embeds: [{
                        title: 'Item not found',
                        description: '(This item has been deleted or is no longer available.)',
                        color: 0xff0000,
                    }],
                content: undefined,
            };
        }
        const translationData = await mercari_1.default.getItemTranslation(itemId);
        const item = data.data;
        const itemOverviewEmbed = {
            title: translationData.name.substring(0, 100),
            url: utils_1.MercariURLs.ROOT_PRODUCT + item.id,
            author: {
                name: `${item.seller.id}${item.seller.is_official || item.seller.register_sms_confirmation ? '✅' : ''} | ${item.seller.num_ratings}(${item.seller.ratings.good}👍${item.seller.ratings.bad}👎) ${item.seller.star_rating_score}⭐`,
                icon_url: item.seller.photo_thumbnail_url,
                url: `${utils_1.MercariURLs.USER_PROFILE}${item.seller.id}`,
            },
            thumbnail: { url: Array.isArray(item.photos) && typeof item.photos[0] === 'string' ? item.photos[0] : item.photos[0].uri },
            fields: [
                { name: 'id', value: item.id, inline: true },
                { name: 'price', value: `${item.price}yen | ${item.converted_price.price}${item.converted_price.currency_code}`, inline: true },
                { name: '\n', value: '\n' },
                { name: 'created', value: `<t:${item.created}:R>`, inline: true },
                { name: 'updated', value: `<t:${item.updated}:R>`, inline: true },
            ],
        };
        const itemDescriptionEmbed = {
            title: 'Item description',
            description: translationData.description,
        };
        return {
            embeds: [itemOverviewEmbed, itemDescriptionEmbed],
            content: `Item details for ${item.id}`,
        };
    }
    catch (error) {
        return {
            content: 'Error getting item information: ' + error,
            embeds: [],
        };
    }
}
const itemCommand = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('item')
        .setContexts([discord_js_1.InteractionContextType.Guild, discord_js_1.InteractionContextType.BotDM, discord_js_1.InteractionContextType.PrivateChannel])
        .addStringOption((option) => option
        .setName('item_id')
        .setDescription('The id of the item ex. m13270631255')
        .setMaxLength(30)
        .setMinLength(12)
        .setRequired(true)),
    async execute(interaction) {
        const itemId = interaction.options.getString('item_id', true);
        await interaction.deferReply({});
        const result = await getItemEmbeds(itemId, interaction);
        await interaction.editReply(result);
    },
    getItemEmbeds, // export for reuse
};
exports.default = itemCommand;
