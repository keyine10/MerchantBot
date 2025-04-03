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

module.exports = {
	data: new SlashCommandBuilder()
		.setName('item')
		.setDescription('Get information about an item on Mercari')
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
		try {
			let data = await mercari.getItemDetails(itemId);
			let translationData = await mercari.getItemTranslation(
				itemId
			);
			const item = data.data;
			const itemOverviewEmbed = {
				title: translationData.name.substring(0, 100),
				url: MercariURLs.ROOT_PRODUCT + item.id,
				author: {
					name: `${item.seller.id}${
						item.seller.is_official ||
						item.seller.register_sms_confirmation
							? '✅'
							: ''
					} | ${item.seller.num_ratings}(${
						item.seller.ratings.good
					}👍${item.seller.ratings.bad}👎) ${
						item.seller.star_rating_score
					}⭐`,
					icon_url: item.seller.photo_thumbnail_url,
					url: `${MercariURLs.USER_PROFILE}${item.seller.id}`,
				},
				thumbnail: { url: item.photos[0] },

				fields: [
					{
						name: 'id',
						value: item.id,
						inline: true,
					},
					{
						name: 'price',
						value: `${item.price}yen | ${item.converted_price.price}${item.converted_price.currency_code}`,
						inline: true,
					},
					{ name: '\n', value: '\n' },
					{
						name: 'created',
						value: `<t:${item.created}:R>`,
						inline: true,
					},
					{
						name: 'updated',
						value: `<t:${item.updated}:R>`,
						inline: true,
					},
				],
			};
			const itemDescriptionEmbed = {
				title: 'Item description',
				description: translationData.description,
			};

			await interaction.editReply({
				embeds: [itemOverviewEmbed, itemDescriptionEmbed],
			});
		} catch (error) {
			interaction.editReply({
				embeds: [
					{
						title:
							'Error getting item information:' + error,
						color: 0xff0000,
					},
				],
			});
			console.error('Error getting item information:' + error);
		}

		// Create a collector to listen for button interactions
		// const collectorFilter = (i) =>
		// 	(i.customId.startsWith(`prev-page:${interaction.id}`) ||
		// 		i.customId.startsWith(
		// 			`next-page:${interaction.id}`
		// 		) ||
		// 		i.customId.startsWith(
		// 			`select-item:${interaction.id}`
		// 		)) &&
		// 	i.user.id === interaction.user.id;
		// const collector =
		// 	interaction.channel.createMessageComponentCollector({
		// 		filter: collectorFilter,
		// 		time: 600000, //10 minutes
		// 	});

		// collector.on('collect', async (buttonInteraction) => {
		// 	// Handle button interaction logic here
		// 	await buttonInteraction.deferUpdate();
		// 	console.log(
		// 		`Button ${buttonInteraction.customId} clicked`
		// 	);
		// 	const buttonCustomId = buttonInteraction.customId.replace(
		// 		`:${interaction.id}`,
		// 		''
		// 	);
		// 	switch (buttonCustomId) {
		// 		case 'prev-page':
		// 			break;
		// 		case 'next-page':
		// 			break;
		// 		case 'select-item':
		// 			break;
		// 		default:
		// 			break;
		// 	}
		// });

		// collector.on('end', async (collected) => {
		// 	if (collected.size === 0) {
		// 	} else {
		// 		console.log(
		// 			`Collected ${collected.size} interactions`
		// 		);
		// 	}
		// 	await interaction.editReply({
		// 		...replyObject,
		// 		components: [], // Remove the buttons
		// 	});
		// });
	},
};
