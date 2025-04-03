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
const {
	MercariURLs,
	MercariSearchStatus,
	MercariSearchSort,
	MercariSearchOrder,
	MercariItemStatus,
	MercariItemConditionId,
	MercariSearchCategoryID,
} = require('../../mercari/utils.js');

const pageSize = 5; // Default page size for search results

/**
 * Renders the embeds for the search results.
 * @param {*} results - results from mercari.search()
 * @param {*} interaction - current interaction
 * @returns {Object} - reply object for editing the reply
 */
function searchResultToReplyObject(results, interaction) {
	if (!results.items?.length) {
		return {
			embeds: [
				{
					title: 'Did not find any item',
					color: 0xff0000,
				},
			],
		};
	}
	const embedItems = results.items.map((item) => {
		return {
			title: item.name.substring(0, 100),
			thumbnail: { url: item.photos[0].uri },
			url: MercariURLs.ROOT_PRODUCT + item.id,
			color: 0x0099ff,
			fields: [
				{ name: 'id', value: item.id, inline: true },
				{
					name: 'price',
					value: item.price + ' yen',
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
	});

	const prevPageButton = new ButtonBuilder()
		.setCustomId(`prev-page:${interaction.id}`)
		.setLabel('Previous Page')
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(!results.meta.previousPageToken ? true : false);

	const nextPageButton = new ButtonBuilder()
		.setCustomId(`next-page:${interaction.id}`)
		.setLabel('Next Page')
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(!results.meta.nextPageToken ? true : false);

	const select = new StringSelectMenuBuilder()
		.setCustomId(`select-item:${interaction.id}`)
		.setPlaceholder('Get item details')
		.addOptions(
			results.items.map((item) => {
				return new StringSelectMenuOptionBuilder()
					.setLabel(item.id)
					.setDescription(item.name.substring(0, 100))
					.setValue(item.id);
			})
		);
	const searchButtonRow = new ActionRowBuilder().addComponents(
		prevPageButton,
		nextPageButton
	);
	const selectItemRow = new ActionRowBuilder().addComponents(
		select
	);
	const replyObject = {
		embeds: embedItems,
		components: [selectItemRow, searchButtonRow],
	};
	return replyObject;
}

async function searchAndGetReplyObject(
	interaction,
	requestData,
	pageSize = 5,
	pageToken = ''
) {
	try {
		const results = await mercari.search({
			...requestData,
			pageSize: pageSize,
			pageToken: pageToken,
		});
		const replyObject = searchResultToReplyObject(
			results,
			interaction
		);
		const meta = results.meta;
		return {
			replyObject: replyObject,
			meta: meta,
		};
	} catch (error) {
		await interaction.editReply({
			content:
				'Something went wrong while searching for items. Please try again later. ' +
				error,
		});
		throw error; // Rethrow the error to be handled by the caller
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('search')
		.setDescription('Search for items on Mercari')
		.addStringOption((option) =>
			option
				.setName('keyword')
				.setDescription('Keyword to search for')
				.setMaxLength(100)
				.setMinLength(1)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('exclude_keyword')
				.setDescription('Exclude keyword')
				.setMaxLength(100)
				.setMinLength(0)
		)
		.addNumberOption((option) =>
			option
				.setName('price_min')
				.setDescription('Minimum item price')
				.setMinValue(300)
		)
		.addNumberOption((option) =>
			option
				.setName('price_max')
				.setDescription('Maximum item price')
				.setMaxValue(9999999)
		)
		.addStringOption((option) =>
			option
				.setName('sort')
				.setDescription(
					'sort items by default/date/likes/score/price'
				)
				.addChoices(
					Object.keys(MercariSearchSort).map((key) => ({
						name: key,
						value: MercariSearchSort[key],
					}))
				)
		)

		.addStringOption((option) =>
			option
				.setName('order')
				.setDescription('order items in ascending/descending')
				.addChoices(
					Object.keys(MercariSearchOrder).map((key) => ({
						name: key,
						value: MercariSearchOrder[key],
					}))
				)
		)
		.addBooleanOption((option) =>
			option
				.setName('item_condition_used')
				.setDescription('search for used items only')
		),

	async execute(interaction) {
		const keyword = interaction.options.getString('keyword');
		const excludeKeyword =
			interaction.options.getString('exclude_keyword');
		const priceMin = interaction.options.getNumber('price_min');
		const priceMax = interaction.options.getNumber('price_max');
		const sort = interaction.options.getString('sort');
		const order = interaction.options.getString('order');
		const itemConditionUsed = interaction.options.getBoolean(
			'item_condition_used'
		);
		const createdAfterDate = new Date();
		createdAfterDate.setMonth(createdAfterDate.getMonth() - 1);

		const requestData = {
			keyword,
			excludeKeyword,
			priceMin: priceMin ? priceMin : 0,
			priceMax: priceMax ? priceMax : 0,
			sort,
			order,
			itemConditionId: itemConditionUsed ? [2, 3, 4, 5, 6] : [],
			createdAfterDate: Math.floor(
				Date.now() / 1000 - 86400 * 10
			),
			createdBeforeDate: '0',
		};
		console.log(requestData);
		let pageToken = '';
		await interaction.reply({
			content: 'Searching for items...',
		});

		let { replyObject, meta } = await searchAndGetReplyObject(
			interaction,
			requestData,
			pageSize,
			pageToken
		);
		// console.log(replyObject);
		const response = await interaction.editReply({
			...replyObject,
			content: `Search results for "${keyword}"`,
			withResponse: true,
		});

		// Create a collector to listen for button interactions
		const collectorFilter = (i) =>
			(i.customId.startsWith(`prev-page:${interaction.id}`) ||
				i.customId.startsWith(
					`next-page:${interaction.id}`
				) ||
				i.customId.startsWith(
					`select-item:${interaction.id}`
				)) &&
			i.user.id === interaction.user.id;
		const collector =
			interaction.channel.createMessageComponentCollector({
				filter: collectorFilter,
				time: 600000, //10 minutes
			});

		collector.on('collect', async (buttonInteraction) => {
			// Handle button interaction logic here
			await buttonInteraction.deferUpdate();
			console.log(
				`Button ${buttonInteraction.customId} clicked`
			);
			const buttonCustomId = buttonInteraction.customId.replace(
				`:${interaction.id}`,
				''
			);
			switch (buttonCustomId) {
				case 'prev-page':
					const prevResults = await searchAndGetReplyObject(
						interaction,
						requestData,
						pageSize,
						meta.previousPageToken
					);
					replyObject = prevResults.replyObject;
					meta = prevResults.meta;
					await interaction.editReply({
						...replyObject,
						withResponse: true,
					});

					break;
				case 'next-page':
					const nextResults = await searchAndGetReplyObject(
						interaction,
						requestData,
						pageSize,
						meta.nextPageToken
					);
					replyObject = nextResults.replyObject;
					meta = nextResults.meta;
					const response = await interaction.editReply({
						...replyObject,
						withResponse: true,
					});
					pageToken = meta.nextPageToken;
					break;
				case 'select-item':
					const selectedItemId =
						buttonInteraction.values[0];
					// Handle item selection logic here
					console.log(`Item ${selectedItemId} selected`);

					await interaction.followUp({
						content: 'This does not work yet!',
						flags: MessageFlags.Ephemeral,
					});

					break;
				default:
					break;
			}
		});

		collector.on('end', async (collected) => {
			if (collected.size === 0) {
			} else {
				console.log(
					`Collected ${collected.size} interactions`
				);
			}
			await interaction.editReply({
				...replyObject,
				components: [], // Remove the buttons
			});
		});
	},
};
