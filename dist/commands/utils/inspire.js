"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const inspireCommand = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('inspire')
        .setDescription('Fetches an inspirational quote image from InspiroBot')
        .setContexts(discord_js_1.InteractionContextType.Guild, discord_js_1.InteractionContextType.BotDM, discord_js_1.InteractionContextType.PrivateChannel),
    async execute(interaction) {
        await interaction.deferReply({});
        try {
            const response = await fetch('https://inspirobot.me/api?generate=true');
            if (!response.ok) {
                throw new Error('Failed to fetch image from InspiroBot');
            }
            const imageUrl = await response.text();
            await interaction.editReply({
                embeds: [
                    {
                        image: { url: imageUrl },
                        color: 0x00ff00,
                    },
                ],
            });
        }
        catch (error) {
            console.error(error);
            await interaction.editReply({
                content: 'Sorry, I could not fetch an inspirational image at the moment.',
            });
        }
    },
};
exports.default = inspireCommand;
