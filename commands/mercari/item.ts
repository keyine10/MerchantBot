import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	APIEmbed,
	InteractionContextType,
	ApplicationIntegrationType,
} from 'discord.js';
import mercari from '../../mercari/mercari';
import { MercariItem, MercariItemInfo, MercariItemTranslation, MercariURLs } from '../../mercari/types';

const pageSize = 5; // Default page size for search results

// Export a function to get item details and translation and return the embed objects
export async function getItemEmbeds(itemId: string, interaction: ChatInputCommandInteraction): Promise<{ embeds: APIEmbed[]; content?: string }> {
	try {
		const itemDetails = await mercari.getItemDetails(itemId);
		if (!itemDetails || !itemDetails.data) {
			return {
				embeds: [{
					title: 'Item not found',
					description: '(This item has been deleted or is no longer available.)',
					color: 0xff0000,
				}],
				content: undefined,
			};
		}
		const translationData: MercariItemTranslation = await mercari.getItemTranslation(itemId);
		const item = itemDetails.data;
        // Helper to format numbers with commas
        const formatNumber = (num: number) => num.toLocaleString('en-US');

        const itemOverviewEmbed: APIEmbed = {
            title: translationData.name.substring(0, 100),
            url: MercariURLs.ROOT_PRODUCT + item.id,
            author: {
                name: `${item.seller.id}${item.seller.is_official || item.seller.register_sms_confirmation.length>0 ? '✅' : ''} | ${item.seller.num_ratings}(${item.seller.ratings.good}👍${item.seller.ratings.bad}👎) ${item.seller.star_rating_score}⭐`,
                icon_url: item.seller.photo_thumbnail_url,
                url: `${MercariURLs.USER_PROFILE}${item.seller.id}`,
            },
            thumbnail: { url: Array.isArray(item.photos) && typeof item.photos[0] === 'string' ? item.photos[0] as string : (item.photos[0] as { uri: string }).uri },
            fields: [
                { name: 'id', value: item.id, inline: true },
                { 
                    name: 'price', 
                    value: `${formatNumber(item.price)}¥ | ${formatNumber(item.converted_price.price)}${item.converted_price.currency_code}`, 
                    inline: true 
                },
                { name: '\n', value: '\n' },
                { name: 'created', value: `<t:${item.created}:R>`, inline: true },
                { name: 'updated', value: `<t:${item.updated}:R>`, inline: true },
            ],
        };
		const itemDescriptionEmbed: APIEmbed = {
			title: 'Item description',
			description: translationData.description,
		};
		return {
			embeds: [itemOverviewEmbed, itemDescriptionEmbed],
		};
	} catch (error) {
		return {
			content: 'Error getting item information: ' + error,
			embeds: [],
		};
	}
}

const itemCommand = {
	data: new SlashCommandBuilder()
		.setName('item')
		.setDescription('Get details for a specific Mercari item by ID')
		.setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
		.setIntegrationTypes(ApplicationIntegrationType.UserInstall)
		.addStringOption((option) =>
			option
				.setName('item_id')
				.setDescription('The id of the item ex. m13270631255')
				.setMaxLength(30)
				.setMinLength(12)
				.setRequired(true)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const itemId = interaction.options.getString('item_id', true);
		await interaction.deferReply({});
		const result = await getItemEmbeds(itemId, interaction);
		await interaction.editReply(result);
	},
	getItemEmbeds, // export for reuse
};

export default itemCommand;
