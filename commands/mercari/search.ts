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
    InteractionContextType,
} from 'discord.js';
import mercari from '../../mercari/mercari';
import { MercariURLs, MercariSearchSort } from '../../mercari/types';
import itemCommand from './item';

// Add missing enums for sort and order

export enum MercariSearchOrder {
	Ascending = 'asc',
	Descending = 'desc',
}

const pageSize = 5;

function searchResultToReplyObject(results: any, interaction: ChatInputCommandInteraction) {
	if (!results.items?.length) {
		return {
			embeds: [
				{
					title: 'Did not find any item',
					color: 0xff0000,
				},
			],
			components: [], // Always include components for consistent typing
		};
	}
	const embedItems = results.items.map((item: any) => {
		return {
			title: item.name.substring(0, 100),
			thumbnail: { url: item.photos[0].uri },
			url: MercariURLs.ROOT_PRODUCT + item.id,
			color: 0x0099ff,
			fields: [
				{ name: 'id', value: item.id, inline: true },
				{ name: 'price', value: item.price + '¥', inline: true },
				{ name: '\n', value: '\n' },
				{ name: 'created', value: `<t:${item.created}:R>`, inline: true },
				{ name: 'updated', value: `<t:${item.updated}:R>`, inline: true },
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
			results.items.map((item: any) => {
				return new StringSelectMenuOptionBuilder()
					.setLabel(item.id)
					.setDescription(item.name.substring(0, 100))
					.setValue(item.id);
			})
		);
	const searchButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		prevPageButton,
		nextPageButton
	);
	const selectItemRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
	const replyObject = {
		embeds: embedItems,
		components: [selectItemRow, searchButtonRow],
	};
	return replyObject;
}

async function searchAndGetReplyObject(
	interaction: ChatInputCommandInteraction,
	requestData: any,
	pageSize = 5,
	pageToken = ''
) {
	try {
		const results = await mercari.search({
			...requestData,
			pageSize: pageSize,
			pageToken: pageToken,
		});
		const replyObject = searchResultToReplyObject(results, interaction);
		const meta = results.meta;
		return {
			replyObject: replyObject,
			meta: meta,
		};
	} catch (error) {
		await interaction.editReply({
			content: 'Something went wrong while searching for items. Please try again later. ' + error,
		});
		throw error;
	}
}

const searchCommand = {
	data: new SlashCommandBuilder()
		.setName('search')
		.setDescription('Search for items on Mercari')
		.setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
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
				.setDescription('sort items by default/date/likes/score/price')
				.addChoices(
					(Object.keys(MercariSearchSort) as Array<keyof typeof MercariSearchSort>).map((key) => ({
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
					(Object.keys(MercariSearchOrder) as Array<keyof typeof MercariSearchOrder>).map((key) => ({
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

	async execute(interaction: ChatInputCommandInteraction) {
		const keyword = interaction.options.getString('keyword');
		const excludeKeyword = interaction.options.getString('exclude_keyword');
		const priceMin = interaction.options.getNumber('price_min');
		const priceMax = interaction.options.getNumber('price_max');
		const sort = interaction.options.getString('sort');
		const order = interaction.options.getString('order');
		const itemConditionUsed = interaction.options.getBoolean('item_condition_used');
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
			createdAfterDate: Math.floor(Date.now() / 1000 - 86400 * 10),
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
		const response = await interaction.editReply({
			...replyObject,
			content: `Search results for "${keyword}"`,
			components: replyObject.components.map((row: any) => row.toJSON()),
		});

		const collectorFilter = (i: any) =>
			(i.customId.startsWith(`prev-page:${interaction.id}`) ||
				i.customId.startsWith(`next-page:${interaction.id}`) ||
				i.customId.startsWith(`select-item:${interaction.id}`)) &&
			i.user.id === interaction.user.id;
		if (interaction.channel && typeof interaction.channel.createMessageComponentCollector === 'function') {
			const collector = interaction.channel.createMessageComponentCollector({
				filter: collectorFilter,
				time: 600000, //10 minutes
			});

			collector.on('collect', async (buttonInteraction: any) => {
				await buttonInteraction.deferUpdate();
				console.log(`Button ${buttonInteraction.customId} clicked`);
				const buttonCustomId = buttonInteraction.customId.replace(`:${interaction.id}`, '');
				switch (buttonCustomId) {
					case 'prev-page': {
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
							components: replyObject.components.map((row: any) => row.toJSON()),
						});
						break;
					}
					case 'next-page': {
						const nextResults = await searchAndGetReplyObject(
							interaction,
							requestData,
							pageSize,
							meta.nextPageToken
						);
						replyObject = nextResults.replyObject;
						meta = nextResults.meta;
						await interaction.editReply({
							...replyObject,
							components: replyObject.components.map((row: any) => row.toJSON()),
						});
						pageToken = meta.nextPageToken;
						break;
					}
					case 'select-item': {
						const selectedItemId = buttonInteraction.values[0];
						console.log(`Item ${selectedItemId} selected`);
						const result = await itemCommand.getItemEmbeds(selectedItemId, interaction);
						await buttonInteraction.editReply(result);
						break;
					}
					default:
						break;
				}
			});

			collector.on('end', async (collected: any) => {
				await interaction.editReply({
					...replyObject,
					components: [],
				});
			});
		} else {
			await interaction.editReply({
				content: 'Interactive buttons are not supported in this context. Please make sure you have not disabled DMs from this bot, and that you are not using ephemeral replies.',
				components: [],
			});
		}
	},
};

export default searchCommand;
