import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { InteractionContextType } from 'discord-api-types/v10';

const serverCommand = {
	data: new SlashCommandBuilder()
		.setName('server')
		.setDescription('Provides information about the server.')
		.setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply(
			`This server is ${interaction.guild?.name} and has ${interaction.guild?.memberCount} members.`
		);
	},
};

export default serverCommand;
