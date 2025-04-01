const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ComponentType,
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
 * @returns {Object} - reply object for editing the reply
 */
function searchResultToReplyObject(results) {
	const embedItems = results.items.map((item) => {
		return {
			title: item.name.substring(0, 100),
			thumbnail: { url: item.thumbnails[0] },
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
	if (!results.items.length) {
		embedItems.push({
			title: 'No more items found',
			color: 0xff0000,
		});
	}

	const prevPageButton = new ButtonBuilder()
		.setCustomId('prev-page')
		.setLabel('Previous Page')
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(!results.meta.previousPageToken ? true : false);

	const nextPageButton = new ButtonBuilder()
		.setCustomId('next-page')
		.setLabel('Next Page')
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(!results.meta.nextPageToken ? true : false);

	const select = new StringSelectMenuBuilder()
		.setCustomId('select-item')
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
		content: 'Found ' + results.meta.numFound + ' items',
		embeds: embedItems,
		components: [selectItemRow, searchButtonRow],
	};
	return replyObject;
}

async function searchAndGetReplyObject(
	interaction,
	keyword,
	pageSize = 5,
	pageToken = ''
) {
	try {
		const results = await mercari.search({
			keyword: keyword,
			pageSize: pageSize,
			pageToken: pageToken,
		});
		const replyObject = searchResultToReplyObject(results);
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
				.setMaxLength(100)
				.setMinLength(1)
				.setDescription('Keyword to search for')
				.setRequired(true)
		),
	async execute(interaction) {
		const keyword = interaction.options.getString('keyword');
		let pageToken = '';
		await interaction.deferReply({});

		let { replyObject, meta } = await searchAndGetReplyObject(
			interaction,
			keyword,
			pageSize,
			pageToken
		);

		const response = await interaction.editReply({
			...replyObject,
		});

		// Create a collector to listen for button interactions
		const collectorFilter = (i) =>
			i.user.id === interaction.user.id;
		const collector =
			interaction.channel.createMessageComponentCollector({
				filter: collectorFilter,
				time: 1200000, // 20 minutes
			});

		collector.on('collect', async (buttonInteraction) => {
			await buttonInteraction.deferUpdate();
			// Handle button interaction logic here
			console.log(
				`Button ${buttonInteraction.customId} clicked`
			);
			switch (buttonInteraction.customId) {
				case 'prev-page':
					const prevResults = await searchAndGetReplyObject(
						interaction,
						keyword,
						pageSize,
						meta.previousPageToken
					);
					replyObject = prevResults.replyObject;
					meta = prevResults.meta;
					await interaction.editReply({
						...replyObject,
					});

					break;
				case 'next-page':
					const nextResults = await searchAndGetReplyObject(
						interaction,
						keyword,
						pageSize,
						meta.nextPageToken
					);
					replyObject = nextResults.replyObject;
					meta = nextResults.meta;
					const response = await interaction.editReply({
						...replyObject,
					});
					pageToken = meta.nextPageToken;
					break;
				case 'select-item':
					const selectedItemId =
						buttonInteraction.values[0];
					// Handle item selection logic here
					console.log(`Item ${selectedItemId} selected`);
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
