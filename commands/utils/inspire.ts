import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction, InteractionContextType, ApplicationIntegrationType } from 'discord.js';

const inspireCommand = {
	data: new SlashCommandBuilder()
		.setName('inspire')
		.setDescription('Fetches an inspirational quote image from InspiroBot')
		.setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
		.setIntegrationTypes(ApplicationIntegrationType.UserInstall),
		async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({});
		try {
			const response = await fetch('https://inspirobot.me/api?generate=true');
			if (!response.ok) {
				throw new Error('Failed to fetch image from InspiroBot');
			}
			const imageUrl = await response.text();
			const imageResponse = await fetch(imageUrl);
			if (!imageResponse.ok) {
				throw new Error('Failed to download image from InspiroBot');
			}
			const buffer = Buffer.from(await imageResponse.arrayBuffer());
			await interaction.editReply({
				files: [{ attachment: buffer, name: 'inspire.jpg' }],
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
