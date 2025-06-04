"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const v10_1 = require("discord-api-types/v10");
const pingCommand = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!')
        .setContexts(v10_1.InteractionContextType.Guild, v10_1.InteractionContextType.BotDM, v10_1.InteractionContextType.PrivateChannel),
    async execute(interaction) {
        await interaction.reply('Pong!');
    },
};
exports.default = pingCommand;
