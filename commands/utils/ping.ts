import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ApplicationIntegrationType, InteractionContextType } from 'discord-api-types/v10';

const pingCommand = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!')
		.setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
		.setIntegrationTypes(ApplicationIntegrationType.UserInstall),
		async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply('Pong!');
	},
};

export default pingCommand;
