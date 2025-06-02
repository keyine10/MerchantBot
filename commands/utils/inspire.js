const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inspire')
		.setDescription(
			'Fetches an inspirational quote image from InspiroBot'
		)
		.setContexts(['Guild', 'BotDM', 'PrivateChannel']),
	async execute(interaction) {
		await interaction.deferReply({});

		try {
			const response = await fetch(
				'https://inspirobot.me/api?generate=true'
			);
			if (!response.ok) {
				throw new Error(
					'Failed to fetch image from InspiroBot'
				);
			}

			const imageUrl = await response.text();

			await interaction.editReply({
				embeds: [
					{
						// title: 'Here is your inspiration!',
						image: { url: imageUrl },
						color: 0x00ff00,
					},
				],
			});
		} catch (error) {
			console.error(error);
			await interaction.editReply({
				content:
					'Sorry, I could not fetch an inspirational image at the moment.',
			});
		}
	},
};
