"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_json_1 = require("./config.json");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const commands = [];
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
            commands.push(command.data.toJSON());
        }
        else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}
const rest = new discord_js_1.REST().setToken(config_json_1.token);
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        const data = await rest.put(discord_js_1.Routes.applicationCommands(config_json_1.clientId), { body: commands });
        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    }
    catch (error) {
        console.error(error);
    }
})();
