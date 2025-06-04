import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType } from 'discord.js';

const customCommand = {
	data: new SlashCommandBuilder()
		.setName('custom-command')
		.setDescription('test custom command')
		.setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
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
		),
	async execute(interaction: ChatInputCommandInteraction) {
		const input = interaction.options.getString('input', true);
		const integer = interaction.options.getInteger('integer', true);
		await interaction.reply(`Submitted ${input} and ${integer}`);
	},
};

export default customCommand;
