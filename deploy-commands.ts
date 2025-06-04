import { REST, Routes } from 'discord.js';
import { clientId, token } from './config.json';
import fs from 'node:fs';
import path from 'node:path';

const commands: any[] = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs
		.readdirSync(commandsPath)
		.filter((file) => file.endsWith('.js') || file.endsWith('.ts'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath).default || require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
			);
		}
	}
}

const rest = new REST().setToken(token);

(async () => {
	try {
		console.log(
			`Started refreshing ${commands.length} application (/) commands.`
		);
		const data: any = await rest.put(
			Routes.applicationCommands(clientId),
			{ body: commands }
		);
		console.log(
			`Successfully reloaded ${data.length} application (/) commands.`
		);
	} catch (error) {
		console.error(error);
	}
})();
