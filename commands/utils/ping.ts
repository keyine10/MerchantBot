import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { InteractionContextType } from 'discord-api-types/v10';

const pingCommand = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!')
		.setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply('Pong!');
	},
};

export default pingCommand;
