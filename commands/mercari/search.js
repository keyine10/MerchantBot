const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
		const channel = interaction.channel;
		const pageSize = 10;
		await interaction.deferReply({});

		try {
			const results = await mercari.search({
				keyword: keyword,
				pageSize: pageSize,
			});
			// await interaction.editReply({});
			results.items.map((item) => {
				const embedItem = {
					title: item.name,
					thumbnail: { url: item.thumbnails[0] },
					url: MercariURLs.ROOT_PRODUCT + item.id,
					fields: [
						{
							name: 'price',
							value: item.price + ' yen',
						},
						{
							name: 'created',
							value: `<t:${item.created}:F>`,
						},
						{
							name: 'updated',
							value: `<t:${item.updated}:F>`,
						},
					],
				};
				channel.send({ embeds: [embedItem] });
			});
			await interaction.editReply({
				content: `Found total of ${results.meta.numFound} items, displaying ${pageSize} items`,
			});
		} catch (error) {
			console.error(error);
			await interaction.editReply({
				content:
					'Something went wrong while searching for items. Please try again later. ' +
					error,
			});
		}
	},
};
