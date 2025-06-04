import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction, InteractionContextType } from 'discord.js';

const inspireCommand = {
	data: new SlashCommandBuilder()
		.setName('inspire')
		.setDescription('Fetches an inspirational quote image from InspiroBot')
		.setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({});
		try {
			const response = await fetch('https://inspirobot.me/api?generate=true');
			if (!response.ok) {
				throw new Error('Failed to fetch image from InspiroBot');
			}
			const imageUrl = await response.text();
			await interaction.editReply({
				embeds: [
					{
						image: { url: imageUrl },
						color: 0x00ff00,
					},
				],
			});
		} catch (error) {
			console.error(error);
			await interaction.editReply({
				content: 'Sorry, I could not fetch an inspirational image at the moment.',
			});
		}
	},
};

export default inspireCommand;
