import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';
import { logger } from './utils/logger';

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
			const commandData = command.data.toJSON();
			
			// Add dev prefix to command names if not in production
			if (process.env.NODE_ENV !== 'production') {
				commandData.name = `dev_${commandData.name}`;
			}
			
			commands.push(commandData);
		} else {
			logger.log(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
			);
		}
	}
}

const rest = new REST().setToken(process.env.TOKEN || '');

(async () => {
	try {
		logger.log(
			`Started refreshing ${commands.length} application (/) commands.`
		);
		const data: any = await rest.put(
			Routes.applicationCommands(process.env.CLIENT_ID || ''),
			{ body: commands }
		);
		logger.log(
			`Successfully reloaded ${data.length} application (/) commands.`
		);
	} catch (error) {
		logger.error(error);
	}
})();
