"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const discord_js_1 = require("discord.js");
const config_json_1 = require("./config.json");
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildPresences,
        discord_js_1.GatewayIntentBits.DirectMessages, // Enable DM support
    ],
    partials: [discord_js_1.Partials.Channel], // Required to receive DMs
});
client.once(discord_js_1.Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});
loadCommandsAndHandle();
client.login(config_json_1.token);
function loadCommandsAndHandle() {
    client.commands = new discord_js_1.Collection();
    const foldersPath = node_path_1.default.join(__dirname, 'commands');
    const commandFolders = node_fs_1.default.readdirSync(foldersPath);
    for (const folder of commandFolders) {
        const commandsPath = node_path_1.default.join(foldersPath, folder);
        const commandFiles = node_fs_1.default
            .readdirSync(commandsPath)
            .filter((file) => file.endsWith('.js') || file.endsWith('.ts'));
        for (const file of commandFiles) {
            const filePath = node_path_1.default.join(commandsPath, file);
            const command = require(filePath).default || require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            }
            else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
    client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand())
            return;
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        try {
            await command.execute(interaction);
        }
        catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
            }
            else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
            }
        }
    });
}
