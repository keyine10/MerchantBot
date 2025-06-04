// This file has been archived after TypeScript migration. See the corresponding .ts file for the latest implementation.

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!')
		.setContexts(['Guild', 'BotDM', 'PrivateChannel']),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};
