"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const customCommand = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('custom-command')
        .setDescription('test custom command')
        .setContexts(discord_js_1.InteractionContextType.Guild, discord_js_1.InteractionContextType.BotDM, discord_js_1.InteractionContextType.PrivateChannel)
        .addStringOption((option) => option
        .setName('input')
        .setDescription('example text input')
        .setMaxLength(100)
        .setMinLength(3)
        .setRequired(true))
        .addIntegerOption((option) => option
        .setName('integer')
        .setDescription('example integer input')
        .setMaxValue(100000)
        .setMinValue(300)
        .setRequired(true)),
    async execute(interaction) {
        const input = interaction.options.getString('input', true);
        const integer = interaction.options.getInteger('integer', true);
        await interaction.reply(`Submitted ${input} and ${integer}`);
    },
};
exports.default = customCommand;
