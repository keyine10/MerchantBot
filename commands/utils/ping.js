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
