import fs from "node:fs";
import path from "node:path";
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Partials,
} from "discord.js";
import dotenv from "dotenv";
dotenv.config();
const token = process.env.TOKEN;
import { connectToDatabase } from "./utils/db";
import { CronJobService } from "./services/cronjobs";
import { MerchantBotClient } from "./types/client";
import logger from "./utils/logger";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageTyping,
  ],
  partials: [Partials.Channel, Partials.Message], // Required to receive DMs
}) as MerchantBotClient;

client.once(Events.ClientReady, (readyClient) => {
  logger.info(`Ready! Logged in as ${readyClient.user.tag}`);

  // Initialize and start cron jobs
  const cronJobService = new CronJobService(client);
  client.cronService = cronJobService;
  cronJobService.start();
});

client.on(Events.Debug, (info) => logger.debug(info));
client.on(Events.Warn, (info) => logger.warn(info));
client.on(Events.Error, (error) => logger.error(error));

loadCommandsAndHandle();

(async () => {
  await connectToDatabase();
  client.login(token);
})();

function loadCommandsAndHandle() {
  client.commands = new Collection();
  const foldersPath = path.join(__dirname, "commands");
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath).default || require(filePath);
      if ("data" in command && "execute" in command) {
        let commandName = command.data.name;

        // Add dev prefix to command names if not in production
        if (process.env.NODE_ENV !== "production") {
          commandName = `dev_${commandName}`;
        }

        client.commands.set(commandName, command);
      } else {
        logger.info(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    }
  }

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      logger.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing ${interaction.commandName}: ${error}`);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  });
}
