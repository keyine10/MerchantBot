import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	APIEmbed,
	InteractionContextType,
} from 'discord.js';
import mercari from '../../mercari/mercari';
import { MercariURLs } from '../../mercari/utils';

const pageSize = 5; // Default page size for search results

type MercariItem = {
	id: string;
	name: string;
	photos: { uri: string }[] | string[];
	created: number;
	updated: number;
	price: number;
	converted_price: { price: number; currency_code: string };
	seller: {
		id: string;
		is_official?: boolean;
		register_sms_confirmation?: boolean;
		num_ratings: number;
		ratings: { good: number; bad: number };
		star_rating_score: number;
		photo_thumbnail_url: string;
	};
};

type MercariTranslation = {
	name: string;
	description: string;
};

// Export a function to get item details and translation and return the embed objects
export async function getItemEmbeds(itemId: string, interaction: ChatInputCommandInteraction): Promise<{ embeds: APIEmbed[]; content?: string }> {
	try {
		const data = await mercari.getItemDetails(itemId);
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
		const translationData: MercariTranslation = await mercari.getItemTranslation(itemId);
		const item: MercariItem = data.data;
        // Helper to format numbers with commas
        const formatNumber = (num: number) => num.toLocaleString('en-US');

        const itemOverviewEmbed: APIEmbed = {
            title: translationData.name.substring(0, 100),
            url: MercariURLs.ROOT_PRODUCT + item.id,
            author: {
                name: `${item.seller.id}${item.seller.is_official || item.seller.register_sms_confirmation ? '✅' : ''} | ${item.seller.num_ratings}(${item.seller.ratings.good}👍${item.seller.ratings.bad}👎) ${item.seller.star_rating_score}⭐`,
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
			content: `Item details for ${item.id}`,
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
		.setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
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
