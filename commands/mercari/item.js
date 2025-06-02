const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ComponentType,
	MessageFlags,
} = require('discord.js');
const mercari = require('../../mercari/mercari.js');
const { MercariURLs } = require('../../mercari/utils.js');

const pageSize = 5; // Default page size for search results

// Export a function to get item details and translation and return the embed objects
async function getItemEmbeds(itemId, interaction) {
	try {
		let data = await mercari.getItemDetails(itemId);
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
		let translationData = await mercari.getItemTranslation(itemId);
		const item = data.data;
		const itemOverviewEmbed = {
			title: translationData.name.substring(0, 100),
			url: MercariURLs.ROOT_PRODUCT + item.id,
			author: {
				name: `${item.seller.id}${item.seller.is_official || item.seller.register_sms_confirmation ? '✅' : ''} | ${item.seller.num_ratings}(${item.seller.ratings.good}👍${item.seller.ratings.bad}👎) ${item.seller.star_rating_score}⭐`,
				icon_url: item.seller.photo_thumbnail_url,
				url: `${MercariURLs.USER_PROFILE}${item.seller.id}`,
			},
			thumbnail: { url: item.photos[0] },
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
	} catch (error) {
		return {
			content: 'Error getting item information: ' + error,
			embeds: [],
		};
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('item')
		.setDescription('Get information about an item on Mercari')
		.setContexts(['Guild', 'BotDM', 'PrivateChannel'])
		.addStringOption((option) =>
			option
				.setName('item_id')
				.setDescription('The id of the item ex. m13270631255')
				.setMaxLength(30)
				.setMinLength(12)
				.setRequired(true)
		),

	async execute(interaction) {
		const itemId = interaction.options.getString('item_id');
		await interaction.deferReply({});
		const result = await getItemEmbeds(itemId, interaction);
		await interaction.editReply(result);
	},
	getItemEmbeds, // export for reuse
};
