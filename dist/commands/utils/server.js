"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const v10_1 = require("discord-api-types/v10");
const serverCommand = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('server')
        .setDescription('Provides information about the server.')
        .setContexts(v10_1.InteractionContextType.Guild, v10_1.InteractionContextType.BotDM, v10_1.InteractionContextType.PrivateChannel),
    async execute(interaction) {
        await interaction.reply(`This server is ${interaction.guild?.name} and has ${interaction.guild?.memberCount} members.`);
    },
};
exports.default = serverCommand;
