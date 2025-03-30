const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('custom-command')
	.setDescription('test custom command')
	.addStringOption((option) =>
		option
			.setName('input')
			.setDescription('example text input')
			.setMaxLength(100)
			.setMinLength(3)
			.setRequired(true)
	)
	.addIntegerOption((option) =>
		option
			.setName('integer')
			.setDescription('example integer input')
			.setMaxValue(100000)
			.setMinValue(300)
			.setRequired(true)
	);
module.exports = {
	data,
	async execute(interaction) {
		const input = interaction.options.getString('input');
		const integer = interaction.options.getInteger('integer');

		await interaction.reply(`Submitted ${input} and ${integer}`);
	},
};
